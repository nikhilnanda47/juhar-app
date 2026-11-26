import { resolveActors } from './actor-names';

const prismaWith = (users: any[]) => ({ user: { findMany: jest.fn().mockResolvedValue(users) } });

describe('resolveActors', () => {
  it('names an admin from their staff record, followed from the login, with their role', async () => {
    const prisma = prismaWith([{ id: 'u1', phone: '+911', name: 'Login Name', adminUser: { name: 'Owner One', role: 'owner' } }]);
    const actors = await resolveActors(prisma as any, ['u1']);
    expect(actors.get('u1')).toEqual({ name: 'Owner One', role: 'owner' });
  });

  it('asks the database once, for the logins and their staff records together, by login id', async () => {
    const prisma = prismaWith([]);
    await resolveActors(prisma as any, ['u1', 'u2', 'u1', null, undefined]);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: { in: ['u1', 'u2'] } });
    expect(args.select.adminUser).toEqual({ select: { name: true, role: true } });
  });

  it('still names a person who is not (or no longer) an admin, from their login, with no role', async () => {
    const prisma = prismaWith([
      { id: 'u2', phone: '+912', name: 'Priya', adminUser: null },
      { id: 'u3', phone: '+913', name: null, adminUser: null },
    ]);
    const actors = await resolveActors(prisma as any, ['u2', 'u3']);
    expect(actors.get('u2')).toEqual({ name: 'Priya', role: '' });
    expect(actors.get('u3')).toEqual({ name: '+913', role: '' }); // no name anywhere: the phone number
  });

  it('leaves out ids that match no login', async () => {
    const actors = await resolveActors(prismaWith([]) as any, ['ghost']);
    expect(actors.has('ghost')).toBe(false);
  });

  it('does not ask anything when there are no ids', async () => {
    const prisma = prismaWith([]);
    expect((await resolveActors(prisma as any, [null, undefined])).size).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
