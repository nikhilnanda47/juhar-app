// Tests the CHECK constraints against a REAL Postgres (migration 20261122150000_check_constraints).
// The other API tests use a fake database and cannot see these rules.
//
// These tests are skipped unless DB_TESTS=1, because they need a migrated database:
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- check-constraints)
// CI runs them. Every test runs inside a transaction that is always rolled back,
// so nothing is left in the database.
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

class Rollback extends Error {}

type Tx = Prisma.TransactionClient;
interface Fixture {
  variantId: string;
  userId: string;
  orderId: string;
  orderItemId: string;
  paymentId: string;
  adminId: string;
}

describeDb('database CHECK constraints (real Postgres)', () => {
  const prisma = new PrismaClient();
  afterAll(() => prisma.$disconnect());

  // A complete, valid set of rows: product, variant, stock, user, order, order item, payment, admin.
  async function makeFixture(tx: Tx): Promise<Fixture> {
    const id = randomUUID().replace(/-/g, '').slice(0, 10);
    const category = await tx.category.create({ data: { slug: `cat-${id}`, name: 'Test category' } });
    const product = await tx.product.create({
      data: { slug: `prod-${id}`, title: 'Test saree', categoryId: category.id },
    });
    const variant = await tx.productVariant.create({
      data: { productId: product.id, sku: `T-${id}`, pricePaise: 100000, compareAtPaise: 150000 },
    });
    await tx.inventory.create({ data: { variantId: variant.id, onHand: 10 } });
    const user = await tx.user.create({ data: { phone: `+9${id}` } });
    const order = await tx.order.create({
      data: {
        publicNumber: `T-${id}`,
        userId: user.id,
        paymentMode: 'cod',
        subtotalPaise: 100000,
        shippingPaise: 0,
        taxPaise: 0,
        totalPaise: 100000,
        addressSnapshot: {},
        idempotencyKey: `key-${id}`,
      },
    });
    const orderItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        variantId: variant.id,
        productTitle: 'Test saree',
        sku: `T-${id}`,
        qty: 1,
        unitPricePaise: 100000,
        totalPaise: 100000,
      },
    });
    const payment = await tx.payment.create({
      data: { orderId: order.id, gateway: 'test', amountPaise: 100000 },
    });
    const admin = await tx.adminUser.create({ data: { phone: `+8${id}`, name: 'Test admin', role: 'owner' } });
    return {
      variantId: variant.id,
      userId: user.id,
      orderId: order.id,
      orderItemId: orderItem.id,
      paymentId: payment.id,
      adminId: admin.id,
    };
  }

  /** Runs `body` against a fresh fixture inside a transaction that is always rolled back. */
  async function inRolledBackTx(body: (tx: Tx, f: Fixture) => Promise<void>) {
    try {
      await prisma.$transaction(async (tx) => {
        await body(tx, await makeFixture(tx));
        throw new Rollback();
      });
    } catch (e) {
      if (!(e instanceof Rollback)) throw e;
    }
  }

  /** The statement must be refused by the database, naming this constraint. */
  async function rejectedBy(constraint: string, body: (tx: Tx, f: Fixture) => Promise<unknown>) {
    let message = '';
    try {
      await inRolledBackTx(async (tx, f) => {
        await body(tx, f);
      });
    } catch (e) {
      message = String((e as Error).message);
    }
    // Postgres error 23514 = check_violation; Prisma escapes the quotes around the name in its message
    expect(message).toContain('23514');
    expect(message).toContain(constraint);
  }

  describe('rows the app really writes are accepted', () => {
    it('accepts a complete order with stock, payment, cart, reservation, return and refund', async () => {
      await inRolledBackTx(async (tx, f) => {
        await tx.cartItem.create({ data: { userId: f.userId, variantId: f.variantId, quantity: 1 } });
        await tx.inventoryReservation.create({
          data: { variantId: f.variantId, qty: 1, expiresAt: new Date(Date.now() + 60_000) },
        });
        await tx.return.create({
          data: { orderId: f.orderId, orderItemId: f.orderItemId, qty: 1, reason: 'test' },
        });
        await tx.refund.create({
          data: { orderId: f.orderId, paymentId: f.paymentId, amountPaise: 100000, initiatedBy: f.adminId },
        });
      });
    });

    it('accepts a product with no compare-at price', async () => {
      await inRolledBackTx(async (tx, f) => {
        await tx.productVariant.update({ where: { id: f.variantId }, data: { compareAtPaise: null } });
      });
    });

    it('accepts held + unavailable stock right up to what is on the shelf', async () => {
      await inRolledBackTx(async (tx, f) => {
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: 6, unavailable: 4 } });
      });
    });

    it('accepts shipping an order that holds all the stock (on hand and reserved drop together)', async () => {
      await inRolledBackTx(async (tx, f) => {
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: 10 } });
        // the same single update InventoryService.settleShipment makes
        await tx.inventory.update({
          where: { variantId: f.variantId },
          data: { onHand: { decrement: 10 }, reserved: { decrement: 10 } },
        });
      });
    });

    it('accepts a free-shipping order with a discount', async () => {
      await inRolledBackTx(async (tx, f) => {
        await tx.order.update({
          where: { id: f.orderId },
          data: { subtotalPaise: 100000, discountPaise: 5000, shippingPaise: 0, taxPaise: 0, totalPaise: 95000 },
        });
      });
    });
  });

  describe('stock', () => {
    it('cannot go negative', () =>
      rejectedBy('chk_inventory_on_hand_non_negative', (tx, f) =>
        tx.inventory.update({ where: { variantId: f.variantId }, data: { onHand: -1 } })));

    it('cannot have a negative reserved count (releasing a hold twice)', () =>
      rejectedBy('chk_inventory_reserved_non_negative', (tx, f) =>
        tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: { decrement: 1 } } })));

    it('cannot have a negative unavailable count', () =>
      rejectedBy('chk_inventory_unavailable_non_negative', (tx, f) =>
        tx.inventory.update({ where: { variantId: f.variantId }, data: { unavailable: -1 } })));

    it('cannot hold more than is on the shelf (overselling)', () =>
      rejectedBy('chk_inventory_reserved_within_on_hand', (tx, f) =>
        tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: 11 } })));

    it('cannot mark stock unavailable that is already held', () =>
      rejectedBy('chk_inventory_reserved_within_on_hand', async (tx, f) => {
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: 8 } });
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { unavailable: 3 } });
      }));

    it('cannot lower on-hand below what is held', () =>
      rejectedBy('chk_inventory_reserved_within_on_hand', async (tx, f) => {
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { reserved: 5 } });
        await tx.inventory.update({ where: { variantId: f.variantId }, data: { onHand: 4 } });
      }));

    it('cannot hold zero units in a reservation', () =>
      rejectedBy('chk_inventory_reservations_qty_positive', (tx, f) =>
        tx.inventoryReservation.create({
          data: { variantId: f.variantId, qty: 0, expiresAt: new Date(Date.now() + 60_000) },
        })));
  });

  describe('cart and prices', () => {
    it('cart quantity must be above zero', () =>
      rejectedBy('chk_cart_items_quantity_positive', (tx, f) =>
        tx.cartItem.create({ data: { userId: f.userId, variantId: f.variantId, quantity: 0 } })));

    it('a price must be above zero', () =>
      rejectedBy('chk_product_variants_price_positive', (tx, f) =>
        tx.productVariant.update({ where: { id: f.variantId }, data: { pricePaise: 0 } })));

    it('a compare-at price equal to the price is refused', () =>
      rejectedBy('chk_product_variants_compare_at_above_price', (tx, f) =>
        tx.productVariant.update({ where: { id: f.variantId }, data: { compareAtPaise: 100000 } })));

    it('a compare-at price below the price is refused', () =>
      rejectedBy('chk_product_variants_compare_at_above_price', (tx, f) =>
        tx.productVariant.update({ where: { id: f.variantId }, data: { compareAtPaise: 50000 } })));

    it('raising the price above the compare-at price is refused', () =>
      rejectedBy('chk_product_variants_compare_at_above_price', (tx, f) =>
        tx.productVariant.update({ where: { id: f.variantId }, data: { pricePaise: 200000 } })));
  });

  describe('orders', () => {
    it('an order total that does not add up is refused', () =>
      rejectedBy('chk_orders_total_formula', (tx, f) =>
        tx.order.update({ where: { id: f.orderId }, data: { totalPaise: 100001 } })));

    it('the total must include shipping', () =>
      rejectedBy('chk_orders_total_formula', (tx, f) =>
        tx.order.update({ where: { id: f.orderId }, data: { shippingPaise: 9900 } })));

    it('a negative amount is refused even when the total adds up', () =>
      rejectedBy('chk_orders_amounts_non_negative', (tx, f) =>
        tx.order.update({ where: { id: f.orderId }, data: { shippingPaise: -100, totalPaise: 99900 } })));

    it('an order item needs a quantity above zero', () =>
      rejectedBy('chk_order_items_qty_positive', (tx, f) =>
        tx.orderItem.update({ where: { id: f.orderItemId }, data: { qty: 0 } })));

    it('an order item needs a price above zero', () =>
      rejectedBy('chk_order_items_unit_price_positive', (tx, f) =>
        tx.orderItem.update({ where: { id: f.orderItemId }, data: { unitPricePaise: 0 } })));
  });

  describe('payments, returns and refunds', () => {
    it('a payment needs an amount above zero', () =>
      rejectedBy('chk_payments_amount_positive', (tx, f) =>
        tx.payment.update({ where: { id: f.paymentId }, data: { amountPaise: 0 } })));

    it('a return needs a quantity above zero', () =>
      rejectedBy('chk_returns_qty_positive', (tx, f) =>
        tx.return.create({ data: { orderId: f.orderId, orderItemId: f.orderItemId, qty: 0, reason: 'test' } })));

    it('a refund needs an amount above zero', () =>
      rejectedBy('chk_refunds_amount_positive', (tx, f) =>
        tx.refund.create({
          data: { orderId: f.orderId, paymentId: f.paymentId, amountPaise: 0, initiatedBy: f.adminId },
        })));
  });

  it('left nothing behind in the database', async () => {
    expect(await prisma.category.count({ where: { name: 'Test category' } })).toBe(0);
    expect(await prisma.product.count({ where: { title: 'Test saree' } })).toBe(0);
  });
});
