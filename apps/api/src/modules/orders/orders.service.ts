import {
  Injectable, BadRequestException, Logger, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { indiaDayBounds } from '../../common/time/india-day';
import { resolveActors, type ActorName } from '../../common/audit/actor-names';
import { InventoryService } from '../inventory/inventory.service';
import { OrderQueryDto, AdminOrderQueryDto, UpdateOrderStatusDto, CancelOrderDto } from './dto';
import { canTransitionOrder, INVENTORY, OrderStatus, PAGINATION } from '@juhar/shared';

/** The delivery address as the checkout froze it on the order. */
export interface AddressSnapshot {
  recipientName: string;
  recipientPhone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  district: string;
  state: string;
  pinCode: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly media: MediaService,
  ) {}

  // ─────────────────────────────────────────
  // CUSTOMER ENDPOINTS
  // ─────────────────────────────────────────

  /**
   * List customer's orders, newest first.
   */
  async findMyOrders(userId: string, query: OrderQueryDto) {
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;

    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) where.status = query.status;

    const findArgs: Prisma.OrderFindManyArgs = {
      where,
      // id breaks ties, so orders created in the same instant keep one fixed order across pages
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        items: {
          select: {
            id: true, variantId: true, productTitle: true, variantName: true, sku: true,
            qty: true, unitPricePaise: true, totalPaise: true,
          },
        },
      },
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    // `total` is every order of this customer that matches the status filter (if any), whatever the
    // page; `counts` is how many orders they have in each status (filter ignored), so the apps can
    // say "12 orders" and "3 delivered" without loading them all.
    const [orders, total, byStatus] = await Promise.all([
      this.prisma.order.findMany(findArgs),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    ]);
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;

    // a small photo for each saree in the list
    const photos = await this.media.thumbnailsForVariants(items.flatMap((o: any) => (o.items ?? []).map((i: any) => i.variantId)));
    return {
      items: items.map((o) => this.toOrderSummary(o, photos)),
      cursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
      total,
      counts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])) as Record<string, number>,
    };
  }

  /**
   * Get single order detail (customer — own orders only).
   */
  async findMyOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const detail = this.toOrderDetail(order);
    // a small photo next to each saree (the colour's own photo when there is one)
    const photos = await this.media.thumbnailsForVariants(order.items.map((i: any) => i.variantId));
    return { ...detail, items: detail.items.map((item: any, n: number) => ({ ...item, imageUrl: photos.get(order.items[n].variantId) ?? null })) };
  }

  /**
   * Customer cancels their own order (only if placed or confirmed).
   */
  async cancelMyOrder(userId: string, orderId: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!canTransitionOrder(order.status as OrderStatus, OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel order in "${order.status}" status`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Release inventory reservations
      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId, status: { in: ['held', 'committed'] } },
      });
      for (const res of reservations) {
        await this.inventoryService.releaseReservation(tx, res.id);
      }

      // Update order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
        include: { items: true },
      });

      return this.toOrderDetail(updated);
    });
    this.logger.log(`order ${order.publicNumber ?? orderId} ${order.status} -> cancelled by the customer user=${userId}`);
    return result;
  }

  // ─────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ─────────────────────────────────────────

  /**
   * Admin: list all orders with search/filter.
   */
  async findAllAdmin(query: AdminOrderQueryDto, now: Date = new Date()) {
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const overdueWhere = this.overdueWhere(now);

    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { publicNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { phone: { contains: query.search } } },
      ];
    }
    if (query.overdue) where.AND = [overdueWhere];

    const findArgs: Prisma.OrderFindManyArgs = {
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        items: {
          select: { productTitle: true, qty: true, totalPaise: true },
        },
        user: { select: { id: true, phone: true, name: true } },
      },
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    // The counts cover all orders (not just this page or this filter) so the dashboard
    // and the filter button always show the real numbers.
    const today = indiaDayBounds(now);
    const [orders, placed, overdue, todayTotals] = await Promise.all([
      this.prisma.order.findMany(findArgs),
      this.prisma.order.count({ where: { status: OrderStatus.PLACED } }),
      this.prisma.order.count({ where: overdueWhere }),
      // Today (India time): orders placed today, cancelled ones left out, and their value (GMV)
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: today.start, lt: today.end },
          status: { not: OrderStatus.CANCELLED },
        },
        _count: { _all: true },
        _sum: { totalPaise: true },
      }),
    ]);
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;

    return {
      items: items.map((o: any) => ({
        ...this.toOrderSummary(o),
        // id is the same "user=<id>" that the logs show, so a log line can be matched to a customer
        customer: o.user ? { id: o.user.id, phone: o.user.phone, name: o.user.name } : null,
        ...this.waitingInfo(o, now),
      })),
      cursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
      counts: {
        placed,
        overdue,
        today: {
          date: today.date,
          orders: todayTotals._count._all,
          gmvPaise: todayTotals._sum.totalPaise ?? 0,
        },
      },
    };
  }

  /**
   * Admin: one order with everything needed to pack and ship it: what to pack, where it goes, who the
   * customer is, what to collect, and who did what when.
   */
  async findOneAdmin(orderId: string, now: Date = new Date()) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { select: { color: true } } }, orderBy: { createdAt: 'asc' } },
        shipments: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, phone: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // who changed the status (see common/audit/actor-names.ts for why this goes through the user id)
    const audit = await this.prisma.auditEvent.findMany({
      where: { entityType: 'order', entityId: orderId, action: 'order.status_changed' },
      orderBy: { createdAt: 'asc' },
    });
    const actors = await resolveActors(this.prisma, audit.map((a: any) => a.actorId));
    const photos = await this.media.thumbnailsForVariants(order.items.map((i: any) => i.variantId));
    return {
      id: order.id,
      publicNumber: order.publicNumber,
      status: order.status,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      subtotalPaise: order.subtotalPaise,
      shippingPaise: order.shippingPaise,
      taxPaise: order.taxPaise,
      discountPaise: order.discountPaise,
      totalPaise: order.totalPaise,
      notes: order.notes,
      createdAt: order.createdAt,
      cancellationReason: order.cancellationReason,
      // the address the customer chose at checkout, frozen on the order (editing a saved address does not change it)
      address: order.addressSnapshot as unknown as AddressSnapshot,
      customer: order.user ? { id: order.user.id, phone: order.user.phone, name: order.user.name } : null,
      items: order.items.map((i: any) => ({
        id: i.id,
        productTitle: i.productTitle,
        variantName: i.variantName,
        color: i.variant?.color ?? null,
        imageUrl: photos.get(i.variantId) ?? null,
        sku: i.sku,
        qty: i.qty,
        unitPricePaise: i.unitPricePaise,
        totalPaise: i.totalPaise,
      })),
      shipments: order.shipments.map((s: any) => ({
        id: s.id,
        carrier: s.carrier,
        trackingId: s.trackingId,
        status: s.status,
        dispatchedAt: s.dispatchedAt,
        deliveredAt: s.deliveredAt,
      })),
      payments: order.payments.map((p: any) => ({
        id: p.id,
        gateway: p.gateway,
        method: p.method,
        status: p.status,
        amountPaise: p.amountPaise,
        paidAt: p.paidAt,
      })),
      history: this.orderHistory(order, audit, actors),
      ...this.waitingInfo(order, now),
    };
  }

  /**
   * The order's story, oldest first: placed, then each step with its time and, when it was an admin,
   * who did it. Times come from the order itself (so old orders without audit rows still show);
   * the audit trail only adds the name. A status the customer reached on their own has no admin.
   */
  private orderHistory(order: any, audit: any[], actors: Map<string, ActorName>) {
    const steps: { status: string; at: Date | null }[] = [
      { status: 'confirmed', at: order.confirmedAt },
      { status: 'packed', at: order.packedAt },
      { status: 'shipped', at: order.shippedAt },
      { status: 'delivered', at: order.deliveredAt },
      { status: 'cancelled', at: order.cancelledAt },
    ];
    const history = [
      { status: 'placed', at: order.createdAt, by: null as { name: string; role: string } | null, reason: null as string | null },
      ...steps
        .filter((s) => s.at)
        .map((s) => {
          const event = [...audit].reverse().find((a) => a.afterState?.status === s.status);
          const actor = event?.actorId ? actors.get(event.actorId) : undefined;
          return {
            status: s.status,
            at: s.at as Date,
            by: actor ?? null,
            reason: s.status === 'cancelled' ? order.cancellationReason ?? null : null,
          };
        }),
    ];
    return history.sort((a, b) => new Date(a.at as any).getTime() - new Date(b.at as any).getTime());
  }

  /**
   * Cash-on-delivery orders keep their stock held until an admin acts (the expiry job skips
   * them), so one that is still "placed" after the COD hold window (24 hours) is overdue:
   * it is only flagged, never cancelled automatically.
   */
  private overdueWhere(now: Date): Prisma.OrderWhereInput {
    const cutoff = new Date(now.getTime() - INVENTORY.COD_RESERVATION_MINUTES * 60_000);
    return { status: OrderStatus.PLACED, paymentMode: 'cod', createdAt: { lt: cutoff } };
  }

  /** How long a "placed" order has waited for an admin, and whether that is overdue. */
  private waitingInfo(order: any, now: Date): { waitingMinutes: number | null; overdue: boolean } {
    if (order.status !== OrderStatus.PLACED) return { waitingMinutes: null, overdue: false };
    const waitedMs = now.getTime() - new Date(order.createdAt).getTime();
    return {
      waitingMinutes: Math.max(0, Math.floor(waitedMs / 60_000)),
      overdue: order.paymentMode === 'cod' && waitedMs > INVENTORY.COD_RESERVATION_MINUTES * 60_000,
    };
  }

  /**
   * Admin: update order status with state machine validation.
   */
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string) {
    if (dto.status === OrderStatus.CANCELLED && !dto.reason?.trim()) {
      throw new BadRequestException('A cancellation reason is required');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!canTransitionOrder(order.status as OrderStatus, dto.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${dto.status}"`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Build update data with timestamps
      const data: Prisma.OrderUpdateInput = { status: dto.status };

      switch (dto.status) {
        case OrderStatus.CONFIRMED:
          data.confirmedAt = new Date();
          await this.inventoryService.commitOrderReservations(tx, orderId);
          break;
        case OrderStatus.PACKED:
          data.packedAt = new Date();
          break;
        case OrderStatus.SHIPPED:
          data.shippedAt = new Date();
          await this.inventoryService.settleShipment(tx, orderId);
          // Create shipment record
          if (dto.trackingId) {
            await tx.shipment.create({
              data: {
                orderId,
                carrier: dto.courierName || 'Manual',
                trackingId: dto.trackingId,
                status: 'in_transit',
              },
            });
          }
          break;
        case OrderStatus.DELIVERED:
          data.deliveredAt = new Date();
          // Update shipment
          await tx.shipment.updateMany({
            where: { orderId },
            data: { status: 'delivered', deliveredAt: new Date() },
          });
          break;
        case OrderStatus.CANCELLED: {
          data.cancelledAt = new Date();
          data.cancellationReason = dto.reason?.trim();
          // Release reservations
          const reservations = await tx.inventoryReservation.findMany({
            where: { orderId, status: { in: ['held', 'committed'] } },
          });
          for (const res of reservations) {
            await this.inventoryService.releaseReservation(tx, res.id);
          }
          break;
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data,
        include: { items: true, shipments: true },
      });

      // Audit log
      await tx.auditEvent.create({
        data: {
          action: 'order.status_changed',
          entityType: 'order',
          entityId: orderId,
          actorType: 'admin',
          actorId: adminId,
          beforeState: { status: order.status } as any,
          afterState: {
            status: dto.status,
            ...(dto.status === OrderStatus.CANCELLED ? { reason: dto.reason?.trim() } : {}),
          } as any,
        },
      });

      return this.toOrderDetail(updated);
    });

    this.logger.log(
      `order ${order.publicNumber ?? orderId} ${order.status} -> ${dto.status} by admin ${adminId}` +
        (dto.status === OrderStatus.CANCELLED ? ' (reason recorded)' : ''),
    );
    return result;
  }

  // ─────────────────────────────────────────
  // RESPONSE FORMATTERS
  // ─────────────────────────────────────────

  private toOrderSummary(order: any, photos: Map<string, string> = new Map()) {
    return {
      id: order.id,
      publicNumber: order.publicNumber,
      status: order.status,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      totalPaise: order.totalPaise,
      itemCount: order.items?.length ?? 0,
      items: order.items?.map((i: any) => ({
        productTitle: i.productTitle,
        variantName: i.variantName,
        qty: i.qty,
        totalPaise: i.totalPaise,
        imageUrl: photos.get(i.variantId) ?? null,
      })) || [],
      createdAt: order.createdAt,
    };
  }

  private toOrderDetail(order: any) {
    return {
      id: order.id,
      publicNumber: order.publicNumber,
      status: order.status,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      subtotalPaise: order.subtotalPaise,
      shippingPaise: order.shippingPaise,
      taxPaise: order.taxPaise,
      discountPaise: order.discountPaise,
      totalPaise: order.totalPaise,
      addressSnapshot: order.addressSnapshot,
      notes: order.notes,
      estimatedDelivery: '5–7 business days',
      items: order.items?.map((i: any) => ({
        id: i.id,
        productTitle: i.productTitle,
        variantName: i.variantName,
        sku: i.sku,
        qty: i.qty,
        unitPricePaise: i.unitPricePaise,
        totalPaise: i.totalPaise,
      })) || [],
      shipments: order.shipments?.map((s: any) => ({
        id: s.id,
        carrier: s.carrier,
        trackingId: s.trackingId,
        status: s.status,
        dispatchedAt: s.dispatchedAt,
        deliveredAt: s.deliveredAt,
      })) || [],
      confirmedAt: order.confirmedAt,
      packedAt: order.packedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
    };
  }
}
