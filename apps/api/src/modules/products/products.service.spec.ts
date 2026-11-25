import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductSortBy } from '@juhar/shared';
import { ProductsService } from './products.service';

// updateVariant: the compare-at price must stay above the price (the database enforces it too).
function setup(stored: { pricePaise: number; compareAtPaise: number | null } | null) {
  const update = jest.fn(async ({ data }: any) => ({ id: 'v1', ...data }));
  const auditCreate = jest.fn(async () => ({}));
  const tx = { productVariant: { update }, auditEvent: { create: auditCreate } };
  const prisma = {
    productVariant: {
      findFirst: jest.fn(async () => (stored ? { id: 'v1', productId: 'p1', sku: 'SKU-1', name: 'Red', color: 'Red', active: true, ...stored } : null)),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'v1', ...stored })),
      update,
    },
    $transaction: jest.fn(async (work: any) => work(tx)),
  };
  return { service: new ProductsService(prisma as any), update, auditCreate, prisma };
}

describe('ProductsService.updateVariant', () => {
  it('saves a price change that keeps the compare-at price above it', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { pricePaise: 120000 } as any);
    expect(update).toHaveBeenCalled();
  });

  it('refuses a price that reaches the stored compare-at price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await expect(service.updateVariant('p1', 'v1', { pricePaise: 150000 } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a compare-at price at or below the stored price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: null });
    await expect(service.updateVariant('p1', 'v1', { compareAtPaise: 100000 } as any)).rejects.toMatchObject({
      response: { code: 'PROD_005' },
    });
    await expect(service.updateVariant('p1', 'v1', { compareAtPaise: 90000 } as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('checks both new values together', async () => {
    const { service } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await expect(
      service.updateVariant('p1', 'v1', { pricePaise: 200000, compareAtPaise: 180000 } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateVariant('p1', 'v1', { pricePaise: 200000, compareAtPaise: 250000 } as any),
    ).resolves.toBeDefined();
  });

  it('lets the admin remove the compare-at price', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { compareAtPaise: null } as any);
    expect(update).toHaveBeenCalled();
  });

  it('does not touch the compare-at price when only the name changes', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: 150000 });
    await service.updateVariant('p1', 'v1', { name: 'New name' } as any);
    expect(update).toHaveBeenCalled();
  });

  it('reports a missing variant', async () => {
    const { service } = setup(null);
    await expect(service.updateVariant('p1', 'v1', { pricePaise: 5 } as any)).rejects.toThrow(NotFoundException);
  });
});

