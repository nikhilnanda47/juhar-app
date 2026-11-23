// "Today's Orders" and "GMV Today" for the admin dashboard, against a REAL Postgres
// (OrdersService.findAllAdmin counts.today). Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- today-orders)
// The test creates its own user and orders and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OrdersService } from '../modules/orders/orders.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('today in India: order count and GMV (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new OrdersService(prisma as any, {} as any);
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const phone = `+9${tag}`;
  // A fixed moment in 2020 so no real order interferes: 1:30 am on 11 Jan 2020 in India.
  // India's 11 Jan runs from 10 Jan 18:30 UTC to 11 Jan 18:30 UTC.
  const now = new Date('2020-01-10T20:00:00Z');
  const at = (iso: string) => new Date(iso);
  let userId = '';
  const ids: string[] = [];

  let seq = 0;
  // the order number column holds 20 characters, so keep the number short: T-<8 hex>-<n>
  async function makeOrder(key: string, status: string, totalPaise: number, createdAt: Date) {
    const n = ++seq;
    const order = await prisma.order.create({
      data: {
        publicNumber: `T-${tag}-${n}`,
        userId,
        status,
        paymentMode: 'cod',
        subtotalPaise: totalPaise,
        shippingPaise: 0,
        taxPaise: 0,
        totalPaise,
        addressSnapshot: {},
        idempotencyKey: `key-${tag}-${key}-${n}`,
        createdAt,
      },
    });
    ids.push(order.id);
  }

  const today = async (when = now) => (await service.findAllAdmin({ limit: 1 } as any, when)).counts.today;
  let before = { orders: 0, gmvPaise: 0 };

  beforeAll(async () => {
    before = await today();
    userId = (await prisma.user.create({ data: { phone } })).id;
    await makeOrder('startExact', 'placed', 100000, at('2020-01-10T18:30:00.000Z')); // 12:00:00 am India: today
    await makeOrder('earlyMorning', 'confirmed', 250000, at('2020-01-10T19:00:00.000Z')); // 12:30 am: today
    await makeOrder('lateNight', 'delivered', 70000, at('2020-01-11T18:29:59.000Z')); // 11:59:59 pm: today
    await makeOrder('cancelledToday', 'cancelled', 900000, at('2020-01-10T21:00:00.000Z')); // not counted
    await makeOrder('justBefore', 'placed', 5000, at('2020-01-10T18:29:59.000Z')); // 11:59:59 pm the day before
    await makeOrder('nextDayStart', 'placed', 6000, at('2020-01-11T18:30:00.000Z')); // 12:00 am the day after
    await makeOrder('yesterday', 'placed', 7000, at('2020-01-09T10:00:00.000Z'));
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('counts the orders placed during the India day, from the first second to the last', async () => {
    const t = await today();
    expect(t.orders - before.orders).toBe(3); // startExact, earlyMorning, lateNight
    expect(t.gmvPaise - before.gmvPaise).toBe(100000 + 250000 + 70000);
  });

  it('leaves out cancelled orders and the orders just outside the day', async () => {
    // cancelled (900000), one second before the day (5000), the very start of the next day (6000), yesterday (7000)
    const t = await today();
    expect(t.orders - before.orders).toBe(3);
    expect(t.gmvPaise - before.gmvPaise).toBe(420000); // none of the 900000 + 5000 + 6000 + 7000
  });

  it('says which India date it is', async () => {
    expect((await today()).date).toBe('2020-01-11');
  });

  it('asking at the last second of the day or the first of the next gives the two different days', async () => {
    const lastSecond = await today(at('2020-01-11T18:29:59Z'));
    const nextDay = await today(at('2020-01-11T18:30:00Z'));
    expect(lastSecond.date).toBe('2020-01-11');
    expect(nextDay.date).toBe('2020-01-12');
    expect(nextDay.orders).toBeGreaterThanOrEqual(1); // nextDayStart (and only orders from 12 Jan)
  });

  it('counts the whole day even when it has more orders than one page', async () => {
    const extra = 25; // a page is 20
    for (let i = 0; i < extra; i++) await makeOrder(`bulk${i}`, 'placed', 1000, at('2020-01-11T05:00:00.000Z'));
    const t = await today();
    expect(t.orders - before.orders).toBe(3 + extra);
    expect(t.gmvPaise - before.gmvPaise).toBe(100000 + 250000 + 70000 + extra * 1000);
  });
});
