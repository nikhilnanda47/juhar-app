// A real Nest app wired like main.ts: request ID, access log, error filter, reply wrapper.
import {
  Body, CanActivate, Controller, ExecutionContext, Get, HttpException, Injectable, Logger, Param, Post,
  UseGuards, ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { logLevelsFor } from '../../config/log-level';
import { AppLogger } from './app-logger';
import { createAccessLogMiddleware } from './access-log.middleware';
import { requestIdMiddleware } from './request-id.middleware';

class EchoDto {
  @IsString()
  name!: string;
}

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest().user = { id: 'user-123' };
    return true;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Controller('api/v1/test')
class TestController {
  private readonly logger = new Logger('Slow');

  @Get('ok') ok() { return { hello: 'world' }; }
  @Get('boom') boom() { throw new Error('kaboom while handling +919876543210'); }
  @Get('teapot') teapot() { throw new HttpException({ code: 'TEAPOT', message: 'I am a teapot' }, 418); }
  @Post('echo') echo(@Body() dto: EchoDto) { return dto; }
  @UseGuards(FakeAuthGuard) @Get('me') me() { return { me: true }; }

  @Get('slow/:n')
  async slow(@Param('n') n: string) {
    await sleep(Math.floor(Math.random() * 40));
    this.logger.log(`slow finished n=${n}`);
    await sleep(Math.floor(Math.random() * 40));
    return { n };
  }
}

@Controller('health')
class HealthLike { @Get() check() { return { status: 'ok' }; } }

let app: NestExpressApplication;
let base: string;
let out: string[];

async function start(level = 'log') {
  out = [];
  jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => { out.push(String(chunk)); return true; });
  jest.spyOn(process.stderr, 'write').mockImplementation((chunk: any) => { out.push(String(chunk)); return true; });
  const moduleRef = await Test.createTestingModule({ controllers: [TestController, HealthLike], providers: [FakeAuthGuard] }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useLogger(new AppLogger('', { plain: true, logLevels: logLevelsFor(level) }));
  app.use(requestIdMiddleware);
  app.use(createAccessLogMiddleware());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors({ origin: ['http://localhost:3001'], credentials: true, exposedHeaders: ['X-Request-Id'] });
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  out.length = 0; // forget the startup lines
}

afterEach(async () => {
  await app?.close();
  jest.restoreAllMocks();
});

const logText = () => out.join('');
const lines = () => logText().split('\n').filter(Boolean);
const httpLine = (needle: string) => lines().find((l) => l.includes('[HTTP]') && l.includes(needle));

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(base + path, init);
  const json = (await res.json()) as any;
  await sleep(40); // the access log line is written just after the reply has been sent
  return { status: res.status, header: res.headers.get('x-request-id')!, json, res };
}

