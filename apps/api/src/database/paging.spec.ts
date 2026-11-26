// Long lists against a REAL Postgres: paging through orders and the admin catalog, and the
// whole-catalog counts the admin pages and dashboard rely on.
// Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- paging)
// The test creates its own user, orders, category and products and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { testMedia } from '../modules/media/test-media';
import { randomUUID } from 'crypto';
import { OrdersService } from '../modules/orders/orders.service';
import { ProductsService } from '../modules/products/products.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('paging long lists (real Postgres)', () => {
  const prisma = new PrismaClient();
  const orders = new OrdersService(prisma as any, {} as any, testMedia());
  const products = new ProductsService(prisma as any, testMedia());
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const phone = `+9${tag}`;
  const ORDERS = 45;
  const PRODUCTS = 45;

  let userId = '';
  let categoryId = '';
  const orderIds: string[] = [];
  const productIds: string[] = [];
  let before = { products: 0, published: 0, draft: 0, variants: 0, lowStock: 0 };

  const countsNow = async () => (await products.findAllAdmin({ limit: 1 } as any)).counts;

  beforeAll(async () => {
    before = await countsNow();
    userId = (await prisma.user.create({ data: { phone } })).id;

    // Every order has the SAME creation time: the worst case for paging, because the list
    // is sorted by that time and a cursor must still continue from exactly the right place.
    const sameInstant = new Date('2020-06-01T10:00:00.000Z');
    for (let i = 0; i < ORDERS; i++) {
      const o = await prisma.order.create({
        data: {
          publicNumber: `P-${tag}-${i}`,
          userId,
          status: i % 3 === 0 ? 'delivered' : 'placed',
          paymentMode: 'cod',
          subtotalPaise: 100000,
          shippingPaise: 0,
          taxPaise: 0,
          totalPaise: 100000,
          addressSnapshot: {},
          idempotencyKey: `key-${tag}-${i}`,
          createdAt: sameInstant,
        },
      });
      orderIds.push(o.id);
    }

    categoryId = (await prisma.category.create({ data: { slug: `paging-${tag}`, name: 'Paging test' } })).id;
    const created = new Date('2020-06-01T10:00:00.000Z');
    for (let i = 0; i < PRODUCTS; i++) {
      const p = await prisma.product.create({
        data: {
          slug: `pg-${tag}-${i}`,
          title: `Paging saree ${i}`,
          categoryId,
          publishStatus: i % 5 === 0 ? 'draft' : 'published', // 9 drafts, 36 published
          createdAt: created,
        },
      });
      productIds.push(p.id);
      // one variant each; stock cycles through 0,1,3,4,10 available so low stock is exactly the 1s and 3s
      const stock = [0, 1, 3, 4, 10][i % 5];
      const v = await prisma.productVariant.create({
        data: { productId: p.id, sku: `PG-${tag}-${i}`, pricePaise: 100000 + i },
      });
      await prisma.inventory.create({ data: { variantId: v.id, onHand: stock } });
    }
    // an inactive variant with 2 left must NOT count as low stock, and a variant with 1 held
    // by an order (on hand 5, reserved 4 -> 1 available) must count
    const p0 = productIds[1];
    const retired = await prisma.productVariant.create({
      data: { productId: p0, sku: `PG-${tag}-retired`, pricePaise: 90000, active: false },
    });
    await prisma.inventory.create({ data: { variantId: retired.id, onHand: 2 } });
    const held = await prisma.productVariant.create({ data: { productId: p0, sku: `PG-${tag}-held`, pricePaise: 95000 } });
    await prisma.inventory.create({ data: { variantId: held.id, onHand: 5, reserved: 4 } });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.inventory.deleteMany({ where: { variant: { productId: { in: productIds } } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  /** Reads a whole list page by page, like "Load more" does, and checks the paging flags. */
  async function walk(fetchPage: (cursor?: string) => Promise<{ items: any[]; cursor: string | null; hasMore: boolean }>) {
    const ids: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    for (; pages < 50; pages++) {
      const page = await fetchPage(cursor);
      ids.push(...page.items.map((i) => i.id));
      expect(page.hasMore).toBe(page.cursor !== null);
      if (!page.hasMore) break;
      cursor = page.cursor as string;
    }
    return { ids, pages: pages + 1 };
  }

  describe('customer orders', () => {
    it('every order is reached exactly once, even when they all share one creation time', async () => {
      const { ids, pages } = await walk((cursor) => orders.findMyOrders(userId, { limit: 10, cursor } as any));
      expect(ids).toHaveLength(ORDERS);
      expect(new Set(ids).size).toBe(ORDERS);
      expect(new Set(ids)).toEqual(new Set(orderIds));
      expect(pages).toBe(5);
    });

    it('says how many orders there are in total, on every page', async () => {
      expect((await orders.findMyOrders(userId, { limit: 10 } as any)).total).toBe(ORDERS);
      const second = await orders.findMyOrders(userId, { limit: 10, cursor: (await orders.findMyOrders(userId, { limit: 10 } as any)).cursor } as any);
      expect(second.total).toBe(ORDERS);
    });

    it('the total follows the status filter, and filtered paging still reaches everything', async () => {
      const delivered = Math.ceil(ORDERS / 3); // i = 0, 3, 6, ...
      const page = await orders.findMyOrders(userId, { limit: 4, status: 'delivered' } as any);
      expect(page.total).toBe(delivered);
      const { ids } = await walk((cursor) => orders.findMyOrders(userId, { limit: 4, status: 'delivered', cursor } as any));
      expect(ids).toHaveLength(delivered);
      expect(new Set(ids).size).toBe(delivered);
    });

    it('counts the orders in each status for the whole account, whatever the page or filter', async () => {
      const delivered = Math.ceil(ORDERS / 3);
      const expected = { delivered, placed: ORDERS - delivered };
      expect((await orders.findMyOrders(userId, { limit: 5 } as any)).counts).toEqual(expected);
      expect((await orders.findMyOrders(userId, { limit: 5, status: 'delivered' } as any)).counts).toEqual(expected);
    });

    it('another customer sees none of them and a total of 0', async () => {
      const other = await prisma.user.create({ data: { phone: `+8${tag}` } });
      try {
        const page = await orders.findMyOrders(other.id, { limit: 10 } as any);
        expect(page.items).toEqual([]);
        expect(page.total).toBe(0);
      } finally {
        await prisma.user.delete({ where: { id: other.id } });
      }
    });
  });

  describe('admin orders', () => {
    it('every order is reached exactly once, even when they all share one creation time', async () => {
      const { ids } = await walk((cursor) => orders.findAllAdmin({ search: phone, limit: 10, cursor } as any));
      expect(ids).toHaveLength(ORDERS);
      expect(new Set(ids).size).toBe(ORDERS);
    });

    it('every order names its customer with the same user id the logs show', async () => {
      const page = await orders.findAllAdmin({ search: phone, limit: 5 } as any);
      expect(page.items.every((o: any) => o.customer?.id === userId && o.customer?.phone === phone)).toBe(true);
    });

    it('the status filter and paging work together', async () => {
      const { ids } = await walk((cursor) => orders.findAllAdmin({ search: phone, status: 'placed', limit: 7, cursor } as any));
      expect(ids).toHaveLength(ORDERS - Math.ceil(ORDERS / 3));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('admin catalog', () => {
    it('every product is reached exactly once, even when they all share one creation time', async () => {
      const { ids, pages } = await walk((cursor) => products.findAllAdmin({ categoryId, limit: 20, cursor } as any));
      expect(ids).toHaveLength(PRODUCTS);
      expect(new Set(ids)).toEqual(new Set(productIds));
      expect(pages).toBe(3);
    });

    it('the publish filter and paging work together', async () => {
      const draft = await walk((cursor) => products.findAllAdmin({ categoryId, publishStatus: 'draft', limit: 4, cursor } as any));
      expect(draft.ids).toHaveLength(9);
      const published = await walk((cursor) => products.findAllAdmin({ categoryId, publishStatus: 'published', limit: 10, cursor } as any));
      expect(published.ids).toHaveLength(36);
    });

    it('the shop list (what customers see) also reaches every published product exactly once', async () => {
      const { ids } = await walk((cursor) => products.findAll({ categoryId, limit: 10, cursor } as any));
      expect(ids).toHaveLength(36); // the 9 drafts are not shown to customers
      expect(new Set(ids).size).toBe(36);
    });

    it('counts the whole catalog, whatever the page or filter', async () => {
      const now = await countsNow();
      expect(now.products - before.products).toBe(PRODUCTS);
      expect(now.draft - before.draft).toBe(9);
      expect(now.published - before.published).toBe(36);
      expect(now.variants - before.variants).toBe(PRODUCTS + 2); // one each, plus the retired and the held one
      const filtered = (await products.findAllAdmin({ categoryId, publishStatus: 'draft', limit: 1 } as any)).counts;
      expect(filtered).toEqual(now);
    });

    it('low stock is exactly the active variants with 1 to 3 available', async () => {
      // stock cycles 0,1,3,4,10: nine each of 0,1,3,4,10 -> 9 with 1 + 9 with 3 = 18, plus the "held" variant (5 - 4 = 1)
      // The retired variant (2 left, inactive) and the ones with 0 or 4+ must not count.
      const now = await countsNow();
      expect(now.lowStock - before.lowStock).toBe(9 + 9 + 1);
    });

    it('a variant with none left is out of stock, not low stock', async () => {
      const v = await prisma.productVariant.findFirst({ where: { sku: `PG-${tag}-0` }, select: { id: true } }); // 0 available
      const lowBefore = (await countsNow()).lowStock;
      await prisma.inventory.update({ where: { variantId: v!.id }, data: { onHand: 1 } });
      expect((await countsNow()).lowStock).toBe(lowBefore + 1); // 1 left: now low
      await prisma.inventory.update({ where: { variantId: v!.id }, data: { onHand: 0 } });
      expect((await countsNow()).lowStock).toBe(lowBefore); // none left: not low
    });
  });
});
