import { validateEnv } from './env.validation';
import { createOtpProvider } from '../modules/auth/providers/otp-provider.factory';
import { MockOtpProvider } from '../modules/auth/providers/mock-otp.provider';

const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 's', JWT_REFRESH_SECRET: 'r' };

describe('validateEnv', () => {
  it('accepts the required variables', () => {
    expect(() => validateEnv({ ...base })).not.toThrow();
  });

  it.each(['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])('refuses a missing %s', (name) => {
    const env: Record<string, unknown> = { ...base };
    delete env[name];
    expect(() => validateEnv(env)).toThrow(name);
  });

  describe('OTP provider', () => {
    it('allows the mock provider in development, set or unset', () => {
      expect(() => validateEnv({ ...base, NODE_ENV: 'development' })).not.toThrow();
      expect(() => validateEnv({ ...base, NODE_ENV: 'development', OTP_PROVIDER: 'mock' })).not.toThrow();
      expect(() => validateEnv({ ...base })).not.toThrow();
    });

    it('allows the mock provider in test', () => {
      expect(() => validateEnv({ ...base, NODE_ENV: 'test' })).not.toThrow();
    });

    it('refuses to start in production when OTP_PROVIDER is unset (that means mock)', () => {
      expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/Refusing to start/);
    });

    it.each(['mock', 'MOCK', ' mock ', ''])('refuses to start in production with the mock provider (%p)', (value) => {
      expect(() => validateEnv({ ...base, NODE_ENV: 'production', OTP_PROVIDER: value })).toThrow(/123456/);
    });

    it('the production error says how to fix it', () => {
      expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/Set OTP_PROVIDER to a real SMS provider/);
    });

    it('refuses an unknown provider name, in any environment', () => {
      expect(() => validateEnv({ ...base, OTP_PROVIDER: 'carrier-pigeon' })).toThrow(/Unsupported OTP_PROVIDER "carrier-pigeon"/);
      expect(() => validateEnv({ ...base, NODE_ENV: 'production', OTP_PROVIDER: 'carrier-pigeon' })).toThrow(/Unsupported/);
    });

    it('still reports missing required variables first', () => {
      expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/Missing required environment variables/);
    });
  });
});

describe('createOtpProvider', () => {
  it.each([undefined, '', 'mock', 'MOCK'])('builds the mock provider for %p', (setting) => {
    expect(createOtpProvider(setting)).toBeInstanceOf(MockOtpProvider);
  });

  it('refuses an unknown provider', () => {
    expect(() => createOtpProvider('carrier-pigeon')).toThrow(/Unsupported OTP_PROVIDER/);
  });
});
