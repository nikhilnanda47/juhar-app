// Rate limiting, tested through a real Nest app with the real ThrottlingModule,
// the real AuthController routes and the API's normal error filter.
import { Controller, Get, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HealthController } from '../../health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthController } from '../../modules/auth/auth.controller';
import { AuthService } from '../../modules/auth/auth.service';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { THROTTLE_LIMITS } from './throttler.config';
import { ThrottlingModule } from './throttling.module';

const SECRET = 'throttle-test-secret';
const PHONE_A = '+919876543210';
const PHONE_B = '+919876543211';

@Controller('api/v1/ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

const fakeAuth = {
  requestOtp: async () => ({ message: 'OTP sent successfully', expiresInSeconds: 300 }),
  verifyOtp: async () => {
    throw new UnauthorizedException({ code: 'AUTH_003', message: 'Invalid OTP. Please try again.' });
  },
};

let app: NestExpressApplication;
let base: string;

async function start(trustProxy?: number) {
  process.env.JWT_SECRET = SECRET;
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), ThrottlingModule],
    controllers: [AuthController, HealthController, PingController],
    providers: [
      { provide: AuthService, useValue: fakeAuth },
      { provide: PrismaService, useValue: { $queryRaw: async () => 1 } },
    ],
  }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useLogger(false); // the error filter logs every 4xx; keep test output readable
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
}

afterEach(async () => {
  await app?.close();
});

type Opts = { headers?: Record<string, string>; body?: unknown };
async function post(path: string, { headers = {}, body }: Opts = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: (await res.json()) as any };
}
async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers });
  return { status: res.status, json: (await res.json()) as any };
}

const requestOtp = (phone: string, headers?: Record<string, string>) =>
  post('/api/v1/auth/otp/request', { body: { phone }, headers });
const verifyOtp = (phone: string, headers?: Record<string, string>) =>
  post('/api/v1/auth/otp/verify', { body: { phone, otp: '000000' }, headers });
const tokenFor = (sub: string) => ({ authorization: `Bearer ${new JwtService({ secret: SECRET }).sign({ sub })}` });
const statuses = async (n: number, fn: (i: number) => Promise<{ status: number }>) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await fn(i)).status);
  return out;
};
const phoneN = (i: number) => `+9198765${String(10000 + i)}`;

