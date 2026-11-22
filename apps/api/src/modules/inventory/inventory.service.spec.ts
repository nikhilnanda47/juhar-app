import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
      update: jest.fn().mockResolvedValue({}),
    },
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
    const current = { variantId: 'v1', onHand: 10, reserved: 3, unavailable: 2, version: 4 };
    const dto = (adjustment: number) => ({ variantId: 'v1', adjustment, reason: 'received', notes: 'new batch' }) as any;

    it('fails when the variant has no stock row', async () => {
      await expect(newService(makePrisma(null)).adjustStock(dto(1), 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('refuses to drop below what is already reserved or unavailable', async () => {
      const prisma = makePrisma(current);
      await expect(newService(prisma).adjustStock(dto(-6), 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(newService(prisma).adjustStock(dto(-6), 'admin-1')).rejects.toThrow('STOCK_WOULD_GO_NEGATIVE');
      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(prisma.auditEvent.create).not.toHaveBeenCalled();
    });

    it('allows going down to exactly reserved + unavailable', async () => {
      const prisma = makePrisma(current);
      prisma.inventory.update.mockResolvedValue({ ...current, onHand: 5, version: 5 });
      await expect(newService(prisma).adjustStock(dto(-5), 'admin-1')).resolves.toMatchObject({ onHand: 5, available: 0 });
    });

    it('updates on-hand, bumps the version and writes an audit entry', async () => {
      const prisma = makePrisma(current);
      prisma.inventory.update.mockResolvedValue({ ...current, onHand: 15, version: 5 });

      const result = await newService(prisma).adjustStock(dto(5), 'admin-1');

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'v1' },
        data: { onHand: 15, version: { increment: 1 } },
      });
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
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

  describe('stock settlement (not built yet)', () => {
    it.todo('commits the reservation when an order is confirmed');
    it.todo('takes the units off on-hand when an order ships');
  });
});
