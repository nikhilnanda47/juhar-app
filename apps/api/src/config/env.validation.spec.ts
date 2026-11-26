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
      expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/MOCK_OTP_ALLOWED_PHONES/);
    });

    describe('closed pilot (mock provider with an allow-list)', () => {
      const pilot = { ...base, JWT_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40), NODE_ENV: 'production', OTP_PROVIDER: 'mock' }; // a live API also needs real secrets

      it('is allowed in production when the allow-list names the numbers', () => {
        expect(() => validateEnv({ ...pilot, MOCK_OTP_ALLOWED_PHONES: '+919876543210,+919123456789' })).not.toThrow();
      });

      it('an empty or blank list is not a closed pilot: it still refuses to start', () => {
        expect(() => validateEnv({ ...pilot, MOCK_OTP_ALLOWED_PHONES: '' })).toThrow(/Refusing to start/);
        expect(() => validateEnv({ ...pilot, MOCK_OTP_ALLOWED_PHONES: '  ,  ' })).toThrow(/Refusing to start/);
      });

      it('a badly written number stops the start, naming it, in any environment', () => {
        expect(() => validateEnv({ ...pilot, MOCK_OTP_ALLOWED_PHONES: '9876543210' })).toThrow(/9876543210/);
        expect(() => validateEnv({ ...base, MOCK_OTP_ALLOWED_PHONES: '+911234567890' })).toThrow(/\+911234567890/);
      });
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

describe('validateEnv LOG_LEVEL', () => {
  it.each(['error', 'warn', 'log', 'debug', 'verbose', 'WARN', ' debug '])('accepts %p', (value) => {
    expect(() => validateEnv({ ...base, LOG_LEVEL: value })).not.toThrow();
  });

  it('is optional', () => {
    expect(() => validateEnv({ ...base })).not.toThrow();
    expect(() => validateEnv({ ...base, LOG_LEVEL: '' })).not.toThrow();
  });

  it('refuses an unknown level and names the valid ones', () => {
    expect(() => validateEnv({ ...base, LOG_LEVEL: 'loud' })).toThrow(/Unsupported LOG_LEVEL "loud"\. Supported values: error, warn, log, debug, verbose/);
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
