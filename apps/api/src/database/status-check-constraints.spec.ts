// The status CHECK constraints (migration 20261126130000_status_check_constraints) against a REAL Postgres.
// Skipped unless DB_TESTS=1 (CI runs it): (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- status-check-constraints)
// Every test runs inside a transaction that is always rolled back, so nothing is left in the database.
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  AdminRole, MediaType, OrderStatus, PaymentMode, PaymentStatus, PublishStatus, ReservationStatus, ShipmentStatus, UserStatus,
} from '@juhar/shared';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;
class Rollback extends Error {}
type Tx = Prisma.TransactionClient;

describeDb('status CHECK constraints (real Postgres)', () => {
  const prisma = new PrismaClient();
  afterAll(() => prisma.$disconnect());

  /** One row in each table that has a status-like column */
  async function makeRows(tx: Tx) {
    const id = randomUUID().replace(/-/g, '').slice(0, 10);
    const category = await tx.category.create({ data: { slug: `c-${id}`, name: 'Status test' } });
    const product = await tx.product.create({ data: { slug: `p-${id}`, title: 'Status test', categoryId: category.id } });
    const variant = await tx.productVariant.create({ data: { productId: product.id, sku: `S-${id}`, pricePaise: 100000 } });
    await tx.inventory.create({ data: { variantId: variant.id, onHand: 10 } });
    const user = await tx.user.create({ data: { phone: `+9${id}` } });
    const order = await tx.order.create({
      data: { publicNumber: `S-${id}`, userId: user.id, paymentMode: 'cod', subtotalPaise: 100000, shippingPaise: 0, taxPaise: 0, totalPaise: 100000, addressSnapshot: {}, idempotencyKey: `k-${id}` },
    });
    const shipment = await tx.shipment.create({ data: { orderId: order.id } });
    const reservation = await tx.inventoryReservation.create({ data: { variantId: variant.id, qty: 1, expiresAt: new Date(Date.now() + 60_000) } });
    const media = await tx.productMedia.create({ data: { productId: product.id, objectKey: `k-${id}`, type: 'image', mimeType: 'image/webp' } });
    const adminLogin = await tx.user.create({ data: { phone: `+8${id}` } });
    const admin = await tx.adminUser.create({ data: { userId: adminLogin.id, phone: `+8${id}`, name: 'Status admin', role: 'owner' } });
    return { user, product, media, reservation, order, shipment, admin };
  }

  async function inRolledBackTx(body: (tx: Tx, rows: Awaited<ReturnType<typeof makeRows>>) => Promise<void>) {
    try {
      await prisma.$transaction(async (tx) => {
        await body(tx, await makeRows(tx));
        throw new Rollback();
      });
    } catch (e) {
      if (!(e instanceof Rollback)) throw e;
    }
  }

  /** [table, column, constraint, enum, which row to change] */
  const RULES: [string, string, string, Record<string, string>, (r: Awaited<ReturnType<typeof makeRows>>) => string][] = [
    ['users', 'status', 'chk_users_status_allowed', UserStatus, (r) => r.user.id],
    ['products', 'publish_status', 'chk_products_publish_status_allowed', PublishStatus, (r) => r.product.id],
    ['product_media', 'type', 'chk_product_media_type_allowed', MediaType, (r) => r.media.id],
    ['inventory_reservations', 'status', 'chk_inventory_reservations_status_allowed', ReservationStatus, (r) => r.reservation.id],
    ['orders', 'status', 'chk_orders_status_allowed', OrderStatus, (r) => r.order.id],
    ['orders', 'payment_status', 'chk_orders_payment_status_allowed', PaymentStatus, (r) => r.order.id],
    ['orders', 'payment_mode', 'chk_orders_payment_mode_allowed', PaymentMode, (r) => r.order.id],
    ['shipments', 'status', 'chk_shipments_status_allowed', ShipmentStatus, (r) => r.shipment.id],
    ['admin_users', 'role', 'chk_admin_users_role_allowed', AdminRole, (r) => r.admin.id],
    ['admin_users', 'status', 'chk_admin_users_status_allowed', UserStatus, (r) => r.admin.id],
  ];
  const set = (tx: Tx, table: string, column: string, id: string, value: string) =>
    tx.$executeRawUnsafe(`UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2::uuid`, value, id);

  describe.each(RULES)('%s.%s', (table, column, constraint, enumeration, pick) => {
    it('accepts every value the app uses', async () => {
      await inRolledBackTx(async (tx, rows) => {
        for (const value of Object.values(enumeration)) {
          await expect(set(tx, table, column, pick(rows), value)).resolves.toBe(1);
        }
      });
    });

    it.each(['deliverd', 'DELIVERED', '', ' placed', 'unknown'])('refuses %p, naming the rule', async (bad) => {
      let message = '';
      try {
        await inRolledBackTx(async (tx, rows) => { await set(tx, table, column, pick(rows), bad); });
      } catch (e) {
        message = String((e as Error).message);
      }
      expect(message).toContain('23514'); // Postgres: check_violation
      expect(message).toContain(constraint);
    });
  });

  it('the rows the app creates by default are accepted (the column defaults are inside the lists)', async () => {
    await inRolledBackTx(async (tx, rows) => {
      const [order] = await tx.$queryRawUnsafe<{ status: string; payment_status: string }[]>(`SELECT status, payment_status FROM orders WHERE id = $1::uuid`, rows.order.id);
      expect(order).toEqual({ status: 'placed', payment_status: 'pending' });
      expect(rows.product.publishStatus).toBe('draft');
      expect(rows.reservation.status).toBe('held');
      expect(rows.shipment.status).toBe('pending');
      expect(rows.user.status).toBe('active');
      expect(rows.admin.status).toBe('active');
    });
  });
});