describe('request ID and logging, end to end', () => {
  it('a success: the same ID is in the response header, the reply body and the log line', async () => {
    await start();
    const { status, header, json } = await call('/api/v1/test/ok');
    expect(status).toBe(200);
    expect(header).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.requestId).toBe(header);
    expect(httpLine(`req=${header} GET /api/v1/test/ok 200`)).toMatch(/ LOG \[HTTP\] .* user=anon$/);
  });

  it('an ID the caller sends is used everywhere', async () => {
    await start();
    const { header, json } = await call('/api/v1/test/ok', { headers: { 'x-request-id': 'from-the-app-12345' } });
    expect(header).toBe('from-the-app-12345');
    expect(json.requestId).toBe('from-the-app-12345');
    expect(httpLine('req=from-the-app-12345 GET /api/v1/test/ok 200')).toBeDefined();
  });

  it('an unsafe ID from the caller is replaced', async () => {
    await start();
    const { header } = await call('/api/v1/test/ok', { headers: { 'x-request-id': 'bad id with spaces' } });
    expect(header).toMatch(/^[0-9a-f-]{36}$/);
    expect(logText()).not.toContain('bad id with spaces');
  });

  it('the browser apps are allowed to read the ID header', async () => {
    await start();
    const res = await fetch(base + '/api/v1/test/ok', { headers: { origin: 'http://localhost:3001' } });
    expect(res.headers.get('access-control-expose-headers')).toContain('X-Request-Id');
  });

  it('a validation error (400): same ID, a warning with the code, and no stack trace', async () => {
    await start();
    const { status, header, json } = await call('/api/v1/test/echo', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
    });
    expect(status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.requestId).toBe(header);
    expect(httpLine(`req=${header} POST /api/v1/test/echo 400`)).toMatch(/ WARN \[HTTP\] .*code=VALIDATION_ERROR/);
    expect(logText()).not.toMatch(/\n\s+at /); // no stack trace for a client mistake
  });

  it('a custom client error (418) is a warning with its own code', async () => {
    await start();
    const { header, json } = await call('/api/v1/test/teapot');
    expect(json.error.code).toBe('TEAPOT');
    expect(httpLine(`req=${header} GET /api/v1/test/teapot 418`)).toMatch(/ WARN .*code=TEAPOT "I am a teapot"/);
  });

  it('an unknown route (404): same ID in the reply and a warning in the log', async () => {
    await start();
    const { status, header, json } = await call('/api/v1/nothing-here');
    expect(status).toBe(404);
    expect(json.requestId).toBe(header);
    expect(httpLine(`req=${header} GET /api/v1/nothing-here 404`)).toMatch(/ WARN /);
  });

  it('a crash (500): details and stack go to the log with the same ID; the client gets nothing internal', async () => {
    await start();
    const { status, header, json } = await call('/api/v1/test/boom');
    expect(status).toBe(500);
    expect(json.error).toEqual({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    expect(json.requestId).toBe(header);
    expect(JSON.stringify(json)).not.toContain('kaboom');
    const errorLine = lines().find((l) => l.includes('HttpExceptionFilter') && l.includes('failed with 500'));
    expect(errorLine).toContain(`req=${header}`);
    expect(errorLine).toContain('kaboom while handling +91******3210'); // the phone number is masked
    expect(logText()).toMatch(/\n\s+at /); // the stack is there
    expect(httpLine(`req=${header} GET /api/v1/test/boom 500`)).toMatch(/ ERROR \[HTTP\]/);
    expect(logText()).not.toContain('9876543210');
  });

  it('shows who made the request when they are logged in', async () => {
    await start();
    const { header } = await call('/api/v1/test/me');
    expect(httpLine(`req=${header} GET /api/v1/test/me 200`)).toMatch(/user=user-123$/);
  });

  it('never logs query strings, request bodies or the Authorization header', async () => {
    await start();
    await call('/api/v1/test/ok?search=%2B919876543210&token=topsecretquery');
    await call('/api/v1/test/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.abcdef123' },
      body: JSON.stringify({ name: 'customer-secret-name', password: 'hunter2' }),
    });
    const text = logText();
    for (const secret of ['topsecretquery', '9876543210', 'customer-secret-name', 'hunter2', 'eyJhbGci', 'Bearer']) {
      expect(text).not.toContain(secret);
    }
  });

  it('log lines written deep inside a request carry that request\'s ID, even with many at once', async () => {
    await start();
    const ids = Array.from({ length: 25 }, (_, n) => `concurrent-id-${String(n).padStart(3, '0')}`);
    const replies = await Promise.all(ids.map((id, n) => call(`/api/v1/test/slow/${n}`, { headers: { 'x-request-id': id } })));
    replies.forEach((r, n) => { expect(r.header).toBe(ids[n]); expect(r.json.data.n).toBe(String(n)); });
    ids.forEach((id, n) => {
      expect(lines().some((l) => l.includes('[Slow]') && l.includes(`req=${id} slow finished n=${n}`))).toBe(true);
      expect(httpLine(`req=${id} GET /api/v1/test/slow/${n} 200`)).toBeDefined();
    });
  });

  describe('LOG_LEVEL', () => {
    it('the health check is only logged in debug mode', async () => {
      await start('log');
      await call('/health');
      expect(httpLine('GET /health')).toBeUndefined();
      await app.close();
      await start('debug');
      await call('/health');
      expect(httpLine('GET /health 200')).toBeDefined();
    });

    it('"warn" shows warnings and errors but not normal requests', async () => {
      await start('warn');
      await call('/api/v1/test/ok');
      await call('/api/v1/test/teapot');
      await call('/api/v1/test/boom');
      expect(httpLine('GET /api/v1/test/ok')).toBeUndefined();
      expect(httpLine('GET /api/v1/test/teapot 418')).toBeDefined();
      expect(httpLine('GET /api/v1/test/boom 500')).toBeDefined();
    });

    it('"error" shows only failures', async () => {
      await start('error');
      await call('/api/v1/test/teapot');
      await call('/api/v1/test/boom');
      expect(httpLine('GET /api/v1/test/teapot')).toBeUndefined();
      expect(httpLine('GET /api/v1/test/boom 500')).toBeDefined();
    });
  });
});
