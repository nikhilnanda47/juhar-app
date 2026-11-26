// The sample seeds create a known admin number and made-up sarees. They are for a database on this computer.
// Pointing one at the pilot or live database by mistake (a DATABASE_URL left in the shell) would put test data
// in front of customers, so they refuse unless the database is local or ALLOW_REMOTE_SEED=1 is set on purpose.

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

export function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Returns a message when the seed should refuse, or null when it may run. */
export function seedRefusal(env: Record<string, string | undefined>, script: string): string | null {
  if (env.NODE_ENV === 'production') return `Refusing to run ${script} with NODE_ENV=production.`;
  if (env.ALLOW_REMOTE_SEED === '1') return null;
  const host = databaseHost(env.DATABASE_URL);
  if (host && LOCAL_HOSTS.includes(host)) return null;
  return (
    `Refusing to run ${script}: DATABASE_URL points at "${host ?? 'an address I cannot read'}", not at this computer. ` +
    'It adds sample data (and a known admin number). To create a real admin on a live database use ' +
    '"npm run db:create-admin"; to run this on purpose anyway, set ALLOW_REMOTE_SEED=1.'
  );
}