describe('rate limiting', () => {
  describe('OTP requests', () => {
    it('allows 3 per phone number, then answers 429 with a clear message', async () => {
      await start();
      const first = await statuses(THROTTLE_LIMITS.otpRequestPerPhone, () => requestOtp(PHONE_A));
      expect(first).toEqual([200, 200, 200]);

      const blocked = await requestOtp(PHONE_A);
      expect(blocked.status).toBe(429);
      expect(blocked.json.success).toBe(false);
      expect(blocked.json.error.code).toBe('RATE_LIMITED');
      expect(blocked.json.error.message).toMatch(/too many attempts/i);
    });

    it('tells the caller how long to wait with a standard Retry-After header', async () => {
      await start();
      await statuses(3, () => requestOtp(PHONE_A));
      const res = await fetch(base + '/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: PHONE_A }),
      });
      expect(res.status).toBe(429);
      const seconds = Number(res.headers.get('retry-after'));
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(600);
    });

    it('does not block a different phone number from the same IP', async () => {
      await start();
      await statuses(4, () => requestOtp(PHONE_A));
      expect((await requestOtp(PHONE_B)).status).toBe(200);
    });

    it('still counts the same phone number when the IP address changes', async () => {
      await start(1); // trust one proxy, so X-Forwarded-For is believed
      const results = await statuses(4, (i) => requestOtp(PHONE_A, { 'x-forwarded-for': `10.0.0.${i + 1}` }));
      expect(results).toEqual([200, 200, 200, 429]);
    });

    it('limits one IP to 10 requests even when every phone number is different', async () => {
      await start();
      const results = await statuses(THROTTLE_LIMITS.otpRequestPerIp + 1, (i) => requestOtp(phoneN(i)));
      expect(results.slice(0, 10).every((s) => s === 200)).toBe(true);
      expect(results[10]).toBe(429);
    });

    it('counts requests that fail validation too', async () => {
      await start();
      const results = await statuses(4, () => post('/api/v1/auth/otp/request', { body: { phone: 'abc' } }));
      expect(results).toEqual([400, 400, 400, 429]);
    });
  });

  describe('OTP verification', () => {
    it('allows 5 attempts per phone number, then answers 429 instead of checking the code', async () => {
      await start();
      const results = await statuses(THROTTLE_LIMITS.otpVerifyPerPhone + 1, () => verifyOtp(PHONE_A));
      expect(results).toEqual([401, 401, 401, 401, 401, 429]);
    });

    it('does not block a different phone number', async () => {
      await start();
      await statuses(6, () => verifyOtp(PHONE_A));
      expect((await verifyOtp(PHONE_B)).status).toBe(401);
    });

    it('keeps the request limit and the verify limit separate', async () => {
      await start();
      await statuses(4, () => requestOtp(PHONE_A)); // request limit used up (4th is 429)
      expect((await verifyOtp(PHONE_A)).status).toBe(401); // verify still works
    });

    it('limits one IP to 20 attempts across different phone numbers', async () => {
      await start();
      const results = await statuses(THROTTLE_LIMITS.otpVerifyPerIp + 1, (i) => verifyOtp(phoneN(i)));
      expect(results.slice(0, 20).every((s) => s === 401)).toBe(true);
      expect(results[20]).toBe(429);
    });
  });

  describe('client IP address', () => {
    it('ignores X-Forwarded-For unless a proxy is trusted, so it cannot be spoofed', async () => {
      await start(); // TRUST_PROXY not set
      const results = await statuses(11, (i) => requestOtp(phoneN(i), { 'x-forwarded-for': `10.9.9.${i + 1}` }));
      expect(results[10]).toBe(429);
    });

    it('gives every client behind a trusted proxy its own allowance', async () => {
      await start(1);
      await statuses(10, (i) => requestOtp(phoneN(i), { 'x-forwarded-for': '10.1.1.1' }));
      expect((await requestOtp(phoneN(50), { 'x-forwarded-for': '10.1.1.1' })).status).toBe(429);
      expect((await requestOtp(phoneN(51), { 'x-forwarded-for': '10.2.2.2' })).status).toBe(200);
    });
  });

  describe('all other endpoints', () => {
    it('allows 100 requests a minute from one IP, then answers 429', async () => {
      await start();
      const results = await statuses(THROTTLE_LIMITS.api.limit + 1, () => get('/api/v1/ping'));
      expect(results.slice(0, 100).every((s) => s === 200)).toBe(true);
      expect(results[100]).toBe(429);
    });

    it('counts each logged-in user separately, even from the same IP', async () => {
      await start();
      await statuses(101, () => get('/api/v1/ping', tokenFor('user-a')));
      expect((await get('/api/v1/ping', tokenFor('user-a'))).status).toBe(429);
      expect((await get('/api/v1/ping', tokenFor('user-b'))).status).toBe(200);
    });

    it('keeps counting a user after a new token is issued (refresh)', async () => {
      await start();
      await statuses(100, () => get('/api/v1/ping', tokenFor('user-a')));
      // a different token for the same user (as after a token refresh) shares the same allowance
      const another = { authorization: `Bearer ${new JwtService({ secret: SECRET }).sign({ sub: 'user-a', n: 2 })}` };
      expect((await get('/api/v1/ping', another)).status).toBe(429);
    });

    it('does not let a forged or expired token buy a fresh allowance', async () => {
      await start();
      await statuses(100, () => get('/api/v1/ping')); // this IP is now at its limit
      const forged = { authorization: `Bearer ${new JwtService({ secret: 'wrong' }).sign({ sub: 'someone-new' })}` };
      const expired = {
        authorization: `Bearer ${new JwtService({ secret: SECRET }).sign({ sub: 'someone-new' }, { expiresIn: -60 })}`,
      };
      expect((await get('/api/v1/ping')).status).toBe(429);
      expect((await get('/api/v1/ping', forged)).status).toBe(429);
      expect((await get('/api/v1/ping', expired)).status).toBe(429);
    });

    it('does not apply to the health check', async () => {
      await start();
      const results = await statuses(120, () => get('/health'));
      expect(results.every((s) => s === 200)).toBe(true);
    });
  });
});

describe('AppModule', () => {
  it('turns rate limiting on (imports ThrottlingModule)', () => {
    // AppModule checks the environment when it is loaded, so load it with the required variables set
    Object.assign(process.env, { DATABASE_URL: 'postgresql://x', JWT_SECRET: SECRET, JWT_REFRESH_SECRET: 'r' });
    const { AppModule } = require('../../app.module');
    const imports: unknown[] = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(ThrottlingModule);
  });
});
