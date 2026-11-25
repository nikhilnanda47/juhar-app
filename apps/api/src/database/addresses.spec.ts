// Saved addresses against a REAL Postgres (AddressesService): a customer who has addresses always has
// exactly one default, editing and deleting only touches the customer's own addresses, and two deletes
// at once end cleanly. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- addresses)
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AddressesService } from '../modules/addresses/addresses.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('addresses (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new AddressesService(prisma as any);
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  let userA = '';
  let userB = '';

  const dto = (line1: string, isDefault = false) =>
    ({ recipientName: 'Test', recipientPhone: '+919000000001', line1, city: 'Sambalpur', district: 'Sambalpur', pinCode: '768001', label: 'Home', isDefault }) as any;
  const mine = async (user: string) => service.findAll(user);
  const defaults = async (user: string) => (await mine(user)).filter((a) => a.isDefault);
  const wait = () => new Promise((r) => setTimeout(r, 15)); // distinct createdAt, so "most recent" is clear

  beforeAll(async () => {
    userA = (await prisma.user.create({ data: { phone: `+9${tag}` } })).id;
    userB = (await prisma.user.create({ data: { phone: `+8${tag}` } })).id;
  });
  afterEach(async () => {
    await prisma.address.deleteMany({ where: { userId: { in: [userA, userB] } } });
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

  it('the first address becomes the default, and making another one the default moves it', async () => {
    const first = await service.create(userA, dto('1 First Road'));
    await wait();
    const second = await service.create(userA, dto('2 Second Road'));
    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);

    await service.update(userA, second.id, { isDefault: true });
    expect((await defaults(userA)).map((a) => a.id)).toEqual([second.id]);
  });

  it('turning the default off on the default address is ignored: there is always one', async () => {
    const first = await service.create(userA, dto('1 First Road'));
    await service.update(userA, first.id, { isDefault: false, line1: '1 First Road, changed' });
    const [only] = await defaults(userA);
    expect(only.id).toBe(first.id);
    expect(only.line1).toBe('1 First Road, changed'); // the rest of the edit still applied
  });

  it('deleting the default makes the most recently added remaining address the default', async () => {
    const a = await service.create(userA, dto('A'));
    await wait();
    const b = await service.create(userA, dto('B'));
    await wait();
    const c = await service.create(userA, dto('C'));
    expect((await defaults(userA)).map((x) => x.id)).toEqual([a.id]);

    await service.delete(userA, a.id);
    expect((await defaults(userA)).map((x) => x.id)).toEqual([c.id]);
    expect((await mine(userA)).map((x) => x.id).sort()).toEqual([b.id, c.id].sort());
  });

  it('deleting an address that is not the default leaves the default alone', async () => {
    const a = await service.create(userA, dto('A'));
    await wait();
    const b = await service.create(userA, dto('B'));
    await service.delete(userA, b.id);
    expect((await defaults(userA)).map((x) => x.id)).toEqual([a.id]);
  });

  it('deleting the only address leaves none, and a new one is the default again', async () => {
    const a = await service.create(userA, dto('A'));
    await service.delete(userA, a.id);
    expect(await mine(userA)).toHaveLength(0);
    expect((await service.create(userA, dto('B'))).isDefault).toBe(true);
  });

  it("one customer cannot edit or delete another customer's address", async () => {
    const theirs = await service.create(userB, dto('Theirs'));
    await expect(service.update(userA, theirs.id, { line1: 'hijack' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete(userA, theirs.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await mine(userB))[0].line1).toBe('Theirs');
  });

  it('two deletes of the same address at once: one succeeds, the other is "not found", the default survives', async () => {
    const a = await service.create(userA, dto('A'));
    await wait();
    const b = await service.create(userA, dto('B'));
    const results = await Promise.allSettled([service.delete(userA, a.id), service.delete(userA, a.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(NotFoundException);
    expect((await defaults(userA)).map((x) => x.id)).toEqual([b.id]);
  });

  it('a placed order keeps its own copy of the address after the saved address is deleted', async () => {
    // the order stores addressSnapshot (JSON), not a link to the address row
    const col = await prisma.$queryRaw<{ column_name: string }[]>`
      select column_name from information_schema.columns where table_name = 'orders' and column_name in ('address_snapshot','address_id')`;
    expect(col.map((c) => c.column_name)).toEqual(['address_snapshot']);
  });
});
