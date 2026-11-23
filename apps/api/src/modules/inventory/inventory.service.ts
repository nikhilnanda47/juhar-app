import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto } from './dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get stock for a single variant.
   */
  async getStock(variantId: string) {
    const inv = await this.prisma.inventory.findUnique({ where: { variantId } });
    if (!inv) throw new NotFoundException('VARIANT_NOT_FOUND');
    return this.toStockResponse(inv);
  }

  /**
   * Get stock for multiple variants (batch lookup for cart/catalog).
   */
  async getStockBulk(variantIds: string[]) {
    const items = await this.prisma.inventory.findMany({
      where: { variantId: { in: variantIds } },
    });
    return items.map((inv) => this.toStockResponse(inv));
  }

  /**
   * Admin: adjust stock (add/remove).
   * Validates that on_hand + adjustment >= reserved + unavailable.
   */
  async adjustStock(dto: AdjustStockDto, adminId: string) {
    const inv = await this.prisma.inventory.findUnique({
      where: { variantId: dto.variantId },
    });
    if (!inv) throw new NotFoundException('VARIANT_NOT_FOUND');

    const newOnHand = inv.onHand + dto.adjustment;
    if (newOnHand < inv.reserved + inv.unavailable) {
      throw new BadRequestException('STOCK_WOULD_GO_NEGATIVE');
    }

    const updated = await this.prisma.inventory.update({
      where: { variantId: dto.variantId },
      data: {
        onHand: newOnHand,
        version: { increment: 1 },
      },
    });

    // Audit log
    await this.prisma.auditEvent.create({
      data: {
        action: 'inventory.adjusted',
        entityType: 'inventory',
        entityId: dto.variantId,
        actorType: 'admin',
        actorId: adminId,
        beforeState: { onHand: inv.onHand } as any,
        afterState: { onHand: updated.onHand, adjustment: dto.adjustment, reason: dto.reason, notes: dto.notes } as any,
      },
    });

    return this.toStockResponse(updated);
  }

  /**
   * Reserve stock atomically using SELECT FOR UPDATE.
   * Must be called inside an existing Prisma transaction.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    variantId: string,
    qty: number,
    expiresAt: Date,
  ) {
    // 1. Lock the inventory row
    const rows = await tx.$queryRaw<any[]>`
      SELECT * FROM inventory WHERE variant_id = ${variantId}::uuid FOR UPDATE
    `;
    if (rows.length === 0) throw new NotFoundException('VARIANT_NOT_FOUND');

    const inv = rows[0];
    const available = inv.on_hand - inv.reserved - inv.unavailable;

    // 2. Check availability
    if (available < qty) {
      this.logger.warn(`insufficient stock variant=${variantId} requested=${qty} available=${available}`);
      throw new ConflictException('INSUFFICIENT_STOCK');
    }

    // 3. Increment reserved count
    await tx.inventory.update({
      where: { variantId },
      data: {
        reserved: { increment: qty },
        version: { increment: 1 },
      },
    });

    // 4. Create reservation record
    return tx.inventoryReservation.create({
      data: {
        variantId,
        qty,
        expiresAt,
        status: 'held',
      },
    });
  }

  /**
   * Commit a reservation (order confirmed → stock stays reserved until fulfillment).
   */
  async commitReservation(tx: Prisma.TransactionClient, reservationId: string, orderId: string) {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (reservation.status !== 'held') {
      throw new ConflictException('RESERVATION_ALREADY_PROCESSED');
    }

    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: 'committed', orderId },
    });
  }

  /**
   * Order confirmed: every hold of this order becomes permanent ("committed")
   * and is no longer touched by the expiry job.
   */
  async commitOrderReservations(tx: Prisma.TransactionClient, orderId: string) {
    await tx.inventoryReservation.updateMany({
      where: { orderId, status: 'held' },
      data: { status: 'committed' },
    });
  }

  /**
   * Order shipped: the units leave the shelf. For each order line, on_hand goes
   * down by the quantity shipped and reserved goes down by whatever is still held
   * for it; the holds are marked fulfilled. Refuses (changing nothing) if the
   * shelf count is lower than what the order needs.
   */
  async settleShipment(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    const holds = await tx.inventoryReservation.findMany({
      where: { orderId, status: { in: ['held', 'committed'] } },
    });

    for (const item of items) {
      const rows = await tx.$queryRaw<any[]>`
        SELECT * FROM inventory WHERE variant_id = ${item.variantId}::uuid FOR UPDATE
      `;
      const onHand = rows[0]?.on_hand ?? 0;
      if (onHand < item.qty) {
        this.logger.warn(`STOCK_MISMATCH sku=${item.sku} on_hand=${onHand} needed=${item.qty}`);
        throw new ConflictException(
          `STOCK_MISMATCH: ${item.sku} has ${onHand} on hand but the order needs ${item.qty}. Correct the stock count first.`,
        );
      }

      const itemHolds = holds.filter((h) => h.variantId === item.variantId);
      const heldQty = itemHolds.reduce((sum, h) => sum + h.qty, 0);

      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          onHand: { decrement: item.qty },
          reserved: { decrement: heldQty },
          version: { increment: 1 },
        },
      });

      if (itemHolds.length > 0) {
        await tx.inventoryReservation.updateMany({
          where: { id: { in: itemHolds.map((h) => h.id) } },
          data: { status: 'fulfilled' },
        });
      }
    }
  }

  /**
   * Release a reservation (expired/cancelled → return stock to available pool).
   */
  async releaseReservation(tx: Prisma.TransactionClient, reservationId: string) {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new NotFoundException('RESERVATION_NOT_FOUND');
    if (reservation.status !== 'held' && reservation.status !== 'committed') {
      throw new ConflictException('RESERVATION_ALREADY_PROCESSED');
    }

    await tx.inventory.update({
      where: { variantId: reservation.variantId },
      data: {
        reserved: { decrement: reservation.qty },
        version: { increment: 1 },
      },
    });

    await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: 'released' },
    });
  }

  private toStockResponse(inv: any) {
    return {
      variantId: inv.variantId,
      onHand: inv.onHand,
      reserved: inv.reserved,
      unavailable: inv.unavailable,
      available: inv.onHand - inv.reserved - inv.unavailable,
      version: inv.version,
    };
  }
}
