import { NotFoundException } from '@nestjs/common';
import { testMedia } from '../media/test-media';
import { OrdersService } from './orders.service';

// The admin's order page: what to pack, where to send it, who to call, what to collect, and the history.
const T = (iso: string) => new Date(iso);

function order(over: any = {}) {
  return {
    id: 'o1', publicNumber: 'JUH-00000042', status: 'shipped', paymentMode: 'cod', paymentStatus: 'cod_pending',
    subtotalPaise: 650000, shippingPaise: 0, taxPaise: 0, discountPaise: 0, totalPaise: 650000,
    notes: null, cancellationReason: null,
    addressSnapshot: { recipientName: 'Priya Mohanty', recipientPhone: '+919123456789', line1: '12 Station Road', city: 'Sambalpur', district: 'Sambalpur', state: 'Odisha', pinCode: '768001' },
    createdAt: T('2026-11-24T05:00:00Z'), confirmedAt: T('2026-11-24T06:00:00Z'), packedAt: T('2026-11-24T08:00:00Z'),
    shippedAt: T('2026-11-25T04:00:00Z'), deliveredAt: null, cancelledAt: null,
    user: { id: 'u1', phone: '+919876500000', name: 'Priya' },
    items: [
      { id: 'i1', productTitle: 'Bomkai Silk', variantName: null, sku: 'BS-RED', qty: 2, unitPricePaise: 250000, totalPaise: 500000, variant: { color: 'Red' } },
      { id: 'i2', productTitle: 'Cotton Ikat', variantName: 'Large', sku: 'CI-BLU', qty: 1, unitPricePaise: 150000, totalPaise: 150000, variant: null },
    ],
    shipments: [{ id: 's1', carrier: 'DTDC', trackingId: 'D123', status: 'in_transit', dispatchedAt: null, deliveredAt: null }],
    payments: [],
    ...over,
  };
}
const audit = (status: string, actorId: string | null, at: string) =>
  ({ action: 'order.status_changed', actorId, afterState: { status }, createdAt: T(at) });

// The audit trail holds the acting person's USER id; the admin record is matched by phone.
// `people` are [userId, phone, userName]; `admins` are [phone, name, role].
function setup(o: any, events: any[] = [], people: [string, string, string | null][] = [], admins: [string, string, string][] = []) {
  const prisma = {
    order: { findUnique: jest.fn(async () => o) },
    auditEvent: { findMany: jest.fn(async () => events) },
    user: { findMany: jest.fn(async () => people.map(([id, phone, name]) => ({ id, phone, name }))) },
    adminUser: { findMany: jest.fn(async () => admins.map(([phone, name, role]) => ({ phone, name, role }))) },
  };
  return { service: new OrdersService(prisma as any, {} as any, testMedia()), prisma };
}
const NOW = T('2026-11-25T10:00:00Z');

describe('OrdersService.findOneAdmin', () => {
  it('gives what is needed to pack and ship: items with colour and SKU, the address, the customer, what to collect', async () => {
    const { service } = setup(order());
    const d = await service.findOneAdmin('o1', NOW);
    expect(d.items.map((i) => [i.productTitle, i.color, i.variantName, i.sku, i.qty])).toEqual([
      ['Bomkai Silk', 'Red', null, 'BS-RED', 2],
      ['Cotton Ikat', null, 'Large', 'CI-BLU', 1],
    ]);
    expect(d.address.line1).toBe('12 Station Road');
    expect(d.address.pinCode).toBe('768001');
    expect(d.customer).toEqual({ id: 'u1', phone: '+919876500000', name: 'Priya' });
    expect(d.paymentMode).toBe('cod');
    expect(d.totalPaise).toBe(650000);
    expect(d.shipments[0]).toMatchObject({ carrier: 'DTDC', trackingId: 'D123' });
  });

  it('is "not found" for an order that does not exist', async () => {
    const { service } = setup(null);
    await expect(service.findOneAdmin('nope', NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('has no customer for an order without a user record', async () => {
    const { service } = setup(order({ user: null }));
    expect((await service.findOneAdmin('o1', NOW)).customer).toBeNull();
  });

  describe('history', () => {
    it('lists placed, then each step in time order, naming the admin who did it', async () => {
      const { service } = setup(
        order(),
        [audit('confirmed', 'u-owner', '2026-11-24T06:00:00Z'), audit('packed', 'u-packer', '2026-11-24T08:00:00Z'), audit('shipped', 'u-packer', '2026-11-25T04:00:00Z')],
        [['u-owner', '+911', 'login name 1'], ['u-packer', '+912', null]],
        [['+911', 'Owner One', 'owner'], ['+912', 'Packer Two', 'fulfillment_operator']],
      );
      const h = (await service.findOneAdmin('o1', NOW)).history;
      expect(h.map((e) => e.status)).toEqual(['placed', 'confirmed', 'packed', 'shipped']);
      expect(h[0].by).toBeNull(); // the customer placed it
      expect(h[1].by).toEqual({ name: 'Owner One', role: 'owner' });
      expect(h[3].by).toEqual({ name: 'Packer Two', role: 'fulfillment_operator' });
    });

    it('still shows the steps of an old order that has no audit rows (no names)', async () => {
      const { service } = setup(order());
      const h = (await service.findOneAdmin('o1', NOW)).history;
      expect(h.map((e) => e.status)).toEqual(['placed', 'confirmed', 'packed', 'shipped']);
      expect(h.every((e) => e.by === null)).toBe(true);
    });

    it('shows the reason on a cancelled order, and no admin when the customer cancelled', async () => {
      const { service } = setup(order({
        status: 'cancelled', confirmedAt: null, packedAt: null, shippedAt: null,
        cancelledAt: T('2026-11-24T07:00:00Z'), cancellationReason: 'Customer unreachable',
      }));
      const h = (await service.findOneAdmin('o1', NOW)).history;
      expect(h.map((e) => e.status)).toEqual(['placed', 'cancelled']);
      expect(h[1]).toMatchObject({ reason: 'Customer unreachable', by: null });
    });

    it('names a person who is no longer an admin from their login (name, else phone)', async () => {
      const { service } = setup(
        order({ shippedAt: null, packedAt: null }),
        [audit('confirmed', 'u-gone', '2026-11-24T06:00:00Z')],
        [['u-gone', '+913', null]], // logged in before, has no admin record now
        [],
      );
      const confirmed = (await service.findOneAdmin('o1', NOW)).history.find((e) => e.status === 'confirmed')!;
      expect(confirmed.by).toEqual({ name: '+913', role: '' });
    });

    it('does not look anyone up when the audit trail has no actor', async () => {
      const { service, prisma } = setup(order(), [audit('confirmed', null, '2026-11-24T06:00:00Z')]);
      await service.findOneAdmin('o1', NOW);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.adminUser.findMany).not.toHaveBeenCalled();
    });
  });

  it('says how long a placed order has been waiting, and whether it is overdue', async () => {
    const { service } = setup(order({ status: 'placed', confirmedAt: null, packedAt: null, shippedAt: null, createdAt: T('2026-11-24T05:00:00Z') }));
    const d = await service.findOneAdmin('o1', NOW);
    expect(d.waitingMinutes).toBe(29 * 60);
    expect(d.overdue).toBe(true); // COD, placed more than 24 hours ago
  });
});
