import { databaseHost, seedRefusal } from './local-database-guard';

const url = (host: string) => `postgresql://juhar:pw@${host}:5432/juhar_dev?schema=public`;

describe('seedRefusal', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('lets a seed run against a database on this computer (%s)', (host) => {
    expect(seedRefusal({ DATABASE_URL: url(host) }, 'the seed')).toBeNull();
  });

  it('refuses a database that is not local, naming it, and says what to use instead', () => {
    const msg = seedRefusal({ DATABASE_URL: url('db.abcdefgh.supabase.co') }, 'the sample seed')!;
    expect(msg).toContain('db.abcdefgh.supabase.co');
    expect(msg).toContain('db:create-admin');
    expect(msg).toContain('ALLOW_REMOTE_SEED=1');
  });

  it('ALLOW_REMOTE_SEED=1 allows it on purpose', () => {
    expect(seedRefusal({ DATABASE_URL: url('db.example.com'), ALLOW_REMOTE_SEED: '1' }, 'the seed')).toBeNull();
  });

  it('never runs with NODE_ENV=production, not even with the override', () => {
    expect(seedRefusal({ NODE_ENV: 'production', DATABASE_URL: url('localhost'), ALLOW_REMOTE_SEED: '1' }, 'the seed')).toMatch(/NODE_ENV=production/);
  });

  it('refuses when the address cannot be read or is missing', () => {
    expect(seedRefusal({ DATABASE_URL: 'not a url' }, 'the seed')).toMatch(/cannot read/);
    expect(seedRefusal({}, 'the seed')).toMatch(/cannot read/);
  });

  it('a look-alike host is not local', () => {
    expect(seedRefusal({ DATABASE_URL: url('localhost.evil.example') }, 'the seed')).not.toBeNull();
    expect(databaseHost(url('LOCALHOST'))).toBe('localhost');
  });
});
