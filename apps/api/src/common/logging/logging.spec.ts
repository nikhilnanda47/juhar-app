import { EventEmitter } from 'events';
import { logLevelsFor, resolveLogLevel } from '../../config/log-level';
import { AppLogger } from './app-logger';
import { createAccessLogMiddleware } from './access-log.middleware';
import { maskPhone, redact } from './redact';
import { currentRequestId, runWithRequestContext } from './request-context';
import { requestIdMiddleware } from './request-id.middleware';

describe('redact', () => {
  it('masks an Indian mobile number but keeps the last 4 digits', () => {
    expect(redact('login for +919876543210 failed')).toBe('login for +91******3210 failed');
    expect(redact('call 919876543210 now')).toBe('call +91******3210 now');
  });

  it('masks every number in a message', () => {
    expect(redact('+919876543210 and +918123456789')).toBe('+91******3210 and +91******6789');
  });

  it('leaves other numbers alone (order numbers, timestamps, prices)', () => {
    const text = 'order JUH-20261123-0007 total=₹2,500 at 1763877600000 key 17638776000009876543210';
    expect(redact(text)).toBe(text);
  });

  it('masks login tokens', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.abc123_-signature';
    expect(redact(`token ${token} rejected`)).toBe('token [token] rejected');
  });

  it('maskPhone shows only the last 4 digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91******3210');
    expect(maskPhone('9876543210')).toBe('+91******3210');
    expect(maskPhone('12')).toBe('******');
  });
});

describe('LOG_LEVEL', () => {
  it('defaults to "log" when unset or empty', () => {
    expect(resolveLogLevel(undefined)).toBe('log');
    expect(resolveLogLevel('')).toBe('log');
    expect(resolveLogLevel('  WARN ')).toBe('warn');
  });

  it('each level includes the quieter ones', () => {
    expect(logLevelsFor('error')).toEqual(['fatal', 'error']);
    expect(logLevelsFor('warn')).toEqual(['fatal', 'error', 'warn']);
    expect(logLevelsFor('log')).toEqual(['fatal', 'error', 'warn', 'log']);
    expect(logLevelsFor('debug')).toContain('debug');
    expect(logLevelsFor('debug')).not.toContain('verbose');
    expect(logLevelsFor('verbose')).toContain('verbose');
  });

  it('falls back to normal output for an unknown name', () => {
    expect(logLevelsFor('nonsense')).toEqual(logLevelsFor('log'));
  });
});

