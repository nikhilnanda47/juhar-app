import { ApiClient, ApiError } from './api';

const BASE = 'http://localhost:3000';
const ok = (data: unknown) => ({ status: 200, json: async () => ({ success: true, data }) });
const fail = (status: number) => ({
  status,
  json: async () => ({ success: false, error: { code: `HTTP_${status}`, message: 'Unauthorized' } }),
});

type Handler = (path: string, auth: string | undefined, body: any) => unknown;
let calls: { path: string; auth?: string }[] = [];
let store: Record<string, string> = {};

function serve(handler: Handler) {
  (global as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const path = String(url).replace(BASE, '');
    const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
    calls.push({ path, auth });
    return handler(path, auth, init.body ? JSON.parse(String(init.body)) : undefined);
  });
}

const refreshCalls = () => calls.filter((c) => c.path === '/api/v1/auth/refresh').length;

function signedIn(access = 'OLD', refresh: string | null = 'REFRESH') {
  const client = new ApiClient();
  client.setToken(access);
  if (refresh) store['juhar_admin_refresh'] = refresh;
  return client;
}

beforeEach(() => {
  calls = [];
  store = {};
  (global as any).window = {};
  (global as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('admin API client', () => {
  it('sends the access token with every request', async () => {
    serve(() => ok({ id: 'a' }));
    await signedIn('TOKEN-A').getMe();
    expect(calls[0].auth).toBe('Bearer TOKEN-A');
  });

  describe('when the access token has expired (401)', () => {
    const expiredThenFine: Handler = (path, auth) => {
      if (path === '/api/v1/auth/refresh') return ok({ accessToken: 'NEW' });
      return auth === 'Bearer NEW' ? ok({ id: 'admin-1' }) : fail(401);
    };

    it('gets a new access token and repeats the request', async () => {
      serve(expiredThenFine);
      await expect(signedIn().getMe()).resolves.toEqual({ id: 'admin-1' });
      expect(calls.map((c) => c.path)).toEqual(['/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/auth/me']);
      expect(calls[2].auth).toBe('Bearer NEW');
    });

    it('sends the stored refresh token and saves the new access token', async () => {
      let sentBody: unknown;
      serve((path, auth, body) => {
        if (path === '/api/v1/auth/refresh') { sentBody = body; return ok({ accessToken: 'NEW' }); }
        return auth === 'Bearer NEW' ? ok({}) : fail(401);
      });
      await signedIn('OLD', 'MY-REFRESH').getMe();
      expect(sentBody).toEqual({ refreshToken: 'MY-REFRESH' });
      expect(store['juhar_admin_token']).toBe('NEW');
    });

    it('retries only once, so a persistent 401 cannot loop', async () => {
      serve((path) => (path === '/api/v1/auth/refresh' ? ok({ accessToken: 'NEW' }) : fail(401)));
      await expect(signedIn().getMe()).rejects.toMatchObject({ status: 401 });
      expect(calls.map((c) => c.path)).toEqual(['/api/v1/auth/me', '/api/v1/auth/refresh', '/api/v1/auth/me']);
    });

    it('lets calls that fail together share a single refresh', async () => {
      serve(expiredThenFine);
      const client = signedIn();
      await Promise.all([client.getMe(), client.getCategories(), client.getOrders()]);
      expect(refreshCalls()).toBe(1);
    });

    it('can refresh again on a later expiry', async () => {
      let issued = 0;
      serve((path, auth) => {
        if (path === '/api/v1/auth/refresh') return ok({ accessToken: `NEW-${++issued}` });
        return auth === `Bearer NEW-${issued}` && issued > 0 ? ok({}) : fail(401);
      });
      const client = signedIn();
      await client.getMe();
      client.setToken('EXPIRED-AGAIN');
      await client.getMe();
      expect(refreshCalls()).toBe(2);
    });

    it('ends the session when the server rejects the refresh token', async () => {
      serve((path) => (path === '/api/v1/auth/refresh' ? fail(401) : fail(401)));
      const client = signedIn();
      await expect(client.getMe()).rejects.toBeInstanceOf(ApiError);
      expect(store['juhar_admin_token']).toBeUndefined();
      expect(store['juhar_admin_refresh']).toBeUndefined();
      expect(client.getToken()).toBeNull();
    });

    it('keeps the session when the refresh fails only because the network is down', async () => {
      serve((path) => {
        if (path === '/api/v1/auth/refresh') throw new TypeError('Failed to fetch');
        return fail(401);
      });
      const client = signedIn();
      await expect(client.getMe()).rejects.toMatchObject({ status: 401 });
      expect(store['juhar_admin_refresh']).toBe('REFRESH');
      expect(store['juhar_admin_token']).toBe('OLD');
    });

    it('does not try to refresh when there is no refresh token', async () => {
      serve(() => fail(401));
      await expect(signedIn('OLD', null).getMe()).rejects.toMatchObject({ status: 401 });
      expect(refreshCalls()).toBe(0);
      expect(calls).toHaveLength(1);
    });
  });

  describe('calls that must not trigger a refresh', () => {
    it('a wrong OTP at sign-in is just an error', async () => {
      serve(() => fail(401));
      await expect(signedIn().verifyOtp('+919876543210', '000000')).rejects.toMatchObject({ status: 401 });
      expect(calls.map((c) => c.path)).toEqual(['/api/v1/auth/otp/verify']);
      expect(store['juhar_admin_refresh']).toBe('REFRESH');
    });

    it('requesting an OTP is never retried', async () => {
      serve(() => fail(401));
      await expect(new ApiClient().requestOtp('+919876543210')).rejects.toMatchObject({ status: 401 });
      expect(calls).toHaveLength(1);
    });

    it.each([400, 403, 404, 500])('a %i error is passed through without a refresh', async (status) => {
      serve(() => fail(status));
      await expect(signedIn().getMe()).rejects.toMatchObject({ status });
      expect(refreshCalls()).toBe(0);
    });
  });
});
