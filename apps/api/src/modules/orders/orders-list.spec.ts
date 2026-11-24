import { OrdersService } from './orders.service';

// The customer's own order list: pages, plus the total number of orders (for "N orders").
function setup(rows: any[], total: number, byStatus: { status: string; n: number }[] = []) {
  const findMany = jest.fn(async () => rows);
  const count = jest.fn(async () => total);
  const groupBy = jest.fn(async () => byStatus.map((s) => ({ status: s.status, _count: { _all: s.n } })));
  const service = new OrdersService({ order: { findMany, count, groupBy } } as any, {} as any);
  return { service, findMany, count, groupBy };
}
const row = (id: string) => ({ id, publicNumber: 'JUH-' + id, status: 'placed', items: [], totalPaise: 1000, createdAt: new Date() });

describe('OrdersService.findMyOrders', () => {
  it('returns the total number of orders, which can be more than the page', async () => {
    const { service } = setup([row('a'), row('b')], 47);
    const result = await service.findMyOrders('u1', { limit: 2 } as any);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(47);
  });

  it('counts with the same filter as the list (this customer, this status) and no cursor', async () => {
    const { service, count } = setup([], 3);
    await service.findMyOrders('u1', { limit: 5, status: 'delivered', cursor: 'x' } as any);
    expect((count.mock.calls[0] as any[])[0]).toEqual({ where: { userId: 'u1', status: 'delivered' } });
  });

  it('returns how many orders the customer has in each status, ignoring the status filter', async () => {
    const { service, groupBy } = setup([], 2, [{ status: 'placed', n: 5 }, { status: 'delivered', n: 40 }]);
    const result = await service.findMyOrders('u1', { limit: 5, status: 'delivered' } as any);
    expect(result.counts).toEqual({ placed: 5, delivered: 40 });
    expect((groupBy.mock.calls[0] as any[])[0].where).toEqual({ userId: 'u1' });
  });

  it('pages: limit + 1 rows asked, hasMore and the cursor of the last visible row', async () => {
    const { service, findMany } = setup([row('c'), row('b'), row('a')], 3);
    const result = await service.findMyOrders('u1', { limit: 2 } as any);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe('b');
    expect((findMany.mock.calls[0] as any[])[0]).toMatchObject({ take: 3, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  });

  it('the last page has no cursor', async () => {
    const { service } = setup([row('a')], 1);
    const result = await service.findMyOrders('u1', { limit: 2 } as any);
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });
});
