import { databaseUrlProblems, secretProblems } from './production-checks';
import { validateEnv } from './env.validation';

const strong = 'a'.repeat(40);
const other = 'b'.repeat(40);
const live = { DATABASE_URL: 'postgresql://x', JWT_SECRET: strong, JWT_REFRESH_SECRET: other, NODE_ENV: 'production', OTP_PROVIDER: 'mock', MOCK_OTP_ALLOWED_PHONES: '+919876543210' };

describe('secretProblems', () => {
  it('accepts two long, different secrets', () => {
    expect(secretProblems({ JWT_SECRET: strong, JWT_REFRESH_SECRET: other })).toEqual([]);
  });

  it('flags a short secret with its length', () => {
    expect(secretProblems({ JWT_SECRET: 'secret', JWT_REFRESH_SECRET: other })[0]).toMatch(/JWT_SECRET is too short \(6 characters/);
  });

  it('flags the two being the same', () => {
    expect(secretProblems({ JWT_SECRET: strong, JWT_REFRESH_SECRET: strong })).toEqual([expect.stringMatching(/the same/)]);
  });
});

describe('databaseUrlProblems', () => {
  it('flags the Supabase pooler without pgbouncer=true', () => {
    expect(databaseUrlProblems({ DATABASE_URL: 'postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' })[0]).toMatch(/pgbouncer=true/);
    expect(databaseUrlProblems({ DATABASE_URL: 'postgresql://u:p@host:6543/postgres' })).toHaveLength(1);
  });

  it('accepts the pooler with pgbouncer=true', () => {
    expect(databaseUrlProblems({ DATABASE_URL: 'postgresql://u:p@host:6543/postgres?pgbouncer=true&connection_limit=5' })).toEqual([]);
  });

  it('has no opinion on an ordinary database address', () => {
    expect(databaseUrlProblems({ DATABASE_URL: 'postgresql://u:p@db.example.com:5432/postgres' })).toEqual([]);
  });
});

describe('validateEnv in production', () => {
  it('starts with strong secrets and a usable address', () => {
    expect(() => validateEnv({ ...live })).not.toThrow();
  });

  it('refuses weak secrets, naming what to fix', () => {
    expect(() => validateEnv({ ...live, JWT_SECRET: 'secret' })).toThrow(/Refusing to start in production: JWT_SECRET is too short/);
  });

  it('refuses the pooler address without pgbouncer=true', () => {
    expect(() => validateEnv({ ...live, DATABASE_URL: 'postgresql://u:p@host:6543/postgres' })).toThrow(/pgbouncer=true/);
  });

  it('reports every problem at once', () => {
    expect(() => validateEnv({ ...live, JWT_SECRET: 's', JWT_REFRESH_SECRET: 's', DATABASE_URL: 'postgresql://u:p@host:6543/x' })).toThrow(/too short.*too short.*the same.*pgbouncer/s);
  });

  it('does not apply these rules in development or test (short secrets are fine locally)', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://x', JWT_SECRET: 's', JWT_REFRESH_SECRET: 'r', NODE_ENV: 'development' })).not.toThrow();
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://x', JWT_SECRET: 's', JWT_REFRESH_SECRET: 'r', NODE_ENV: 'test' })).not.toThrow();
  });
});
