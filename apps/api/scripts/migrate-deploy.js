// Applies the database migrations for a release (what Railway runs before it starts the new version).
//
// Migrations need a DIRECT connection to the database. Supabase's pooler (port 6543) cannot run them
// reliably, so when DIRECT_URL is set this uses it instead of DATABASE_URL, for this command only.
// Without DIRECT_URL it uses DATABASE_URL, which is right for a plain Postgres.
const { spawnSync } = require('node:child_process');

const direct = (process.env.DIRECT_URL || '').trim();
const url = direct || (process.env.DATABASE_URL || '').trim();

if (!url) {
  console.error('Cannot run the migrations: neither DIRECT_URL nor DATABASE_URL is set.');
  process.exit(1);
}
if (!direct && /:6543(\/|\?|$)|pooler\.supabase\.com/.test(url)) {
  console.error(
    'DATABASE_URL points at the connection pooler (port 6543) and DIRECT_URL is not set. ' +
      'Migrations need the direct connection (port 5432): set DIRECT_URL to it.',
  );
  process.exit(1);
}

console.log(`Applying migrations through the ${direct ? 'direct (DIRECT_URL)' : 'DATABASE_URL'} connection...`);
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
  shell: process.platform === 'win32',
});
process.exit(result.status === null ? 1 : result.status);
