import { OrdersService } from './orders.service';

// The dashboard's "Today's Orders" and "GMV Today": counted by the database over the whole
// India day, not worked out from the first page of orders.
function setup(totals: { count: number; sum: number | null }) {
  const aggregate = jest.fn(async () => ({ _count: { _all: totals.count }, _sum: { totalPaise: totals.sum } }));
  const prisma = { order: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0), aggregate } };
  return { service: new OrdersService(prisma as any, {} as any), aggregate };
}

describe('OrdersService.findAllAdmin: today in India', () => {
  it('returns today\'s order count and value from the database', async () => {
    const { service } = setup({ count: 42, sum: 1234500 });
    const { counts } = await service.findAllAdmin({} as any, new Date('2026-11-23T10:00:00Z'));
    expect(counts.today).toEqual({ date: '2026-11-23', orders: 42, gmvPaise: 1234500 });
  });

  it('is zero (not null) on a day with no orders', async () => {
    const { service } = setup({ count: 0, sum: null });
    const { counts } = await service.findAllAdmin({} as any, new Date('2026-11-23T10:00:00Z'));
    expect(counts.today).toEqual({ date: '2026-11-23', orders: 0, gmvPaise: 0 });
  });

  it('asks for the India day (18:30 UTC to 18:30 UTC) and leaves cancelled orders out', async () => {
    const { service, aggregate } = setup({ count: 0, sum: null });
    await service.findAllAdmin({} as any, new Date('2026-11-23T10:00:00Z'));
    const where = (aggregate.mock.calls[0] as any[])[0].where;
    expect(where.createdAt.gte.toISOString()).toBe('2026-11-22T18:30:00.000Z');
    expect(where.createdAt.lt.toISOString()).toBe('2026-11-23T18:30:00.000Z');
    expect(where.status).toEqual({ not: 'cancelled' });
  });

  it('is the same whatever filter, search or page is asked for', async () => {
    const { service, aggregate } = setup({ count: 5, sum: 500000 });
    const now = new Date('2026-11-23T10:00:00Z');
    const a = (await service.findAllAdmin({}, now)).counts.today;
    const b = (await service.findAllAdmin({ status: 'cancelled', search: 'x', limit: 1 } as any, now)).counts.today;
    expect(b).toEqual(a);
    const w1 = (aggregate.mock.calls[0] as any[])[0].where;
    const w2 = (aggregate.mock.calls[1] as any[])[0].where;
    expect(w2).toEqual(w1);
  });
});
