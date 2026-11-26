import { OrdersService } from './orders.service';
import { testMedia } from '../media/test-media';

// Each order in the admin list says who placed it, including the user ID that the logs show
// ("user=<id>"), so a log line can be matched to a customer without opening the database.
function setup(rows: any[]) {
  const findMany = jest.fn(async () => rows);
  const count = jest.fn(async () => 0);
  const aggregate = jest.fn(async () => ({ _count: { _all: 0 }, _sum: { totalPaise: null } }));
  return { service: new OrdersService({ order: { findMany, count, aggregate } } as any, {} as any, testMedia()), findMany };
}
const order = (id: string, user: any) => ({
  id, publicNumber: `JUH-${id}`, status: 'confirmed', paymentMode: 'cod', paymentStatus: 'cod_pending',
  totalPaise: 1000, items: [], createdAt: new Date('2026-11-23T10:00:00Z'), user,
});

describe('OrdersService.findAllAdmin customer', () => {
  it('returns the customer\'s id, phone and name', async () => {
    const { service } = setup([order('a', { id: 'u-123', phone: '+919876543210', name: 'Asha' })]);
    const { items } = await service.findAllAdmin({} as any, new Date('2026-11-23T12:00:00Z'));
    expect(items[0].customer).toEqual({ id: 'u-123', phone: '+919876543210', name: 'Asha' });
  });

  it('asks the database for the id (so it is really read, not just echoed)', async () => {
    const { service, findMany } = setup([]);
    await service.findAllAdmin({} as any, new Date('2026-11-23T12:00:00Z'));
    expect((findMany.mock.calls[0] as any[])[0].include.user.select).toEqual({ id: true, phone: true, name: true });
  });

  it('has no customer for an order without a user record', async () => {
    const { service } = setup([order('b', null)]);
    expect((await service.findAllAdmin({} as any, new Date())).items[0].customer).toBeNull();
  });
});
