// Reading the command line of `npm run db:create-admin`, which makes the first real admin account of a new
// environment (the sample seed is for development only and must never run on a live database).
import { AdminRole } from '@juhar/shared';

export interface NewAdmin {
  phone: string;
  name: string;
  role: AdminRole;
  email?: string;
}

const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/;
const ROLES = Object.values(AdminRole) as string[];

export const CREATE_ADMIN_USAGE =
  'Usage: npm run db:create-admin -w apps/api -- --phone +919876543210 --name "Owner Name" [--role owner] [--email owner@example.com]\n' +
  `Roles: ${ROLES.join(', ')} (default: owner).`;

function valueOf(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next.trim() : '';
}

/** Throws an Error whose message says what to fix. */
export function parseCreateAdminArgs(argv: string[]): NewAdmin {
  const phone = valueOf(argv, 'phone');
  const name = valueOf(argv, 'name');
  const role = valueOf(argv, 'role') ?? AdminRole.OWNER;
  const email = valueOf(argv, 'email');

  if (!phone || !INDIAN_MOBILE.test(phone)) {
    throw new Error(`--phone must be +91 and ten digits, like +919876543210 (got ${phone ? `"${phone}"` : 'nothing'}).`);
  }
  if (!name || name.length < 2) throw new Error('--name is needed (at least 2 characters).');
  if (name.length > 100) throw new Error('--name is too long (100 characters at most).');
  if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(', ')} (got "${role}").`);
  if (email !== undefined && (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255)) {
    throw new Error(`--email "${email}" does not look like an email address.`);
  }
  return { phone, name, role: role as AdminRole, ...(email ? { email } : {}) };
}
