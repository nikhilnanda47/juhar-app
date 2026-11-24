// Tests for the mobile API client's automatic token refresh.
// AsyncStorage is replaced by an in-memory fake.
export {}; // keeps this file a module so its helpers do not clash with Jest globals
const BASE = 'http://localhost:3000';

let mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore[k] ?? null,
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    removeItem: async (k: string) => { delete mockStore[k]; },
  },
}));

const ok = (data: unknown) => ({ status: 200, json: async () => ({ success: true, data }) });
const fail = (status: number, message = 'Unauthorized') => ({
  status,
  json: async () => ({ success: false, error: { code: `HTTP_${status}`, message } }),
});

type Handler = (path: string, auth: string | undefined, body: any) => unknown;
let calls: { path: string; auth?: string; body?: any }[] = [];

function serve(handler: Handler) {
  (global as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const path = String(url).replace(BASE, '');
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, auth, body });
    return handler(path, auth, body);
  });
}

const refreshCalls = () => calls.filter((c) => c.path === '/api/v1/auth/refresh');

// The client keeps its token in module state, so load a fresh copy for every test.
async function signedIn(access = 'OLD', refresh: string | null = 'REFRESH') {
  jest.resetModules();
  const api = require('./api') as typeof import('./api');
  if (refresh) await api.saveTokens(access, refresh);
  else {
    await api.saveTokens(access, 'unused');
    delete mockStore['juhar_refresh'];
  }
  return api;
}

beforeEach(() => {
  calls = [];
  mockStore = {};
});

