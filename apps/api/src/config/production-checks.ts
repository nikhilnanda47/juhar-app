/**
 * Checks that only matter on a live (NODE_ENV=production) API. They stop the start with a message that says
 * what to fix, because the alternative is a site that starts and then misbehaves in a way that is hard to trace.
 * Each returns a list of problems; validateEnv joins them into one error.
 */

const MIN_SECRET_LENGTH = 32;

/** The JWT secrets must be long, random and different from each other. */
export function secretProblems(config: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const access = String(config.JWT_SECRET ?? '');
  const refresh = String(config.JWT_REFRESH_SECRET ?? '');
  for (const [name, value] of [['JWT_SECRET', access], ['JWT_REFRESH_SECRET', refresh]] as const) {
    if (value.length < MIN_SECRET_LENGTH) {
      problems.push(`${name} is too short (${value.length} characters; use at least ${MIN_SECRET_LENGTH} random ones)`);
    }
  }
  if (access && access === refresh) problems.push('JWT_SECRET and JWT_REFRESH_SECRET are the same; they must differ');
  return problems;
}

/**
 * Supabase's pooler (port 6543) works through pgbouncer in transaction mode. Prisma then needs
 * `?pgbouncer=true`, or it fails at random with "prepared statement already exists".
 */
export function databaseUrlProblems(config: Record<string, unknown>): string[] {
  const url = String(config.DATABASE_URL ?? '');
  const usesPooler = /:6543(\/|\?|$)/.test(url) || /pooler\.supabase\.com/.test(url);
  if (usesPooler && !/[?&]pgbouncer=true\b/.test(url)) {
    return [
      'DATABASE_URL points at the connection pooler (port 6543) but has no "pgbouncer=true"; add ?pgbouncer=true to the end ' +
        '(Prisma otherwise fails with "prepared statement already exists")',
    ];
  }
  return [];
}

export function productionProblems(config: Record<string, unknown>): string[] {
  return [...secretProblems(config), ...databaseUrlProblems(config)];
}
