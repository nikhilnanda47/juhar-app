import { parseCreateAdminArgs } from './admin-bootstrap';

const ok = ['--phone', '+919876543210', '--name', 'Owner One'];

describe('parseCreateAdminArgs', () => {
  it('reads a phone and a name; the role defaults to owner', () => {
    expect(parseCreateAdminArgs(ok)).toEqual({ phone: '+919876543210', name: 'Owner One', role: 'owner' });
  });

  it('reads a role and an email', () => {
    expect(parseCreateAdminArgs([...ok, '--role', 'fulfillment_operator', '--email', 'a@b.co'])).toEqual({
      phone: '+919876543210', name: 'Owner One', role: 'fulfillment_operator', email: 'a@b.co',
    });
  });

  it.each([['9876543210'], ['+91 98765 43210'], ['+911234567890'], ['']])('refuses the phone %p', (phone) => {
    expect(() => parseCreateAdminArgs(['--phone', phone, '--name', 'Owner One'])).toThrow(/--phone/);
  });

  it('refuses a missing phone, name, or a one-letter name', () => {
    expect(() => parseCreateAdminArgs(['--name', 'Owner One'])).toThrow(/--phone/);
    expect(() => parseCreateAdminArgs(['--phone', '+919876543210'])).toThrow(/--name/);
    expect(() => parseCreateAdminArgs(['--phone', '+919876543210', '--name', 'O'])).toThrow(/--name/);
  });

  it('refuses an unknown role, listing the real ones', () => {
    expect(() => parseCreateAdminArgs([...ok, '--role', 'god'])).toThrow(/owner, catalog_editor, fulfillment_operator, support/);
  });

  it('refuses a badly written email', () => {
    expect(() => parseCreateAdminArgs([...ok, '--email', 'not-an-email'])).toThrow(/email/);
  });

  it('a flag without a value does not swallow the next flag', () => {
    expect(() => parseCreateAdminArgs(['--phone', '--name', 'Owner One'])).toThrow(/--phone/);
  });
});

// ── createOrUpdateAdmin: a login and a staff record, linked ──
import { createOrUpdateAdmin } from './admin-bootstrap';

function fakeDb(initial: { users?: any[]; admins?: any[] } = {}) {
  const users = [...(initial.users ?? [])];
  const admins = [...(initial.admins ?? [])];
  const tx = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.phone === where.phone) ?? null),
      create: jest.fn(async ({ data }: any) => { const u = { id: `user-${users.length + 1}`, name: null, ...data }; users.push(u); return u; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(users.find((u) => u.id === where.id), data)),
    },
    adminUser: {
      findUnique: jest.fn(async ({ where }: any) => admins.find((a) => a.userId === where.userId) ?? null),
      create: jest.fn(async ({ data }: any) => { const a = { id: `admin-${admins.length + 1}`, ...data }; admins.push(a); return a; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(admins.find((a) => a.id === where.id), data)),
    },
  };
  return { db: { $transaction: async (fn: any) => fn(tx) }, tx, users, admins };
}
const owner = { phone: '+919876543210', name: 'Owner Name', role: 'owner' as any };

describe('createOrUpdateAdmin', () => {
  it('makes a login and a staff record, linked to each other', async () => {
    const { db, users, admins } = fakeDb();
    const result = await createOrUpdateAdmin(db as any, owner);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ phone: owner.phone, name: 'Owner Name' });
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({ userId: users[0].id, phone: owner.phone, name: 'Owner Name', role: 'owner', status: 'active' });
    expect(result).toMatchObject({ created: true, userId: users[0].id, adminId: admins[0].id, role: 'owner' });
  });

  it('uses the login the person already has (a customer account with the same number) instead of making another', async () => {
    const { db, users, admins } = fakeDb({ users: [{ id: 'existing-login', phone: owner.phone, name: 'Priya' }] });
    const result = await createOrUpdateAdmin(db as any, owner);
    expect(users).toHaveLength(1);
    expect(admins[0].userId).toBe('existing-login');
    expect(users[0].name).toBe('Priya'); // a name they already chose is left alone
    expect(result.created).toBe(true);
  });

  it('gives a login with no name the admin\'s name', async () => {
    const { db, users } = fakeDb({ users: [{ id: 'l1', phone: owner.phone, name: null }] });
    await createOrUpdateAdmin(db as any, owner);
    expect(users[0].name).toBe('Owner Name');
  });

  it('run again, it updates the same admin (name, role, email) and makes no second account', async () => {
    const { db, users, admins } = fakeDb();
    await createOrUpdateAdmin(db as any, owner);
    const again = await createOrUpdateAdmin(db as any, { ...owner, name: 'New Name', role: 'support' as any, email: 'o@example.com' });
    expect(users).toHaveLength(1);
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({ name: 'New Name', role: 'support', email: 'o@example.com', status: 'active' });
    expect(again.created).toBe(false);
  });

  it('re-activates a suspended admin', async () => {
    const { db, admins } = fakeDb();
    await createOrUpdateAdmin(db as any, owner);
    admins[0].status = 'suspended';
    await createOrUpdateAdmin(db as any, owner);
    expect(admins[0].status).toBe('active');
  });

  it('does it all in one transaction', async () => {
    const { db } = fakeDb();
    const spy = jest.spyOn(db, '$transaction');
    await createOrUpdateAdmin(db as any, owner);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