describe('mobile API client', () => {
  it('sends the access token with every request', async () => {
    serve(() => ok({ id: 'u1' }));
    await (await signedIn('TOKEN-A')).getProfile();
    expect(calls[0].auth).toBe('Bearer TOKEN-A');
  });

  describe('when the access token has expired (401)', () => {
    it('renews it with the stored refresh token and repeats the call', async () => {
      serve((path, auth) => {
        if (path === '/api/v1/auth/refresh') return ok({ accessToken: 'NEW' });
        return auth === 'Bearer NEW' ? ok({ id: 'u1' }) : fail(401);
      });
      const api = await signedIn('OLD', 'REFRESH-1');

      await expect(api.getProfile()).resolves.toEqual({ id: 'u1' });

      expect(calls.map((c) => c.path)).toEqual(['/api/v1/me', '/api/v1/auth/refresh', '/api/v1/me']);
      expect(refreshCalls()[0].body).toEqual({ refreshToken: 'REFRESH-1' });
      expect(refreshCalls()[0].auth).toBeUndefined();
      expect(calls[2].auth).toBe('Bearer NEW');
    });

    it('saves the new access token and keeps using it without refreshing again', async () => {
      serve((path, auth) => {
        if (path === '/api/v1/auth/refresh') return ok({ accessToken: 'NEW' });
        return auth === 'Bearer NEW' ? ok({ ok: true }) : fail(401);
      });
      const api = await signedIn();

      await api.getProfile();
      await api.getProfile();

      expect(mockStore['juhar_token']).toBe('NEW');
      expect(mockStore['juhar_refresh']).toBe('REFRESH');
      expect(refreshCalls()).toHaveLength(1);
    });

    it('shares one refresh between calls that fail at the same time', async () => {
      serve((path, auth) => {
        if (path === '/api/v1/auth/refresh') return ok({ accessToken: 'NEW' });
        return auth === 'Bearer NEW' ? ok({ ok: true }) : fail(401);
      });
      const api = await signedIn();

      await Promise.all([api.getProfile(), api.getAddresses(), api.getCart()]);

      expect(refreshCalls()).toHaveLength(1);
    });

    it('repeats a placed order with the same idempotency key', async () => {
      serve((path, auth) => {
        if (path === '/api/v1/auth/refresh') return ok({ accessToken: 'NEW' });
        return auth === 'Bearer NEW' ? ok({ id: 'order-1' }) : fail(401);
      });
      const api = await signedIn();

      await api.placeOrder({ addressId: 'a1', paymentMode: 'cod', idempotencyKey: 'KEY-1' });

      const orderCalls = calls.filter((c) => c.path === '/api/v1/orders');
      expect(orderCalls).toHaveLength(2);
      expect(orderCalls[1].body).toEqual(orderCalls[0].body);
      expect(orderCalls[1].body.idempotencyKey).toBe('KEY-1');
    });

    it('only retries once: a second 401 is reported, not looped', async () => {
      serve((path) => (path === '/api/v1/auth/refresh' ? ok({ accessToken: 'NEW' }) : fail(401)));
      const api = await signedIn();

      await expect(api.getProfile()).rejects.toThrow('Unauthorized');

      expect(refreshCalls()).toHaveLength(1);
      expect(calls.filter((c) => c.path === '/api/v1/me')).toHaveLength(2);
    });

    it('signs the customer out when the refresh token is rejected', async () => {
      serve((path) => fail(401, path === '/api/v1/auth/refresh' ? 'Invalid or expired refresh token' : 'Unauthorized'));
      const api = await signedIn();

      await expect(api.getProfile()).rejects.toThrow('Unauthorized');

      expect(mockStore['juhar_token']).toBeUndefined();
      expect(mockStore['juhar_refresh']).toBeUndefined();
      expect(api.isLoggedIn()).toBe(false);
      expect(refreshCalls()).toHaveLength(1);
    });

    it('keeps the login when the refresh fails because of the network', async () => {
      serve((path) => {
        if (path === '/api/v1/auth/refresh') throw new TypeError('Network request failed');
        return fail(401);
      });
      const api = await signedIn();

      await expect(api.getProfile()).rejects.toThrow('Unauthorized');

      expect(mockStore['juhar_token']).toBe('OLD');
      expect(mockStore['juhar_refresh']).toBe('REFRESH');
      expect(api.isLoggedIn()).toBe(true);
    });

    it('keeps the login when the server has a temporary problem during refresh', async () => {
      serve((path) => (path === '/api/v1/auth/refresh' ? fail(503, 'Service unavailable') : fail(401)));
      const api = await signedIn();

      await expect(api.getProfile()).rejects.toThrow('Unauthorized');

      expect(mockStore['juhar_token']).toBe('OLD');
      expect(mockStore['juhar_refresh']).toBe('REFRESH');
    });

    it('does not call the server to refresh when no refresh token is stored', async () => {
      serve(() => fail(401));
      const api = await signedIn('OLD', null);

      await expect(api.getProfile()).rejects.toThrow('Unauthorized');

      expect(refreshCalls()).toHaveLength(0);
    });
  });

  describe('calls that must not trigger a refresh', () => {
    it.each([400, 403, 404, 409, 500])('does not refresh on a %i error', async (status) => {
      serve(() => fail(status, 'Nope'));
      await expect((await signedIn()).getProfile()).rejects.toThrow('Nope');
      expect(refreshCalls()).toHaveLength(0);
    });

    it('does not refresh when a wrong OTP is rejected with 401', async () => {
      serve(() => fail(401, 'Invalid OTP'));
      await expect((await signedIn()).verifyOtp('+919999999999', '000000')).rejects.toThrow('Invalid OTP');
      expect(refreshCalls()).toHaveLength(0);
    });

    it('does not refresh when requesting an OTP', async () => {
      serve(() => fail(401, 'Nope'));
      await expect((await signedIn()).requestOtp('+919999999999')).rejects.toThrow('Nope');
      expect(refreshCalls()).toHaveLength(0);
    });
  });

  it('stores both tokens after signing in', async () => {
    serve(() => ok({ accessToken: 'A1', refreshToken: 'R1', isNewUser: false }));
    const api = await signedIn('', null);

    await api.verifyOtp('+919999999999', '123456');

    expect(mockStore['juhar_token']).toBe('A1');
    expect(mockStore['juhar_refresh']).toBe('R1');
  });
});
