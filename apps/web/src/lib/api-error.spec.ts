export {}; // keeps this file a module

function load(response: { status: number; body: unknown; headers?: Record<string, string> } | 'network-down') {
  jest.resetModules();
  (global as any).window = {};
  (global as any).localStorage = { getItem: () => 'TOKEN', setItem: () => undefined, removeItem: () => undefined };
  (global as any).fetch = jest.fn(async () => {
    if (response === 'network-down') throw new TypeError('Failed to fetch');
    const headers = response.headers ?? {};
    return {
      status: response.status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: async () => response.body,
    };
  });
  return require('./api') as typeof import('./api');
}

const failure = (extra: Record<string, unknown> = {}) => ({
  success: false,
  error: { code: 'CHK_001', message: 'Cart is empty' },
  ...extra,
});

async function catchError(fn: () => Promise<unknown>): Promise<any> {
  try { await fn(); } catch (e) { return e; }
  throw new Error('expected the call to fail');
}

describe('API errors carry the request reference', () => {
  it('keeps the reference the API sent in the reply', async () => {
    const api = load({ status: 400, body: failure({ requestId: 'req-from-body-123' }) });
    const e = await catchError(() => api.getCart());
    expect(e).toBeInstanceOf(api.ApiError);
    expect(e.requestId).toBe('req-from-body-123');
    expect(api.referenceOf(e)).toBe('req-from-body-123');
  });

  it('falls back to the X-Request-Id header when the reply has none', async () => {
    const api = load({ status: 500, body: failure(), headers: { 'x-request-id': 'req-from-header-456' } });
    expect(api.referenceOf(await catchError(() => api.getCart()))).toBe('req-from-header-456');
  });

  it('has an empty reference when the API sent none', async () => {
    const api = load({ status: 400, body: failure() });
    expect(api.referenceOf(await catchError(() => api.getCart()))).toBe('');
  });

  it('the message and details are exactly what screens showed before', async () => {
    const api = load({
      status: 400,
      body: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['phone: bad', 'pin: bad'] }, requestId: 'r' },
    });
    const e = await catchError(() => api.getCart());
    expect(e.message).toBe('Validation failed: phone: bad; pin: bad');
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.status).toBe(400);
  });

  it('is still an ordinary Error with the same message (older code that only reads e.message keeps working)', async () => {
    const api = load({ status: 400, body: failure({ requestId: 'r' }) });
    const e = await catchError(() => api.getCart());
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Cart is empty');
  });

  it('has no reference for a network failure or for something that is not an API error', async () => {
    const api = load('network-down');
    const e = await catchError(() => api.getCart());
    expect(api.referenceOf(e)).toBe('');
    expect(api.referenceOf(new Error('x'))).toBe('');
    expect(api.referenceOf(undefined)).toBe('');
    expect(api.referenceOf('text')).toBe('');
  });
});
