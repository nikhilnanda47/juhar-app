import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

function setup(currentStatus: string) {
  const tx = {
    order: {
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'order-1', publicNumber: 'JUH-20261122-0001', status: data.status, items: [], shipments: [] }),
      ),
    },
    shipment: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({}) },
    inventoryReservation: { findMany: jest.fn().mockResolvedValue([{ id: 'res-1' }, { id: 'res-2' }]) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    order: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: currentStatus }) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const inventory = {
    commitOrderReservations: jest.fn().mockResolvedValue(undefined),
    settleShipment: jest.fn().mockResolvedValue(undefined),
    releaseReservation: jest.fn().mockResolvedValue(undefined),
  };
  return { tx, prisma, inventory, service: new OrdersService(prisma as any, inventory as any) };
}

const changeTo = (service: OrdersService, status: string, extra: Record<string, unknown> = {}) =>
  service.updateStatus('order-1', { status, ...extra } as any, 'admin-1');

describe('OrdersService.updateStatus and stock', () => {
  it('commits the order\'s stock holds when it is confirmed', async () => {
    const { service, inventory, tx } = setup('placed');
    await changeTo(service, 'confirmed');

    expect(inventory.commitOrderReservations).toHaveBeenCalledWith(tx, 'order-1');
    expect(inventory.settleShipment).not.toHaveBeenCalled();
    expect(inventory.releaseReservation).not.toHaveBeenCalled();
  });

  it('does not touch stock when the order is packed', async () => {
    const { service, inventory } = setup('confirmed');
    await changeTo(service, 'packed');

    expect(inventory.commitOrderReservations).not.toHaveBeenCalled();
    expect(inventory.settleShipment).not.toHaveBeenCalled();
    expect(inventory.releaseReservation).not.toHaveBeenCalled();
  });

  describe('shipping', () => {
    it('takes the units off the shelf before recording the shipment', async () => {
      const { service, inventory, tx } = setup('packed');
      await changeTo(service, 'shipped', { trackingId: 'TRK1', courierName: 'Delhivery' });

      expect(inventory.settleShipment).toHaveBeenCalledWith(tx, 'order-1');
      expect(tx.shipment.create).toHaveBeenCalledWith({
        data: { orderId: 'order-1', carrier: 'Delhivery', trackingId: 'TRK1', status: 'in_transit' },
      });
      expect(inventory.settleShipment.mock.invocationCallOrder[0]).toBeLessThan(tx.shipment.create.mock.invocationCallOrder[0]);
    });

    it('still settles stock when no tracking ID is given', async () => {
      const { service, inventory, tx } = setup('packed');
      await changeTo(service, 'shipped');
      expect(inventory.settleShipment).toHaveBeenCalledTimes(1);
      expect(tx.shipment.create).not.toHaveBeenCalled();
    });

    it('changes nothing else when the stock cannot be settled', async () => {
      const { service, inventory, tx } = setup('packed');
      inventory.settleShipment.mockRejectedValue(new ConflictException('STOCK_MISMATCH: SKU-1 has 1 on hand but the order needs 2.'));

      await expect(changeTo(service, 'shipped', { trackingId: 'TRK1' })).rejects.toThrow('STOCK_MISMATCH');

      expect(tx.shipment.create).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.auditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelling', () => {
    it.each(['placed', 'confirmed'])('gives back every active hold of a %s order', async (from) => {
      const { service, inventory, tx } = setup(from);
      await changeTo(service, 'cancelled', { reason: 'Customer unreachable' });

      expect(tx.inventoryReservation.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: { in: ['held', 'committed'] } },
      });
      expect(inventory.releaseReservation).toHaveBeenCalledWith(tx, 'res-1');
      expect(inventory.releaseReservation).toHaveBeenCalledWith(tx, 'res-2');
    });

    it('stores the reason on the order together with the cancel time', async () => {
      const { service, tx } = setup('placed');
      await changeTo(service, 'cancelled', { reason: 'Customer unreachable' });

      expect(tx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'cancelled', cancellationReason: 'Customer unreachable', cancelledAt: expect.any(Date) }),
        }),
      );
    });

    it('trims spaces around the reason', async () => {
      const { service, tx } = setup('placed');
      await changeTo(service, 'cancelled', { reason: '  Out of stock  ' });
      expect(tx.order.update.mock.calls[0][0].data.cancellationReason).toBe('Out of stock');
    });

    it.each([[undefined], [''], ['   ']])('refuses a cancellation with the reason %p, before reading or changing anything', async (reason) => {
      const { service, prisma, inventory } = setup('placed');

      await expect(changeTo(service, 'cancelled', { reason })).rejects.toThrow('A cancellation reason is required');

      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(inventory.releaseReservation).not.toHaveBeenCalled();
    });

    it('records the reason in the audit entry', async () => {
      const { service, tx } = setup('confirmed');
      await changeTo(service, 'cancelled', { reason: 'Customer unreachable' });

      expect(tx.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          beforeState: { status: 'confirmed' },
          afterState: { status: 'cancelled', reason: 'Customer unreachable' },
        }),
      });
    });
  });

  it('does not store a cancellation reason for other status changes', async () => {
    const { service, tx } = setup('placed');
    await changeTo(service, 'confirmed', { reason: 'ignored' });
    expect(tx.order.update.mock.calls[0][0].data).not.toHaveProperty('cancellationReason');
  });

  describe('rules', () => {
    it('refuses a change the state machine does not allow, before any stock is touched', async () => {
      const { service, inventory, prisma } = setup('placed');
      await expect(changeTo(service, 'shipped')).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(inventory.settleShipment).not.toHaveBeenCalled();
    });

    it('refuses to cancel an order that is already shipped', async () => {
      const { service, inventory, prisma } = setup('shipped');
      await expect(changeTo(service, 'cancelled', { reason: 'Too late' })).rejects.toThrow('Cannot transition from "shipped" to "cancelled"');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(inventory.releaseReservation).not.toHaveBeenCalled();
    });

    it('fails for an order that does not exist', async () => {
      const { service, prisma } = setup('placed');
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(changeTo(service, 'confirmed')).rejects.toThrow(NotFoundException);
    });

    it('records who changed the status, from what and to what', async () => {
      const { service, tx } = setup('placed');
      await changeTo(service, 'confirmed');

      expect(tx.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'order.status_changed',
          entityType: 'order',
          entityId: 'order-1',
          actorType: 'admin',
          actorId: 'admin-1',
          beforeState: { status: 'placed' },
          afterState: { status: 'confirmed' },
        }),
      });
    });
  });
});