describe('requestIdMiddleware', () => {
  function run(headers: Record<string, unknown> = {}) {
    const req: any = { headers };
    const sent: Record<string, string> = {};
    const res: any = { setHeader: (k: string, v: string) => { sent[k] = v; } };
    let seenInside: string | undefined;
    requestIdMiddleware(req, res, () => { seenInside = currentRequestId(); });
    return { req, sent, seenInside, outsideAfter: currentRequestId() };
  }

  it('makes a new ID when the caller sends none', () => {
    const { req, sent } = run();
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent['X-Request-Id']).toBe(req.requestId);
  });

  it('keeps a plain ID the caller sent', () => {
    const { req, sent } = run({ 'x-request-id': 'abc-12345_XYZ' });
    expect(req.requestId).toBe('abc-12345_XYZ');
    expect(sent['X-Request-Id']).toBe('abc-12345_XYZ');
  });

  it.each(['short', 'has spaces in it', 'line\nbreak-injected-12345', 'x'.repeat(65), 'sémi;colon;1234567'])(
    'replaces an unsafe or odd ID (%p) so it cannot spoil the logs',
    (bad) => {
      const { req } = run({ 'x-request-id': bad });
      expect(req.requestId).not.toBe(bad);
      expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  it('makes the ID available to everything the request runs, but not afterwards', () => {
    const { req, seenInside, outsideAfter } = run();
    expect(seenInside).toBe(req.requestId);
    expect(outsideAfter).toBeUndefined();
  });
});

describe('createAccessLogMiddleware', () => {
  function makeLogger() {
    const lines: { level: string; message: string; id?: string }[] = [];
    const rec = (level: string) => (message: string) => lines.push({ level, message, id: currentRequestId() });
    return { lines, logger: { log: rec('log'), warn: rec('warn'), error: rec('error'), debug: rec('debug') } as any };
  }

  function respond(opts: { method?: string; url?: string; status: number; user?: string; locals?: Record<string, unknown> }) {
    const { lines, logger } = makeLogger();
    const req: any = { method: opts.method ?? 'GET', originalUrl: opts.url ?? '/api/v1/cart', requestId: 'req-12345678', user: opts.user ? { id: opts.user } : undefined };
    const res: any = new EventEmitter();
    res.statusCode = opts.status;
    res.locals = opts.locals ?? {};
    createAccessLogMiddleware(logger)(req, res, () => {});
    res.emit('finish');
    return lines;
  }

  it('writes one normal line for a success: method, path, status, time and user', () => {
    const [line, ...rest] = respond({ status: 200, user: 'user-1' });
    expect(rest).toHaveLength(0);
    expect(line.level).toBe('log');
    expect(line.message).toMatch(/^GET \/api\/v1\/cart 200 \d+ms user=user-1$/);
  });

  it('says anon when nobody is logged in', () => {
    expect(respond({ status: 200 })[0].message).toContain('user=anon');
  });

  it('logs a client error (4xx) as a warning with its code and message', () => {
    const [line] = respond({ status: 401, locals: { errorCode: 'AUTH_003', errorMessage: 'Invalid OTP. Please try again.' } });
    expect(line.level).toBe('warn');
    expect(line.message).toContain('401');
    expect(line.message).toContain('code=AUTH_003');
    expect(line.message).toContain('"Invalid OTP. Please try again."');
  });

  it('logs a server error (5xx) as an error', () => {
    expect(respond({ status: 500, locals: { errorCode: 'INTERNAL_ERROR' } })[0].level).toBe('error');
    expect(respond({ status: 503 })[0].level).toBe('error');
  });

  it.each([301, 304])('treats %i as normal output', (status) => {
    expect(respond({ status })[0].level).toBe('log');
  });

  it('never logs the query string (it can hold phone numbers or search words)', () => {
    const [line] = respond({ url: '/api/v1/admin/orders?search=%2B919876543210&status=placed', status: 200 });
    expect(line.message).toContain('GET /api/v1/admin/orders 200');
    expect(line.message).not.toContain('search');
    expect(line.message).not.toContain('9876543210');
  });

  it('only logs the health check and browser preflight requests in debug mode', () => {
    expect(respond({ url: '/health', status: 200 })[0].level).toBe('debug');
    expect(respond({ method: 'OPTIONS', url: '/api/v1/orders', status: 204 })[0].level).toBe('debug');
  });

  it('cuts a very long message', () => {
    const [line] = respond({ status: 400, locals: { errorMessage: 'x'.repeat(500) } });
    expect(line.message.length).toBeLessThan(200);
  });

  it('writes the line inside the request context so it carries the request ID', () => {
    expect(respond({ status: 200 })[0].id).toBe('req-12345678');
  });
});

describe('AppLogger', () => {
  let out: string[];
  let spy: jest.SpyInstance;
  const logger = () => new AppLogger('Test', { plain: true, logLevels: ['fatal', 'error', 'warn', 'log', 'debug'] });

  beforeEach(() => {
    out = [];
    spy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => { out.push(String(chunk)); return true; });
    jest.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => { out.push(String(chunk)); return true; });
  });
  afterEach(() => jest.restoreAllMocks());

  it('starts a line with req=<id> while handling a request', () => {
    runWithRequestContext({ requestId: 'req-abc12345' }, () => logger().log('order placed'));
    expect(out.join('')).toContain('req=req-abc12345 order placed');
  });

  it('adds nothing outside a request (startup, scheduled jobs)', () => {
    logger().log('Database connected');
    expect(out.join('')).toContain('Database connected');
    expect(out.join('')).not.toContain('req=');
  });

  it('masks phone numbers and tokens in the message and in the extra parts', () => {
    const l = logger();
    l.warn('failed for +919876543210');
    l.error('boom', 'stack with +918123456789 and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.sig12345');
    const text = out.join('');
    expect(text).toContain('+91******3210');
    expect(text).toContain('+91******6789');
    expect(text).not.toContain('9876543210');
    expect(text).not.toContain('eyJhbGci');
  });

  it('respects the chosen levels', () => {
    const quiet = new AppLogger('Test', { plain: true, logLevels: logLevelsFor('warn') });
    quiet.log('normal'); quiet.debug('detail'); quiet.warn('careful'); quiet.error('broken');
    const text = out.join('');
    expect(text).not.toContain('normal');
    expect(text).not.toContain('detail');
    expect(text).toContain('careful');
    expect(text).toContain('broken');
  });

  it('plain mode leaves out colour codes; the default keeps them', () => {
    new AppLogger('Test', { plain: true }).log('hello');
    expect(out.join('')).not.toContain('\u001b[');
    out.length = 0;
    new AppLogger('Test', {}).log('hello');
    expect(out.join('')).toContain('\u001b[');
  });

  it('keeps objects as they are', () => {
    expect(() => logger().log({ any: 'thing' })).not.toThrow();
  });
});
