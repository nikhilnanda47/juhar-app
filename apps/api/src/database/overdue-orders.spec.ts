// Overdue COD orders in the admin list, against a REAL Postgres (OrdersService.findAllAdmin).
// Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- overdue-orders)
// The test creates its own user and orders and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { testMedia } from '../modules/media/test-media';
import { randomUUID } from 'crypto';
import { OrdersService } from '../modules/orders/orders.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('overdue COD orders (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new OrdersService(prisma as any, {} as any, testMedia());
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const phone = `+9${tag}`;
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  const H = 60;

  let userId = '';
  let before = { placed: 0, overdue: 0 };
  const ids: Record<string, string> = {};

  async function makeOrder(key: string, status: string, paymentMode: string, minutesAgo: number) {
    const order = await prisma.order.create({
      data: {
        publicNumber: `T-${tag}-${key}`,
        userId,
        status,
        paymentMode,
        subtotalPaise: 100000,
        shippingPaise: 0,
        taxPaise: 0,
        totalPaise: 100000,
        addressSnapshot: {},
        idempotencyKey: `key-${tag}-${key}`,
        createdAt: ago(minutesAgo),
      },
    });
    ids[key] = order.id;
  }

  beforeAll(async () => {
    // other orders may exist in this database, so measure the counts before adding ours
    before = (await service.findAllAdmin({ limit: 1 } as any, now)).counts;

    userId = (await prisma.user.create({ data: { phone } })).id;
    await makeOrder('lateCod', 'placed', 'cod', 30 * H); // overdue
    await makeOrder('justOver', 'placed', 'cod', 24 * H + 2); // overdue (2 minutes past 24h)
    await makeOrder('justUnder', 'placed', 'cod', 24 * H - 2); // not yet
    await makeOrder('fresh', 'placed', 'cod', 23 * H); // not yet
    await makeOrder('lateUpi', 'placed', 'upi', 30 * H); // UPI: not flagged
    await makeOrder('confirmed', 'confirmed', 'cod', 30 * H); // admin already acted
    await makeOrder('cancelled', 'cancelled', 'cod', 30 * H); // admin already acted
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const list = (query: Record<string, unknown>) => service.findAllAdmin({ search: phone, limit: 50, ...query } as any, now);
  const byKey = (items: any[], key: string) => items.find((o) => o.id === ids[key]);

  it('flags exactly the COD orders that are still placed after 24 hours', async () => {
    const { items } = await list({});
    expect(items).toHaveLength(7);
    const flagged = Object.keys(ids).filter((key) => byKey(items, key).overdue);
    expect(flagged.sort()).toEqual(['justOver', 'lateCod']);
  });

  it('shows how long each placed order has waited, and nothing for the others', async () => {
    const { items } = await list({});
    expect(byKey(items, 'lateCod').waitingMinutes).toBe(30 * H);
    expect(byKey(items, 'fresh').waitingMinutes).toBe(23 * H);
    expect(byKey(items, 'lateUpi').waitingMinutes).toBe(30 * H);
    expect(byKey(items, 'confirmed').waitingMinutes).toBeNull();
    expect(byKey(items, 'cancelled').waitingMinutes).toBeNull();
  });

  it('the overdue filter returns the same orders the flag marks, in the database', async () => {
    const { items } = await list({ overdue: true });
    expect(items.map((o: any) => o.id).sort()).toEqual([ids.lateCod, ids.justOver].sort());
    expect(items.every((o: any) => o.overdue)).toBe(true);
  });

  it('the overdue filter is a strict 24 hours: 2 minutes either side of the line', async () => {
    const { items } = await list({ overdue: true });
    const got = items.map((o: any) => o.id);
    expect(got).toContain(ids.justOver);
    expect(got).not.toContain(ids.justUnder);
  });

  it('the overdue filter and the status filter combine (placed + overdue)', async () => {
    const placed = await list({ overdue: true, status: 'placed' });
    expect(placed.items).toHaveLength(2);
    const shipped = await list({ overdue: true, status: 'shipped' });
    expect(shipped.items).toHaveLength(0);
  });

  it('counts: 5 more placed orders and 2 more overdue ones than before', async () => {
    const { counts } = await list({});
    expect(counts.placed - before.placed).toBe(5); // lateCod, justOver, justUnder, fresh, lateUpi
    expect(counts.overdue - before.overdue).toBe(2); // lateCod, justOver
  });

  it('counts are the same whatever filter, search or page is asked for', async () => {
    const all = (await list({})).counts;
    expect((await list({ status: 'cancelled' })).counts).toEqual(all);
    expect((await list({ overdue: true })).counts).toEqual(all);
    expect((await list({ limit: 1 })).counts).toEqual(all);
    expect((await service.findAllAdmin({ search: 'nobody-has-this' } as any, now)).counts).toEqual(all);
  });
});
