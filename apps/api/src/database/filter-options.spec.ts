// The shop's filter lists against a REAL Postgres (ProductsService.findFilterOptions), and that
// every value it offers really filters the list. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- filter-options)
// The test creates its own category and products and deletes them afterwards.
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ProductsService } from '../modules/products/products.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('shop filter options (real Postgres)', () => {
  const prisma = new PrismaClient();
  const service = new ProductsService(prisma as any);
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const F = (name: string) => `${name} ${tag}`; // values no other data has
  let categoryId = '';
  const productIds: Record<string, string> = {};

  async function makeProduct(key: string, status: string, fabric: string | null, weave: string | null,
    variants: { color: string | null; price: number; active?: boolean }[]) {
    const p = await prisma.product.create({
      data: { slug: `fo-${tag}-${key}`, title: `Filter ${key} ${tag}`, categoryId, publishStatus: status, fabric, weaveMethod: weave },
    });
    productIds[key] = p.id;
    for (const [i, v] of variants.entries()) {
      const variant = await prisma.productVariant.create({
        data: { productId: p.id, sku: `FO-${tag}-${key}-${i}`, color: v.color, pricePaise: v.price, active: v.active ?? true },
      });
      await prisma.inventory.create({ data: { variantId: variant.id, onHand: 5 } });
    }
  }

  beforeAll(async () => {
    categoryId = (await prisma.category.create({ data: { slug: `fo-${tag}`, name: 'Filter test' } })).id;
    // visible: published, with an active variant
    await makeProduct('visible', 'published', F('Alpha Silk'), F('Alpha Weave'), [
      { color: F('Crimson'), price: 1 },                 // the cheapest price in the whole catalogue
      { color: F('Retired Blue'), price: 500000, active: false }, // inactive variant: its colour is not offered
    ]);
    // same fabric spelled with other capitals: one filter, not two
    await makeProduct('shouty', 'published', F('ALPHA SILK'), null, [{ color: F('CRIMSON'), price: 2_000_000_000 }]); // the dearest
    // hidden: a draft, and a published product whose only variant is inactive
    await makeProduct('draft', 'draft', F('Draft Only Fabric'), F('Draft Only Weave'), [{ color: F('Draft Colour'), price: 300000 }]);
    await makeProduct('nostock', 'published', F('Inactive Only Fabric'), null, [{ color: F('Gone Colour'), price: 300000, active: false }]);
    // no fabric / colour at all: nothing to offer, and no crash
    await makeProduct('bare', 'published', null, null, [{ color: null, price: 400000 }]);
  });

  afterAll(async () => {
    const ids = Object.values(productIds);
    await prisma.inventory.deleteMany({ where: { variant: { productId: { in: ids } } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  const mine = (list: string[]) => list.filter((v) => v.toLowerCase().endsWith(tag));

  it('offers the fabrics, weaves and colours of products customers can see', async () => {
    const o = await service.findFilterOptions();
    expect(mine(o.fabrics).map((v) => v.toLowerCase())).toEqual([F('Alpha Silk').toLowerCase()]);
    expect(mine(o.weaveMethods)).toEqual([F('Alpha Weave')]);
    expect(mine(o.colors).map((v) => v.toLowerCase())).toEqual([F('Crimson').toLowerCase()]);
  });

  it('never offers anything from a draft, from a product with no active variant, or from an inactive variant', async () => {
    const o = await service.findFilterOptions();
    const everything = [...o.fabrics, ...o.weaveMethods, ...o.colors].join('|');
    for (const hidden of ['Draft Only Fabric', 'Draft Only Weave', 'Draft Colour', 'Inactive Only Fabric', 'Gone Colour', 'Retired Blue']) {
      expect(everything).not.toContain(hidden);
    }
  });

  it('gives each list in alphabetical order with no repeats', async () => {
    const o = await service.findFilterOptions();
    for (const list of [o.fabrics, o.weaveMethods, o.colors]) {
      const sorted = [...list].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      expect(list).toEqual(sorted);
      expect(new Set(list.map((v) => v.toLowerCase())).size).toBe(list.length);
    }
  });

  it('reports the cheapest and dearest active price in the catalogue', async () => {
    const o = await service.findFilterOptions();
    expect(o.minPricePaise).toBe(1);
    expect(o.maxPricePaise).toBe(2_000_000_000);
  });

  describe('every value on offer really filters the list', () => {
    const titlesFor = async (query: Record<string, unknown>) =>
      (await service.findAll({ categoryId, limit: 50, ...query } as any)).items.map((p: any) => p.title);

    it('fabric (ignoring capitals): both spellings of Alpha Silk are found', async () => {
      const titles = await titlesFor({ fabric: F('Alpha Silk') });
      expect(titles.sort()).toEqual([`Filter shouty ${tag}`, `Filter visible ${tag}`]);
    });

    it('weave method', async () => {
      expect(await titlesFor({ weaveMethod: F('Alpha Weave') })).toEqual([`Filter visible ${tag}`]);
    });

    it('colour of an active variant', async () => {
      expect((await titlesFor({ color: F('Crimson') })).sort()).toEqual([`Filter shouty ${tag}`, `Filter visible ${tag}`]);
    });

    it('a colour that only an inactive variant has finds nothing', async () => {
      expect(await titlesFor({ color: F('Retired Blue') })).toEqual([]);
    });

    it('price range (a product matches when one of its active variants is in the range)', async () => {
      const titles = await titlesFor({ minPrice: 350000, maxPrice: 450000 });
      expect(titles).toEqual([`Filter bare ${tag}`]);
    });

    it('filters combine with each other', async () => {
      expect(await titlesFor({ fabric: F('Alpha Silk'), color: F('Crimson'), minPrice: 1_000_000_000 })).toEqual([`Filter shouty ${tag}`]);
    });

    it('filters combine with the sort and keep the total right', async () => {
      const page = await service.findAll({ categoryId, fabric: F('Alpha Silk'), sortBy: 'price_desc', limit: 1 } as any);
      expect(page.items.map((p: any) => p.title)).toEqual([`Filter shouty ${tag}`]);
      expect(page.total).toBe(2);
      expect(page.hasMore).toBe(true);
    });
  });
});