// findAll with a price sort: the database orders the products, the page is cut from that order.
// (The real ordering is tested against Postgres in src/database/catalog-sort.spec.ts.)
describe('ProductsService.findAll price sorting (fake database)', () => {
  const card = (id: string, price: number) => ({
    id,
    slug: id,
    title: id,
    shortDescription: null,
    category: { slug: 'c', name: 'C' },
    media: [],
    fabric: null,
    weaveMethod: null,
    variants: [{ pricePaise: price, compareAtPaise: null, inventory: { onHand: 5, reserved: 0, unavailable: 0 } }],
  });

  function setup(matching: string[], orderedByDb: string[]) {
    const products = new Map(orderedByDb.map((id, i) => [id, card(id, (i + 1) * 1000)]));
    const findMany = jest.fn(async (args: any) => {
      if (args.select) return matching.map((id) => ({ id }));
      // like the real database, return the requested products in an arbitrary (here: reversed) order
      return [...args.where.id.in].reverse().map((id: string) => products.get(id));
    });
    const queryRaw = jest.fn(async () => orderedByDb.map((id) => ({ id })));
    const service = new ProductsService({ product: { findMany }, $queryRaw: queryRaw } as any);
    return { service, findMany, queryRaw };
  }

  const ids = ['a', 'b', 'c', 'd', 'e'];
  const sqlText = (call: any[]) => call.slice(1).map((v: any) => v?.strings?.join('') ?? '').join('|');

  it('returns the products in the order the database gave, not the order they were loaded in', async () => {
    const { service } = setup(ids, ['c', 'a', 'e', 'b', 'd']);
    const page = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 10 } as any);
    expect(page.items.map((card: any) => card.id)).toEqual(['c', 'a', 'e', 'b', 'd']);
    expect(page.items.map((card: any) => card.startingPricePaise)).toEqual([1000, 2000, 3000, 4000, 5000]);
  });

  it('asks the database to order exactly the products that match the filters', async () => {
    const { service, queryRaw } = setup(['a', 'b'], ['b', 'a']);
    await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 10 } as any);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const values = (queryRaw.mock.calls[0] as unknown as any[]).slice(1);
    expect(values).toContainEqual(['a', 'b']);
  });

  it('sorts ascending for price_asc and descending for price_desc', async () => {
    const asc = setup(ids, ids);
    await asc.service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 10 } as any);
    expect(sqlText(asc.queryRaw.mock.calls[0] as unknown as any[])).toContain('ASC');

    const desc = setup(ids, ids);
    await desc.service.findAll({ sortBy: ProductSortBy.PRICE_DESC, limit: 10 } as any);
    expect(sqlText(desc.queryRaw.mock.calls[0] as unknown as any[])).toContain('DESC');
  });

  it('cuts the first page and gives the last product on it as the cursor', async () => {
    const { service } = setup(ids, ids);
    const page = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 2 } as any);
    expect(page.items.map((card: any) => card.id)).toEqual(['a', 'b']);
    expect(page.hasMore).toBe(true);
    expect(page.cursor).toBe('b');
  });

  it('continues after the cursor in the price order, with no repeats', async () => {
    const { service } = setup(ids, ids);
    const second = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 2, cursor: 'b' } as any);
    expect(second.items.map((card: any) => card.id)).toEqual(['c', 'd']);
    expect(second.cursor).toBe('d');
    const last = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 2, cursor: 'd' } as any);
    expect(last.items.map((card: any) => card.id)).toEqual(['e']);
    expect(last.hasMore).toBe(false);
    expect(last.cursor).toBeNull();
  });

  it('returns an empty page for a cursor that is not in the list', async () => {
    const { service } = setup(ids, ids);
    const page = await service.findAll({ sortBy: ProductSortBy.PRICE_DESC, limit: 2, cursor: 'gone' } as any);
    expect(page).toEqual({ items: [], cursor: null, hasMore: false, total: 5 }); // still says how many there are
  });

  it('does not query prices at all when nothing matches', async () => {
    const { service, queryRaw } = setup([], []);
    const page = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 5 } as any);
    expect(page).toEqual({ items: [], cursor: null, hasMore: false, total: 0 });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('newest-first: ordered by creation date (id breaks ties) and never touches the price query', async () => {
    const findMany = jest.fn(async () => [card('a', 1000), card('b', 2000)]);
    const count = jest.fn(async () => 2);
    const queryRaw = jest.fn();
    const service = new ProductsService({ product: { findMany, count }, $queryRaw: queryRaw } as any);
    await service.findAll({ sortBy: ProductSortBy.NEWEST, limit: 10 } as any);
    expect((findMany.mock.calls[0] as unknown as any[])[0]).toMatchObject({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 11 });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  describe('total (how many sarees match, over all pages)', () => {
    it('newest-first: counts with the same filters as the list, not just the page', async () => {
      const findMany = jest.fn(async () => [card('a', 1000), card('b', 2000)]);
      const count = jest.fn(async () => 58);
      const service = new ProductsService({ product: { findMany, count }, $queryRaw: jest.fn() } as any);
      const page = await service.findAll({ sortBy: ProductSortBy.NEWEST, limit: 2, categoryId: 'cat-1' } as any);
      expect(page.total).toBe(58);
      const listWhere = (findMany.mock.calls[0] as unknown as any[])[0].where;
      expect((count.mock.calls[0] as unknown as any[])[0].where).toEqual(listWhere);
      expect(listWhere.categoryId).toBe('cat-1');
    });

    it('price sort: the total is every matching product, on every page', async () => {
      const { service } = setup(ids, ids);
      const first = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 2 } as any);
      const last = await service.findAll({ sortBy: ProductSortBy.PRICE_ASC, limit: 2, cursor: 'd' } as any);
      expect(first.total).toBe(5);
      expect(last.total).toBe(5);
    });
  });
});

