import { ValidationPipe } from '@nestjs/common';
import { testMedia } from '../media/test-media';
import { AdminOrderQueryDto } from './dto';
import { OrdersService } from './orders.service';

// Admin order list: COD orders still "placed" after 24 hours are flagged (never cancelled).
const NOW = new Date('2026-11-23T12:00:00.000Z');
const MIN = 60_000;
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * MIN);

function order(id: string, status: string, paymentMode: string, minutesAgo: number) {
  return {
    id,
    publicNumber: `JUH-${id}`,
    status,
    paymentMode,
    paymentStatus: 'cod_pending',
    totalPaise: 100000,
    items: [],
    createdAt: ago(minutesAgo),
    user: { id: 'user-asha', phone: '+919876543210', name: 'Asha' },
  };
}

function setup(rows: any[], counts = { placed: 7, overdue: 3 }) {
  const findMany = jest.fn(async () => rows);
  const count = jest.fn(async ({ where }: any) => (where.createdAt ? counts.overdue : counts.placed));
  const aggregate = jest.fn(async () => ({ _count: { _all: 0 }, _sum: { totalPaise: null } }));
  const service = new OrdersService({ order: { findMany, count, aggregate } } as any, {} as any, testMedia());
  return { service, findMany, count };
}

const byId = (items: any[], id: string) => items.find((o) => o.id === id);

describe('OrdersService.findAllAdmin: overdue COD orders', () => {
  it('flags a COD order still placed for more than 24 hours', async () => {
    const { service } = setup([order('late', 'placed', 'cod', 25 * 60)]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(items[0]).toMatchObject({ overdue: true, waitingMinutes: 1500 });
  });

  it('does not flag it just under 24 hours, or at exactly 24 hours', async () => {
    const { service } = setup([
      order('under', 'placed', 'cod', 24 * 60 - 1),
      order('exact', 'placed', 'cod', 24 * 60),
    ]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(byId(items, 'under').overdue).toBe(false);
    expect(byId(items, 'exact').overdue).toBe(false);
  });

  it('flags it one minute past 24 hours', async () => {
    const { service } = setup([order('just', 'placed', 'cod', 24 * 60 + 1)]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(items[0]).toMatchObject({ overdue: true, waitingMinutes: 1441 });
  });

  it('reports how long every placed order has waited', async () => {
    const { service } = setup([order('new', 'placed', 'cod', 5), order('mid', 'placed', 'cod', 600)]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(byId(items, 'new')).toMatchObject({ waitingMinutes: 5, overdue: false });
    expect(byId(items, 'mid')).toMatchObject({ waitingMinutes: 600, overdue: false });
  });

  it.each(['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'])(
    'never flags an old %s order (an admin already acted on it)',
    async (status) => {
      const { service } = setup([order('x', status, 'cod', 5 * 24 * 60)]);
      const { items } = await service.findAllAdmin({} as any, NOW);
      expect(items[0]).toMatchObject({ overdue: false, waitingMinutes: null });
    },
  );

  it('does not flag an old placed UPI order (its hold expires on its own)', async () => {
    const { service } = setup([order('upi', 'placed', 'upi', 5 * 24 * 60)]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(items[0]).toMatchObject({ overdue: false, waitingMinutes: 7200 });
  });

  it('keeps the existing order fields', async () => {
    const { service } = setup([order('a', 'placed', 'cod', 10)]);
    const { items } = await service.findAllAdmin({} as any, NOW);
    expect(items[0]).toMatchObject({
      id: 'a',
      publicNumber: 'JUH-a',
      status: 'placed',
      paymentMode: 'cod',
      totalPaise: 100000,
      customer: { phone: '+919876543210', name: 'Asha' },
    });
  });

  describe('overdue filter', () => {
    const cutoff = new Date(NOW.getTime() - 24 * 60 * MIN);

    it('asks for placed COD orders older than 24 hours', async () => {
      const { service, findMany } = setup([]);
      await service.findAllAdmin({ overdue: true } as any, NOW);
      const args = (findMany.mock.calls[0] as unknown as any[])[0];
      expect(args.where.AND).toEqual([{ status: 'placed', paymentMode: 'cod', createdAt: { lt: cutoff } }]);
    });

    it('adds nothing when the filter is off or missing', async () => {
      const { service, findMany } = setup([]);
      await service.findAllAdmin({ overdue: false } as any, NOW);
      await service.findAllAdmin({} as any, NOW);
      for (const call of findMany.mock.calls as unknown as any[][]) expect(call[0].where.AND).toBeUndefined();
    });

    it('works together with the search', async () => {
      const { service, findMany } = setup([]);
      await service.findAllAdmin({ overdue: true, search: '98765' } as any, NOW);
      const args = (findMany.mock.calls[0] as unknown as any[])[0];
      expect(args.where.OR).toBeDefined();
      expect(args.where.AND).toHaveLength(1);
    });
  });

  describe('counts', () => {
    it('returns how many orders are placed and how many are overdue', async () => {
      const { service } = setup([], { placed: 12, overdue: 5 });
      const result = await service.findAllAdmin({} as any, NOW);
      expect(result.counts).toMatchObject({ placed: 12, overdue: 5 });
    });

    it('counts all orders, not just this page or this filter', async () => {
      const { service, count } = setup([]);
      await service.findAllAdmin({ status: 'shipped', search: 'x', limit: 2, overdue: true } as any, NOW);
      const wheres = (count.mock.calls as unknown as any[][]).map((c) => c[0].where);
      expect(wheres).toContainEqual({ status: 'placed' });
      expect(wheres).toContainEqual({
        status: 'placed',
        paymentMode: 'cod',
        createdAt: { lt: new Date(NOW.getTime() - 24 * 60 * MIN) },
      });
    });
  });
});

describe('AdminOrderQueryDto overdue parameter', () => {
  // the same pipe settings as main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const parse = (query: Record<string, unknown>) =>
    pipe.transform(query, { type: 'query', metatype: AdminOrderQueryDto }) as Promise<AdminOrderQueryDto>;

  it('reads overdue=true', async () => {
    expect((await parse({ overdue: 'true' })).overdue).toBe(true);
  });

  it('reads overdue=false as false (the pipe alone would turn the text "false" into true)', async () => {
    expect((await parse({ overdue: 'false' })).overdue).toBe(false);
  });

  it('leaves it off when missing', async () => {
    expect((await parse({ status: 'placed' })).overdue).toBeUndefined();
  });

  it('treats any other text as false', async () => {
    expect((await parse({ overdue: 'maybe' })).overdue).toBe(false);
  });

  it('still refuses unknown parameters', async () => {
    await expect(parse({ overdu: 'true' })).rejects.toThrow();
  });
});
