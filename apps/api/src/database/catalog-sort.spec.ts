// Catalog sorting and paging against a REAL Postgres (ProductsService.findAll).
// The ordering is done in SQL, which a fake database cannot test.
// Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- catalog-sort)
// The test creates its own category and products and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ProductSortBy } from '@juhar/shared';
import { ProductsService } from '../modules/products/products.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

interface Seeded {
  id: string;
  /** cheapest ACTIVE variant: the price the card shows and the sort uses */
  price: number;
  createdAt: Date;
}

describeDb('catalog sorting and paging (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new ProductsService(prisma as any);
  const tag = randomUUID().replace(/-/g, '').slice(0, 10);
  let categoryId = '';
  let emptyCategoryId = '';
  const seeded: Seeded[] = [];

  // 25 visible products. Prices are shuffled; four of them tie on 5000 so the tie-break matters.
  // Some products have a second, dearer variant; some have a CHEAPER variant that is inactive,
  // which must not count.
  const PRICES = [
    9200, 1800, 5000, 3300, 7400, 5000, 2100, 8800, 4100, 6600, 1500, 5000, 9900, 2700, 3900, 7100, 5000,
    6200, 1200, 8300, 4800, 3000, 7800, 2400, 5600,
  ];

  beforeAll(async () => {
    const category = await prisma.category.create({ data: { slug: `sort-${tag}`, name: 'Sort test' } });
    const empty = await prisma.category.create({ data: { slug: `sort-empty-${tag}`, name: 'Sort test empty' } });
    categoryId = category.id;
    emptyCategoryId = empty.id;

    const base = Date.now() - 100 * 60_000;
    for (let i = 0; i < PRICES.length; i++) {
      const createdAt = new Date(base + i * 60_000); // product i is 1 minute newer than product i-1
      const product = await prisma.product.create({
        data: { slug: `p-${tag}-${i}`, title: `Saree ${i}`, categoryId, publishStatus: 'published', createdAt },
      });
      const variants = [{ sku: `S-${tag}-${i}-a`, pricePaise: PRICES[i], active: true }];
      if (i % 3 === 0) variants.push({ sku: `S-${tag}-${i}-b`, pricePaise: PRICES[i] + 50_000, active: true });
      if (i % 4 === 0) variants.push({ sku: `S-${tag}-${i}-c`, pricePaise: 100, active: false }); // cheaper but inactive
      await prisma.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId: product.id })) });
      seeded.push({ id: product.id, price: PRICES[i], createdAt });
    }

    // Must never appear: unpublished, and published with no active variant
    const hidden = await prisma.product.create({
      data: { slug: `p-${tag}-hidden`, title: 'Draft', categoryId, publishStatus: 'draft' },
    });
    await prisma.productVariant.create({ data: { productId: hidden.id, sku: `S-${tag}-h`, pricePaise: 50 } });
    const noActive = await prisma.product.create({
      data: { slug: `p-${tag}-noactive`, title: 'No active variant', categoryId, publishStatus: 'published' },
    });
    await prisma.productVariant.create({
      data: { productId: noActive.id, sku: `S-${tag}-n`, pricePaise: 60, active: false },
    });
  });

  afterAll(async () => {
    const products = await prisma.product.findMany({ where: { categoryId }, select: { id: true } });
    const ids = products.map((p) => p.id);
    await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.category.deleteMany({ where: { id: { in: [categoryId, emptyCategoryId] } } });
    await prisma.$disconnect();
  });

  /** Reads the whole catalog page by page, like "load more" does. */
  async function walk(query: Record<string, unknown>, limit: number) {
    const pages: { ids: string[]; prices: number[]; hasMore: boolean; cursor: string | null }[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 50; guard++) {
      const page = await service.findAll({ ...query, categoryId, limit, cursor } as any);
      pages.push({
        ids: page.items.map((card: any) => card.id),
        prices: page.items.map((card: any) => card.startingPricePaise),
        hasMore: page.hasMore,
        cursor: page.cursor,
      });
      if (!page.hasMore) break;
      cursor = page.cursor as string;
    }
    return pages;
  }

  /** What the order should be, worked out here without the code under test. */
  const expected = (rows: Seeded[], direction: 'asc' | 'desc') =>
    [...rows]
      .sort((a, b) => {
        if (a.price !== b.price) return direction === 'asc' ? a.price - b.price : b.price - a.price;
        return a.id < b.id ? -1 : 1; // ties: by id, the same in both directions
      })
      .map((r) => r.id);

  const flat = (pages: { ids: string[] }[]) => pages.flatMap((p) => p.ids);

  describe.each([
    ['price_asc', ProductSortBy.PRICE_ASC, 'asc' as const],
    ['price_desc', ProductSortBy.PRICE_DESC, 'desc' as const],
  ])('%s', (_name, sortBy, direction) => {
    it('puts the whole catalog in true price order across pages (the bug: only sorted within a page)', async () => {
      const pages = await walk({ sortBy }, 6);
      expect(flat(pages)).toEqual(expected(seeded, direction));
    });

    it('never repeats or skips a product when loading more', async () => {
      const pages = await walk({ sortBy }, 4);
      const all = flat(pages);
      expect(all).toHaveLength(25);
      expect(new Set(all).size).toBe(25);
    });

    it('shows the same price the list is sorted by (the cheapest ACTIVE variant)', async () => {
      const pages = await walk({ sortBy }, 7);
      const shown = pages.flatMap((p) => p.prices);
      const sortedCopy = [...shown].sort((a, b) => (direction === 'asc' ? a - b : b - a));
      expect(shown).toEqual(sortedCopy);
      expect(shown).toEqual(expected(seeded, direction).map((id) => seeded.find((s) => s.id === id)!.price));
    });

    it('reports hasMore and a cursor on every page but the last', async () => {
      const pages = await walk({ sortBy }, 10);
      expect(pages.map((p) => p.ids.length)).toEqual([10, 10, 5]);
      expect(pages.map((p) => p.hasMore)).toEqual([true, true, false]);
      expect(pages[0].cursor).toBe(pages[0].ids[9]);
      expect(pages[2].cursor).toBeNull();
    });

    it('works when the page size is larger than the catalog', async () => {
      const pages = await walk({ sortBy }, 50);
      expect(pages).toHaveLength(1);
      expect(pages[0].hasMore).toBe(false);
      expect(pages[0].ids).toEqual(expected(seeded, direction));
    });

    it('works with a page size of 1', async () => {
      const pages = await walk({ sortBy }, 1);
      expect(flat(pages)).toEqual(expected(seeded, direction));
    });

    it('combines with the price filter', async () => {
      const inRange = seeded.filter((s) => s.price >= 3000 && s.price <= 7000);
      const pages = await walk({ sortBy, minPrice: 3000, maxPrice: 7000 }, 5);
      expect(flat(pages)).toEqual(expected(inRange, direction));
    });
  });

  it('ignores an inactive variant that is cheaper than the real price', async () => {
    // product 0 has an inactive variant at 100 paise; it must sort by its real 9200
    const pages = await walk({ sortBy: ProductSortBy.PRICE_ASC }, 50);
    const first = pages[0].prices[0];
    expect(first).toBe(1200);
    expect(pages[0].prices).not.toContain(100);
  });

  it('never lists unpublished products or products without an active variant', async () => {
    for (const sortBy of [ProductSortBy.PRICE_ASC, ProductSortBy.PRICE_DESC, ProductSortBy.NEWEST]) {
      const all = flat(await walk({ sortBy }, 50));
      expect(all).toHaveLength(25);
    }
  });

  it('answers an unknown cursor with an empty page instead of an error', async () => {
    const page = await service.findAll({
      categoryId,
      sortBy: ProductSortBy.PRICE_ASC,
      limit: 5,
      cursor: randomUUID(),
    } as any);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.cursor).toBeNull();
  });

  it('returns an empty list for a category with no products', async () => {
    const page = await service.findAll({ categoryId: emptyCategoryId, sortBy: ProductSortBy.PRICE_DESC } as any);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  describe('newest first (unchanged)', () => {
    it('lists the whole catalog newest first across pages, with no repeats', async () => {
      const newest = [...seeded].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((s) => s.id);
      const pages = await walk({ sortBy: ProductSortBy.NEWEST }, 7);
      expect(flat(pages)).toEqual(newest);
    });

    it('is also the order when no sort is given', async () => {
      const newest = [...seeded].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((s) => s.id);
      const pages = await walk({}, 25);
      expect(flat(pages)).toEqual(newest);
    });
  });
});
