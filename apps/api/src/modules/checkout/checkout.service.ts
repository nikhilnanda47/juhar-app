import {
  Injectable, BadRequestException, Logger, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CheckoutQuoteDto, PlaceOrderDto } from './dto';
import { calculateShippingPaise, generateOrderNumber, PaymentMode } from '@juhar/shared';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Calculate checkout quote — does NOT reserve stock.
   * Server-calculated totals: subtotal, shipping, tax, total.
   */
  async getQuote(userId: string, dto: CheckoutQuoteDto) {
    // Validate address exists and belongs to user
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('ADDRESS_NOT_FOUND');

    // Fetch cart with current prices
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        variant: {
          include: {
            product: { select: { title: true, publishStatus: true } },
            inventory: true,
          },
        },
      },
    });
    if (cartItems.length === 0) throw new BadRequestException('CART_EMPTY');

    // Build quote items and collect warnings
    const warnings: string[] = [];
    const items = cartItems.map((item) => {
      const v = item.variant;
      const inv = v.inventory;
      const available = inv ? inv.onHand - inv.reserved - inv.unavailable : 0;

      if (!v.active || v.product.publishStatus !== 'published') {
        warnings.push(`${v.product.title} is no longer available`);
      } else if (available < item.quantity) {
        warnings.push(`${v.product.title} has only ${available} left (you have ${item.quantity} in cart)`);
      }

      return {
        variantId: v.id,
        sku: v.sku,
        productTitle: v.product.title,
        variantName: v.name,
        color: v.color,
        qty: item.quantity,
        unitPricePaise: v.pricePaise,
        lineTotalPaise: v.pricePaise * item.quantity,
        available,
      };
    });

    const subtotalPaise = items.reduce((sum, i) => sum + i.lineTotalPaise, 0);
    const shippingPaise = calculateShippingPaise(subtotalPaise);
    const taxPaise = 0; // GST included in product price for pilot
    const totalPaise = subtotalPaise + shippingPaise + taxPaise;

    return {
      items,
      subtotalPaise,
      shippingPaise,
      taxPaise,
      discountPaise: 0,
      totalPaise,
      paymentMode: dto.paymentMode,
      codAvailable: true, // All PIN codes in pilot area support COD
      estimatedDelivery: '5–7 business days',
      warnings,
    };
  }

  /**
   * Place order — single atomic Prisma interactive transaction.
   * 1. Idempotency check
   * 2. Fetch cart + validate
   * 3. Reserve inventory (SELECT FOR UPDATE)
   * 4. Create order + order items (price snapshot)
   * 5. Snapshot address as JSON
   * 6. Clear cart
   */
  async placeOrder(userId: string, dto: PlaceOrderDto) {
    // Validate address exists and belongs to user (outside transaction)
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('ADDRESS_NOT_FOUND');

    let replayed = false;
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check
      const existing = await tx.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { items: true },
      });
      if (existing) {
        replayed = true;
        return this.formatOrderResponse(existing);
      }

      // 2. Fetch cart with current prices
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: {
          variant: {
            include: {
              product: { select: { title: true, slug: true, publishStatus: true } },
              inventory: true,
            },
          },
        },
      });
      if (cartItems.length === 0) throw new BadRequestException('CART_EMPTY');

      // 3. Validate and reserve each item
      const reservationIds: string[] = [];
      for (const item of cartItems) {
        if (!item.variant.active || item.variant.product.publishStatus !== 'published') {
          throw new BadRequestException(`VARIANT_UNAVAILABLE: ${item.variant.sku}`);
        }

        // Reserve with expiry based on payment mode
        const expiresAt = new Date();
        if (dto.paymentMode === PaymentMode.UPI) {
          expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 min for UPI
        } else {
          expiresAt.setHours(expiresAt.getHours() + 24); // COD: 24h review window; the expiry job leaves COD holds alone
        }

        const reservation = await this.inventoryService.reserve(
          tx, item.variantId, item.quantity, expiresAt,
        );
        reservationIds.push(reservation.id);
      }

      // 4. Calculate totals (server-side)
      const subtotalPaise = cartItems.reduce(
        (sum, i) => sum + i.variant.pricePaise * i.quantity, 0,
      );
      const shippingPaise = calculateShippingPaise(subtotalPaise);
      const taxPaise = 0;
      const totalPaise = subtotalPaise + shippingPaise + taxPaise;

      // 5. Generate order number from the database sequence (safe for concurrent orders)
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq') AS nextval`;
      const publicNumber = generateOrderNumber(Number(nextval));

      // 6. Create order with address snapshot
      const order = await tx.order.create({
        data: {
          publicNumber,
          userId,
          status: 'placed',
          paymentMode: dto.paymentMode,
          paymentStatus: dto.paymentMode === PaymentMode.COD ? 'cod_pending' : 'pending',
          subtotalPaise,
          shippingPaise,
          taxPaise,
          totalPaise,
          addressSnapshot: {
            recipientName: address.recipientName,
            recipientPhone: address.recipientPhone,
            line1: address.line1,
            line2: address.line2,
            landmark: address.landmark,
            city: address.city,
            district: address.district,
            state: address.state,
            pinCode: address.pinCode,
          } as any,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes,
        },
      });

      // 7. Create order items with price snapshots
      await tx.orderItem.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          variantId: item.variantId,
          productTitle: item.variant.product.title,
          variantName: item.variant.name,
          sku: item.variant.sku,
          qty: item.quantity,
          unitPricePaise: item.variant.pricePaise,
          taxPaise: 0,
          totalPaise: item.variant.pricePaise * item.quantity,
        })),
      });

      // 8. Link reservations to order
      await tx.inventoryReservation.updateMany({
        where: { id: { in: reservationIds } },
        data: { orderId: order.id },
      });

      // 9. Clear cart
      await tx.cartItem.deleteMany({ where: { userId } });

      // Return complete order
      const completeOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      return this.formatOrderResponse(completeOrder!);
    }, {
      timeout: 10000, // 10s max transaction
    });

    const total = `₹${(order.totalPaise / 100).toLocaleString('en-IN')}`;
    this.logger.log(
      replayed
        ? `order ${order.publicNumber} returned again for the same idempotency key user=${userId}`
        : `order placed ${order.publicNumber} total=${total} items=${order.items.length} payment=${order.paymentMode} user=${userId}`,
    );
    return order;
  }

  private formatOrderResponse(order: any) {
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
      items: order.items?.map((item: any) => ({
        id: item.id,
        productTitle: item.productTitle,
        variantName: item.variantName,
        sku: item.sku,
        qty: item.qty,
        unitPricePaise: item.unitPricePaise,
        totalPaise: item.totalPaise,
      })) || [],
      createdAt: order.createdAt,
    };
  }
}
