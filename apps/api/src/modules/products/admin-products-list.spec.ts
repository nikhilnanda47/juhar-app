import { ValidationPipe } from '@nestjs/common';
import { testMedia } from '../media/test-media';
import 'reflect-metadata';
import { AdminProductQueryDto } from './dto';
import { ProductsAdminController } from './products.controller';
import { ProductsService } from './products.service';

// The admin catalog list: its query is validated and converted, and it reports whole-catalog counts.
describe('admin product list query', () => {
  // the same pipe settings as main.ts
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const parse = (query: Record<string, unknown>) =>
    pipe.transform(query, { type: 'query', metatype: AdminProductQueryDto }) as Promise<AdminProductQueryDto>;

  it('turns ?limit=20 into the number 20 (the text "20" made the list fail with a 500)', async () => {
    const q = await parse({ limit: '20' });
    expect(q.limit).toBe(20);
    expect(typeof q.limit).toBe('number');
  });

  it('accepts a publish status filter', async () => {
    expect((await parse({ publishStatus: 'draft' })).publishStatus).toBe('draft');
    expect((await parse({ publishStatus: 'published', limit: '5' })).publishStatus).toBe('published');
  });

  it('refuses an unknown publish status, a limit above the maximum, and unknown parameters', async () => {
    await expect(parse({ publishStatus: 'deleted' })).rejects.toBeDefined();
    await expect(parse({ limit: '500' })).rejects.toBeDefined();
    await expect(parse({ nonsense: '1' })).rejects.toBeDefined();
  });

  it('the controller really uses this class, so the pipe checks the query (an inline type is skipped)', () => {
    const types = Reflect.getMetadata('design:paramtypes', ProductsAdminController.prototype, 'findAll');
    expect(types[0]).toBe(AdminProductQueryDto);
  });
});

describe('ProductsService.findAllAdmin counts', () => {
  function setup(rows: any[], lowStock = 4) {
    const findMany = jest.fn(async () => rows);
    const groupBy = jest.fn(async () => [
      { publishStatus: 'published', _count: { _all: 30 } },
      { publishStatus: 'draft', _count: { _all: 5 } },
    ]);
    const prisma = {
      product: { findMany, groupBy },
      productVariant: { count: jest.fn(async () => 52) },
      $queryRaw: jest.fn(async () => [{ count: BigInt(lowStock) }]),
    };
    return { service: new ProductsService(prisma as any, testMedia()), findMany, prisma };
  }

  it('returns the numbers for the whole catalog, not the page', async () => {
    const { service } = setup([{ id: 'a' }]);
    const { counts } = await service.findAllAdmin({ limit: 1 } as any);
    expect(counts).toEqual({ products: 35, published: 30, draft: 5, archived: 0, variants: 52, lowStock: 4, lowStockThreshold: 3 });
  });

  it('turns the database count (a BigInt) into an ordinary number', async () => {
    const { service } = setup([], 7);
    expect((await service.findAllAdmin({} as any)).counts.lowStock).toBe(7);
  });

  it('pages with a cursor and reports hasMore', async () => {
    const rows = [{ id: 'c' }, { id: 'b' }, { id: 'a' }]; // limit 2 asks for 3
    const { service, findMany } = setup(rows);
    const page = await service.findAllAdmin({ limit: 2, cursor: 'z' } as any);
    expect(page.items.map((p: any) => p.id)).toEqual(['c', 'b']);
    expect(page.hasMore).toBe(true);
    expect(page.cursor).toBe('b');
    expect((findMany.mock.calls[0] as any[])[0]).toMatchObject({ take: 3, cursor: { id: 'z' }, skip: 1 });
  });

  it('sorts newest first with the id as tie-break, and passes the publish filter to the database', async () => {
    const { service, findMany } = setup([]);
    await service.findAllAdmin({ publishStatus: 'draft' } as any);
    const args = (findMany.mock.calls[0] as any[])[0];
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.where.publishStatus).toBe('draft');
  });
});
