import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

interface StockRow {
  on_hand: number;
  reserved: number;
  unavailable: number;
}

function makeTx(rows: StockRow[] = []) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(rows),
    inventory: { update: jest.fn().mockResolvedValue({}) },
    inventoryReservation: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'res-1', ...data })),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    orderItem: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function makePrisma(inventoryRow: unknown) {
  return {
    inventory: {
      findUnique: jest.fn().mockResolvedValue(inventoryRow),
      findMany: jest.fn().mockResolvedValue(inventoryRow ? [inventoryRow] : []),
      update: jest.fn(),
    },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
  };
}

const newService = (prisma: unknown = {}) => new InventoryService(prisma as any);
const asTx = (tx: unknown) => tx as any;
const expiresAt = new Date('2026-12-01T00:00:00Z');

describe('InventoryService', () => {
  describe('reserve', () => {
    it('locks the stock row before changing anything', async () => {
      const tx = makeTx([{ on_hand: 5, reserved: 0, unavailable: 0 }]);
      await newService().reserve(asTx(tx), 'variant-1', 1, expiresAt);

      const [sql, ...values] = tx.$queryRaw.mock.calls[0];
      expect((sql as TemplateStringsArray).join('?')).toContain('FOR UPDATE');
      expect(values).toContain('variant-1');
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.inventory.update.mock.invocationCallOrder[0],
      );
    });

    it('logs a warning with the numbers when there is not enough stock', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const tx = makeTx([{ on_hand: 2, reserved: 1, unavailable: 0 }]);
      await expect(newService().reserve(asTx(tx), 'variant-1', 3, expiresAt)).rejects.toThrow('INSUFFICIENT_STOCK');
      expect(warn).toHaveBeenCalledWith('insufficient stock variant=variant-1 requested=3 available=1');
      warn.mockRestore();
    });

    it('logs nothing when the stock is there', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      await newService().reserve(asTx(makeTx([{ on_hand: 5, reserved: 0, unavailable: 0 }])), 'variant-1', 1, expiresAt);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('fails when the variant has no stock row', async () => {
      const tx = makeTx([]);
      await expect(newService().reserve(asTx(tx), 'missing', 1, expiresAt)).rejects.toThrow(NotFoundException);
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('refuses to oversell and changes nothing', async () => {
      const tx = makeTx([{ on_hand: 2, reserved: 0, unavailable: 0 }]);
      const attempt = newService().reserve(asTx(tx), 'variant-1', 3, expiresAt);

      await expect(attempt).rejects.toThrow(ConflictException);
      await expect(attempt).rejects.toThrow('INSUFFICIENT_STOCK');
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventoryReservation.create).not.toHaveBeenCalled();
    });

    it('allows reserving exactly what is available', async () => {
      const tx = makeTx([{ on_hand: 3, reserved: 0, unavailable: 0 }]);
      await expect(newService().reserve(asTx(tx), 'variant-1', 3, expiresAt)).resolves.toBeDefined();
    });

    it('does not count reserved or unavailable units as available', async () => {
      const row = { on_hand: 5, reserved: 3, unavailable: 1 };
      await expect(newService().reserve(asTx(makeTx([row])), 'v', 1, expiresAt)).resolves.toBeDefined();
      await expect(newService().reserve(asTx(makeTx([row])), 'v', 2, expiresAt)).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('adds the quantity to reserved, bumps the version and records a held reservation', async () => {
      const tx = makeTx([{ on_hand: 10, reserved: 0, unavailable: 0 }]);
      const reservation = await newService().reserve(asTx(tx), 'variant-1', 4, expiresAt);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        data: { reserved: { increment: 4 }, version: { increment: 1 } },
      });
      expect(tx.inventoryReservation.create).toHaveBeenCalledWith({
        data: { variantId: 'variant-1', qty: 4, expiresAt, status: 'held' },
      });
      expect(reservation).toMatchObject({ id: 'res-1', status: 'held', qty: 4 });
    });
  });

  describe('releaseReservation', () => {
    it.each(['held', 'committed'])('returns the stock of a %s reservation and marks it released', async (status) => {
      const tx = makeTx();
      tx.inventoryReservation.findUnique.mockResolvedValue({ id: 'res-1', variantId: 'variant-1', qty: 2, status });

      await newService().releaseReservation(asTx(tx), 'res-1');

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        data: { reserved: { decrement: 2 }, version: { increment: 1 } },
      });
      expect(tx.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'released' },
      });
    });

    it.each(['released', 'expired'])('refuses to release a %s reservation again', async (status) => {
      const tx = makeTx();
      tx.inventoryReservation.findUnique.mockResolvedValue({ id: 'res-1', variantId: 'v', qty: 2, status });

      await expect(newService().releaseReservation(asTx(tx), 'res-1')).rejects.toThrow('RESERVATION_ALREADY_PROCESSED');
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('fails when the reservation does not exist', async () => {
      const tx = makeTx();
      tx.inventoryReservation.findUnique.mockResolvedValue(null);
      await expect(newService().releaseReservation(asTx(tx), 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('commitReservation', () => {
    it('marks a held reservation committed and links the order', async () => {
      const tx = makeTx();
      tx.inventoryReservation.findUnique.mockResolvedValue({ id: 'res-1', status: 'held' });

      await newService().commitReservation(asTx(tx), 'res-1', 'order-9');

      expect(tx.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'committed', orderId: 'order-9' },
      });
    });

    it.each(['committed', 'released', 'expired'])('refuses a %s reservation', async (status) => {
      const tx = makeTx();
      tx.inventoryReservation.findUnique.mockResolvedValue({ id: 'res-1', status });
      await expect(newService().commitReservation(asTx(tx), 'res-1', 'order-9')).rejects.toThrow(ConflictException);
    });
  });

  describe('adjustStock', () => {
    // the stock row as the locked read returns it (snake_case) and as the update returns it
    const row = { on_hand: 10, reserved: 3, unavailable: 2 };
    const after = (onHand: number) => ({ variantId: 'v1', onHand, reserved: 3, unavailable: 2, version: 5 });
    const add = (adjustment: number) => ({ variantId: 'v1', adjustment, reason: 'received', notes: 'new batch' }) as any;
    const count = (setTo: number) => ({ variantId: 'v1', setTo, reason: 'correction' }) as any;

    // a fake database whose transaction runs the work on one fake "tx"
    function setup(rows: StockRow[]) {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(rows),
        inventory: { update: jest.fn() },
        auditEvent: { create: jest.fn().mockResolvedValue({}) },
      };
      const prisma = { $transaction: jest.fn(async (work: any) => work(tx)) };
      return { tx, service: newService(prisma) };
    }

    it('fails when the variant has no stock row', async () => {
      const { service } = setup([]);
      await expect(service.adjustStock(add(1), 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('needs exactly one of an amount or a counted number', async () => {
      const { service, tx } = setup([row]);
      await expect(service.adjustStock({ variantId: 'v1', reason: 'other' } as any, 'a')).rejects.toThrow('STOCK_CHANGE_UNCLEAR');
      await expect(service.adjustStock({ variantId: 'v1', adjustment: 1, setTo: 3, reason: 'other' } as any, 'a')).rejects.toThrow('STOCK_CHANGE_UNCLEAR');
      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it('locks the stock row before changing it, and writes the audit entry inside the same transaction', async () => {
      const { service, tx } = setup([row]);
      tx.inventory.update.mockResolvedValue(after(15));
      await service.adjustStock(add(5), 'admin-1');
      const [sql] = tx.$queryRaw.mock.calls[0];
      expect((sql as TemplateStringsArray).join('?')).toContain('FOR UPDATE');
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.inventory.update.mock.invocationCallOrder[0]);
      expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
    });

    it('refuses to drop below what is already reserved or unavailable', async () => {
      const { service, tx } = setup([row]);
      await expect(service.adjustStock(add(-6), 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.adjustStock(add(-6), 'admin-1')).rejects.toThrow('STOCK_WOULD_GO_NEGATIVE');
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.auditEvent.create).not.toHaveBeenCalled();
    });

    it('allows going down to exactly reserved + unavailable', async () => {
      const { service, tx } = setup([row]);
      tx.inventory.update.mockResolvedValue(after(5));
      await expect(service.adjustStock(add(-5), 'admin-1')).resolves.toMatchObject({ onHand: 5, available: 0 });
    });

    it('refuses a change that changes nothing (zero, or a count equal to the stock)', async () => {
      const { service, tx } = setup([row]);
      await expect(service.adjustStock(add(0), 'admin-1')).rejects.toThrow('STOCK_NO_CHANGE');
      await expect(service.adjustStock(count(10), 'admin-1')).rejects.toThrow('STOCK_NO_CHANGE');
      expect(tx.inventory.update).not.toHaveBeenCalled();
    });

    it('updates on-hand, bumps the version and writes an audit entry', async () => {
      const { service, tx } = setup([row]);
      tx.inventory.update.mockResolvedValue(after(15));

      const result = await service.adjustStock(add(5), 'admin-1');

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'v1' },
        data: { onHand: 15, version: { increment: 1 } },
      });
      expect(tx.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'inventory.adjusted',
          entityType: 'inventory',
          entityId: 'v1',
          actorType: 'admin',
          actorId: 'admin-1',
          beforeState: { onHand: 10 },
          afterState: { onHand: 15, adjustment: 5, reason: 'received', notes: 'new batch' },
        }),
      });
      expect(result).toEqual({ variantId: 'v1', onHand: 15, reserved: 3, unavailable: 2, available: 10, version: 5 });
    });

    it('a counted number is worked out against the locked stock, and the change is recorded', async () => {
      const { service, tx } = setup([{ on_hand: 12, reserved: 3, unavailable: 2 }]); // 12 now, not the 10 the admin saw
      tx.inventory.update.mockResolvedValue(after(7));
      await service.adjustStock(count(7), 'admin-1');
      expect(tx.inventory.update).toHaveBeenCalledWith({ where: { variantId: 'v1' }, data: { onHand: 7, version: { increment: 1 } } });
      expect(tx.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          beforeState: { onHand: 12 },
          afterState: expect.objectContaining({ onHand: 7, adjustment: -5, setTo: 7 }),
        }),
      });
    });

    it('a counted number below the reserved stock is refused', async () => {
      const { service } = setup([row]);
      await expect(service.adjustStock(count(4), 'admin-1')).rejects.toThrow('STOCK_WOULD_GO_NEGATIVE'); // reserved 3 + unavailable 2 = 5
    });
  });

  describe('getAdjustmentHistory', () => {
    const event = (over: any) => ({
      id: 'e1', createdAt: new Date('2026-11-25T10:00:00Z'), actorId: 'u1',
      beforeState: { onHand: 10 }, afterState: { onHand: 15, adjustment: 5, reason: 'received', notes: 'new batch' }, ...over,
    });
    function setup(events: any[], users: any[] = [], admins: any[] = []) {
      const prisma = {
        auditEvent: { findMany: jest.fn().mockResolvedValue(events) },
        // each login comes with its admin record (matched here by phone, standing in for admin_users.user_id)
        user: {
          findMany: jest.fn().mockResolvedValue(
            users.map((u: any) => {
              const admin = admins.find((a: any) => a.phone === u.phone);
              return { ...u, adminUser: admin ? { name: admin.name, role: admin.role } : null };
            }),
          ),
        },
      };
      return { prisma, service: newService(prisma) };
    }

    it('lists the changes newest first with who made them', async () => {
      const { service, prisma } = setup([event({})], [{ id: 'u1', phone: '+911', name: null }], [{ phone: '+911', name: 'Owner One', role: 'owner' }]);
      const [h] = await service.getAdjustmentHistory('v1');
      expect(h).toMatchObject({ adjustment: 5, onHandBefore: 10, onHandAfter: 15, reason: 'received', notes: 'new batch', by: { name: 'Owner One', role: 'owner' } });
      const args = (prisma.auditEvent.findMany.mock.calls[0] as any[])[0];
      expect(args.where).toEqual({ entityType: 'inventory', entityId: 'v1', action: 'inventory.adjusted' });
      expect(args.orderBy[0]).toEqual({ createdAt: 'desc' });
    });

    it('has no name when the actor is unknown', async () => {
      const { service } = setup([event({ actorId: null })]);
      expect((await service.getAdjustmentHistory('v1'))[0].by).toBeNull();
    });

    it('never asks for more than 50 at a time', async () => {
      const { service, prisma } = setup([]);
      await service.getAdjustmentHistory('v1', 5000);
      expect((prisma.auditEvent.findMany.mock.calls[0] as any[])[0].take).toBe(50);
    });
  });

  describe('reading stock', () => {
    it('reports available as on-hand minus reserved minus unavailable', async () => {
      const prisma = makePrisma({ variantId: 'v1', onHand: 10, reserved: 3, unavailable: 2, version: 1 });
      await expect(newService(prisma).getStock('v1')).resolves.toMatchObject({ available: 5 });
      await expect(newService(prisma).getStockBulk(['v1'])).resolves.toEqual([expect.objectContaining({ available: 5 })]);
    });

    it('fails for an unknown variant', async () => {
      await expect(newService(makePrisma(null)).getStock('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('commitOrderReservations', () => {
    it('turns every held reservation of the order into committed', async () => {
      const tx = makeTx();
      await newService().commitOrderReservations(asTx(tx), 'order-1');
      expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: 'held' },
        data: { status: 'committed' },
      });
    });
  });

  describe('settleShipment', () => {
    const line = (variantId: string, qty: number) => ({ variantId, qty, sku: `SKU-${variantId}` });
    const hold = (id: string, variantId: string, qty: number, status = 'held') => ({ id, variantId, qty, status });

    function shipping(onHand: number, lines: unknown[], holds: unknown[]) {
      const tx = makeTx([{ on_hand: onHand, reserved: 0, unavailable: 0 }]);
      tx.orderItem.findMany.mockResolvedValue(lines);
      tx.inventoryReservation.findMany.mockResolvedValue(holds);
      return tx;
    }

    it('takes the shipped units off on-hand, gives back the matching hold and marks it fulfilled', async () => {
      const tx = shipping(10, [line('v1', 2)], [hold('r1', 'v1', 2)]);
      await newService().settleShipment(asTx(tx), 'order-1');

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'v1' },
        data: { onHand: { decrement: 2 }, reserved: { decrement: 2 }, version: { increment: 1 } },
      });
      expect(tx.inventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r1'] } },
        data: { status: 'fulfilled' },
      });
    });

    it('considers held and committed holds of this order only', async () => {
      const tx = shipping(10, [line('v1', 1)], [hold('r1', 'v1', 1, 'committed')]);
      await newService().settleShipment(asTx(tx), 'order-1');
      expect(tx.inventoryReservation.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: { in: ['held', 'committed'] } },
      });
    });

    it('locks the stock row before changing it', async () => {
      const tx = shipping(10, [line('v1', 1)], [hold('r1', 'v1', 1)]);
      await newService().settleShipment(asTx(tx), 'order-1');

      expect((tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?')).toContain('FOR UPDATE');
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.inventory.update.mock.invocationCallOrder[0]);
    });

    it('settles each order line separately', async () => {
      const tx = shipping(10, [line('v1', 2), line('v2', 3)], [hold('r1', 'v1', 2), hold('r2', 'v2', 3)]);
      await newService().settleShipment(asTx(tx), 'order-1');

      expect(tx.inventory.update).toHaveBeenCalledTimes(2);
      expect(tx.inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { variantId: 'v2' }, data: expect.objectContaining({ onHand: { decrement: 3 }, reserved: { decrement: 3 } }) }));
    });

    it('only gives back what was still held when the hold was already expired or released', async () => {
      const tx = shipping(10, [line('v1', 2)], []);
      await newService().settleShipment(asTx(tx), 'order-1');

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'v1' },
        data: { onHand: { decrement: 2 }, reserved: { decrement: 0 }, version: { increment: 1 } },
      });
      expect(tx.inventoryReservation.updateMany).not.toHaveBeenCalled();
    });

    it('allows shipping exactly what is on hand', async () => {
      const tx = shipping(2, [line('v1', 2)], [hold('r1', 'v1', 2)]);
      await expect(newService().settleShipment(asTx(tx), 'order-1')).resolves.toBeUndefined();
      expect(tx.inventory.update).toHaveBeenCalledTimes(1);
    });

    it('refuses to ship more than is on hand and changes nothing for that line', async () => {
      const tx = shipping(1, [line('v1', 2)], [hold('r1', 'v1', 2)]);
      const attempt = newService().settleShipment(asTx(tx), 'order-1');

      await expect(attempt).rejects.toThrow(ConflictException);
      await expect(attempt).rejects.toThrow('STOCK_MISMATCH');
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventoryReservation.updateMany).not.toHaveBeenCalled();
    });

    it('logs a warning with the numbers when the shelf count is too low to ship', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const tx = shipping(1, [line('v1', 2)], [hold('r1', 'v1', 2)]);
      await expect(newService().settleShipment(asTx(tx), 'order-1')).rejects.toThrow('STOCK_MISMATCH');
      expect(warn).toHaveBeenCalledWith('STOCK_MISMATCH sku=SKU-v1 on_hand=1 needed=2');
      warn.mockRestore();
    });

    it('treats a missing stock row as nothing on hand', async () => {
      const tx = shipping(0, [line('v1', 1)], []);
      tx.$queryRaw.mockResolvedValue([]);
      await expect(newService().settleShipment(asTx(tx), 'order-1')).rejects.toThrow('STOCK_MISMATCH');
    });
  });
});
