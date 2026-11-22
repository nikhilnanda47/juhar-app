import { Logger } from '@nestjs/common';
import { ReservationExpiryCron } from './reservation-expiry.cron';

const held = (id: string, variantId: string, qty: number) => ({ id, variantId, qty, status: 'held', expiresAt: new Date(0) });

function setup(expired: unknown[]) {
  const tx = {
    inventory: { update: jest.fn().mockResolvedValue({}) },
    inventoryReservation: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    inventoryReservation: { findMany: jest.fn().mockResolvedValue(expired) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, prisma, cron: new ReservationExpiryCron(prisma as any) };
}

describe('ReservationExpiryCron', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('looks only at held reservations whose expiry time has passed', async () => {
    const { prisma, cron } = setup([]);
    await cron.handleExpiredReservations();

    expect(prisma.inventoryReservation.findMany).toHaveBeenCalledWith({
      where: { status: 'held', expiresAt: { lt: expect.any(Date) } },
    });
  });

  it('does nothing when nothing has expired', async () => {
    const { prisma, cron } = setup([]);
    await cron.handleExpiredReservations();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('gives the stock back and marks each reservation expired', async () => {
    const { tx, cron } = setup([held('r1', 'v1', 2), held('r2', 'v2', 1)]);
    await cron.handleExpiredReservations();

    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'v1' },
      data: { reserved: { decrement: 2 }, version: { increment: 1 } },
    });
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { variantId: 'v2' },
      data: { reserved: { decrement: 1 }, version: { increment: 1 } },
    });
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'expired' } });
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith({ where: { id: 'r2' }, data: { status: 'expired' } });
  });

  it('handles every reservation in its own transaction', async () => {
    const { prisma, cron } = setup([held('r1', 'v1', 1), held('r2', 'v2', 1), held('r3', 'v3', 1)]);
    await cron.handleExpiredReservations();
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('keeps going when one reservation fails', async () => {
    const { prisma, tx, cron } = setup([held('r1', 'v1', 1), held('r2', 'v2', 1)]);
    prisma.$transaction.mockRejectedValueOnce(new Error('boom'));

    await cron.handleExpiredReservations();

    expect(tx.inventoryReservation.update).toHaveBeenCalledTimes(1);
    expect(tx.inventoryReservation.update).toHaveBeenCalledWith({ where: { id: 'r2' }, data: { status: 'expired' } });
  });

  describe('not built yet', () => {
    it.todo('leaves the stock hold alone for orders that are still active');
  });
});