// The edit page: only real changes are written and recorded, a published product keeps its shop address,
// and the colours include the ones hidden from the shop.
describe('ProductsService.updateVariant (audit)', () => {
  it('records a price change with the old and the new price, and who made it', async () => {
    const { service, auditCreate } = setup({ pricePaise: 100000, compareAtPaise: null });
    await service.updateVariant('p1', 'v1', { pricePaise: 120000 } as any, 'user-1');
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'variant.updated', entityType: 'product_variant', entityId: 'v1', actorId: 'user-1',
        beforeState: { pricePaise: 100000 }, afterState: { pricePaise: 120000 },
        metadata: { productId: 'p1', sku: 'SKU-1' },
      }),
    });
  });

  it('writes nothing when the values sent are the values already stored', async () => {
    const { service, update, auditCreate } = setup({ pricePaise: 100000, compareAtPaise: null });
    await service.updateVariant('p1', 'v1', { pricePaise: 100000, color: 'Red', active: true } as any, 'user-1');
    expect(update).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('only the fields that differ are written', async () => {
    const { service, update } = setup({ pricePaise: 100000, compareAtPaise: null });
    await service.updateVariant('p1', 'v1', { pricePaise: 100000, color: 'Crimson', active: false } as any, 'user-1');
    expect((update.mock.calls[0] as any[])[0].data).toEqual({ color: 'Crimson', active: false });
  });
});

describe('ProductsService.update', () => {
  const stored = (over: any = {}) => ({ id: 'p1', title: 'Old Title', slug: 'old-title', publishStatus: 'draft', fabric: 'Silk', tags: ['a'], ...over });
  function setupProduct(product: any, slugOwner: any = null) {
    const update = jest.fn(async ({ data }: any) => ({ ...product, ...data }));
    const auditCreate = jest.fn(async () => ({}));
    const tx = { product: { update }, auditEvent: { create: auditCreate } };
    const prisma = {
      product: {
        findUnique: jest.fn(async ({ where }: any) => (where.id ? product : where.slug ? slugOwner : null)),
        findUniqueOrThrow: jest.fn(async () => product),
      },
      category: { findUnique: jest.fn(async () => ({ id: 'c1' })) },
      $transaction: jest.fn(async (work: any) => work(tx)),
    };
    return { service: new ProductsService(prisma as any), update, auditCreate };
  }

  it('a draft product\'s shop address follows its title', async () => {
    const { service, update } = setupProduct(stored());
    await service.update('p1', { title: 'New Title' } as any, 'user-1');
    expect((update.mock.calls[0] as any[])[0].data).toMatchObject({ title: 'New Title', slug: 'new-title' });
  });

  it('a published product keeps its shop address when the title changes', async () => {
    const { service, update } = setupProduct(stored({ publishStatus: 'published' }));
    await service.update('p1', { title: 'New Title' } as any, 'user-1');
    const data = (update.mock.calls[0] as any[])[0].data;
    expect(data.title).toBe('New Title');
    expect(data).not.toHaveProperty('slug');
  });

  it('refuses a title whose address another product already has', async () => {
    const { service, update } = setupProduct(stored(), { id: 'other' });
    await expect(service.update('p1', { title: 'New Title' } as any, 'user-1')).rejects.toThrow('already exists');
    expect(update).not.toHaveBeenCalled();
  });

  it('records what changed, from what, and who changed it', async () => {
    const { service, auditCreate } = setupProduct(stored());
    await service.update('p1', { fabric: 'Cotton', tags: ['a'] } as any, 'user-1');
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'product.updated', entityType: 'product', entityId: 'p1', actorId: 'user-1',
        beforeState: { fabric: 'Silk' }, afterState: { fabric: 'Cotton' }, // the unchanged tags are not repeated
      }),
    });
  });

  it('writes nothing when nothing really changed', async () => {
    const { service, update, auditCreate } = setupProduct(stored());
    await service.update('p1', { title: 'Old Title', fabric: 'Silk', tags: ['a'] } as any, 'user-1');
    expect(update).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('a product that does not exist is "not found"', async () => {
    const { service } = setupProduct(null);
    await expect(service.update('nope', { fabric: 'x' } as any, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProductsService.findOneAdmin', () => {
  it('asks for every colour, hidden ones included, with its stock', async () => {
    const findUnique = jest.fn(async () => ({ id: 'p1', variants: [] }));
    const service = new ProductsService({ product: { findUnique } } as any);
    await service.findOneAdmin('p1');
    const args = (findUnique.mock.calls[0] as any[])[0];
    expect(args.include.variants.include).toEqual({ inventory: true });
    expect(args.include.variants.where).toBeUndefined(); // no "active only" filter
  });

  it('is "not found" for an unknown product', async () => {
    const service = new ProductsService({ product: { findUnique: jest.fn(async () => null) } } as any);
    await expect(service.findOneAdmin('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
