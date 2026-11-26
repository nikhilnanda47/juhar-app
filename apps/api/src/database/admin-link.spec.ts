// One identity for admins, against a REAL Postgres: every admin is a login (users) plus a staff record (admin_users)
// linked by user_id; history names people through that link. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- admin-link)
// The test makes its own rows and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { resolveActors } from '../common/audit/actor-names';
import { createOrUpdateAdmin } from '../common/admin-bootstrap';
import { AdminRole } from '@juhar/shared';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('one identity for admins (real Postgres)', () => {
  const prisma = new PrismaClient();
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const phoneOf = (n: number) => `+9${tag}${n}`;
  const phones: string[] = [];
  const track = (n: number) => { const p = phoneOf(n); phones.push(p); return p; };

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { phone: { in: phones } }, select: { id: true } });
    await prisma.adminUser.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await prisma.$disconnect();
  });

  it('creates a login and a staff record, linked, in one go', async () => {
    const phone = track(1);
    const made = await createOrUpdateAdmin(prisma as any, { phone, name: 'Owner One', role: AdminRole.OWNER });
    expect(made.created).toBe(true);
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: made.adminId }, include: { user: true } });
    expect(admin.user.phone).toBe(phone);
    expect(admin.user.name).toBe('Owner One');
    expect(admin.userId).toBe(made.userId);
  });

  it('run again it updates the same admin: no second login, no second staff record', async () => {
    const phone = track(2);
    const first = await createOrUpdateAdmin(prisma as any, { phone, name: 'Editor', role: AdminRole.CATALOG_EDITOR });
    const second = await createOrUpdateAdmin(prisma as any, { phone, name: 'Editor Renamed', role: AdminRole.SUPPORT });
    expect(second.created).toBe(false);
    expect(second.adminId).toBe(first.adminId);
    expect(await prisma.user.count({ where: { phone } })).toBe(1);
    const rows = await prisma.adminUser.findMany({ where: { userId: first.userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Editor Renamed', role: 'support' });
  });

  it('turns a customer into an admin on the login they already have (their history and orders stay theirs)', async () => {
    const phone = track(3);
    const customer = await prisma.user.create({ data: { phone, name: 'Priya' } });
    const made = await createOrUpdateAdmin(prisma as any, { phone, name: 'Priya Staff', role: AdminRole.FULFILLMENT_OPERATOR });
    expect(made.userId).toBe(customer.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).name).toBe('Priya'); // a name they chose stays
  });

  it('a login can be at most one admin, and a staff record must point at a real login', async () => {
    const phone = track(4);
    const made = await createOrUpdateAdmin(prisma as any, { phone, name: 'Only Once', role: AdminRole.OWNER });
    await expect(
      prisma.adminUser.create({ data: { userId: made.userId, phone: `+9${tag}9`, name: 'Duplicate', role: 'owner' } }),
    ).rejects.toMatchObject({ code: 'P2002' }); // unique
    await expect(
      prisma.adminUser.create({ data: { userId: randomUUID(), phone: `+9${tag}8`, name: 'Ghost', role: 'owner' } }),
    ).rejects.toMatchObject({ code: 'P2003' }); // foreign key
  });

  it('a login that is an admin cannot be deleted out from under their history', async () => {
    const phone = track(5);
    const made = await createOrUpdateAdmin(prisma as any, { phone, name: 'Keep Me', role: AdminRole.OWNER });
    await expect(prisma.user.delete({ where: { id: made.userId } })).rejects.toMatchObject({ code: 'P2003' });
  });

  it('history names people through the link, even when the staff record\'s phone differs from the login\'s', async () => {
    // The case the phone match could not handle: the number on the staff record is not the one on the login.
    const phone = track(6);
    const made = await createOrUpdateAdmin(prisma as any, { phone, name: 'Owner Name', role: AdminRole.OWNER });
    await prisma.adminUser.update({ where: { id: made.adminId }, data: { phone: `+9${tag}7` } });
    phones.push(`+9${tag}7`);

    const customerPhone = track(10);
    const customer = await prisma.user.create({ data: { phone: customerPhone, name: 'Plain Customer' } });
    const noName = await prisma.user.create({ data: { phone: track(11) } });

    const actors = await resolveActors(prisma, [made.userId, customer.id, noName.id, randomUUID(), null]);
    expect(actors.get(made.userId)).toEqual({ name: 'Owner Name', role: 'owner' });
    expect(actors.get(customer.id)).toEqual({ name: 'Plain Customer', role: '' }); // not an admin: no role
    expect(actors.get(noName.id)).toEqual({ name: track(11), role: '' }); // no name anywhere: their number
    expect(actors.size).toBe(3); // the unknown id and null are left out
  });

  it('asks the database once however many people are named', async () => {
    const a = await createOrUpdateAdmin(prisma as any, { phone: track(12), name: 'A', role: AdminRole.OWNER });
    const b = await createOrUpdateAdmin(prisma as any, { phone: track(13), name: 'B', role: AdminRole.SUPPORT });
    const spy = jest.spyOn(prisma.user, 'findMany');
    await resolveActors(prisma, [a.userId, b.userId]);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
