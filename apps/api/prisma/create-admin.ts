// Creates (or updates) an admin account. Safe to run again: it never touches other data.
//   npm run db:create-admin -w apps/api -- --phone +919876543210 --name "Owner Name" [--role owner] [--email a@b.com]
// For a live database, point DATABASE_URL at the DIRECT connection (port 5432) when you run it from your computer.
import { PrismaClient } from '@prisma/client';
import { CREATE_ADMIN_USAGE, parseCreateAdminArgs } from '../src/common/admin-bootstrap';

const prisma = new PrismaClient();

async function main() {
  let admin;
  try {
    admin = parseCreateAdminArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${(err as Error).message}\n\n${CREATE_ADMIN_USAGE}`);
    process.exit(1);
  }

  const before = await prisma.adminUser.findUnique({ where: { phone: admin.phone } });
  const saved = await prisma.adminUser.upsert({
    where: { phone: admin.phone },
    update: { name: admin.name, role: admin.role, status: 'active', ...(admin.email ? { email: admin.email } : {}) },
    create: { phone: admin.phone, name: admin.name, role: admin.role, ...(admin.email ? { email: admin.email } : {}) },
  });
  console.log(`${before ? 'Updated' : 'Created'} admin: ${saved.name} (${saved.role}), ${saved.phone}`);
  console.log('They sign in to the admin panel with this phone number (it must also be on MOCK_OTP_ALLOWED_PHONES while the pilot is closed).');
}

main()
  .catch((err) => {
    console.error('Could not create the admin:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
