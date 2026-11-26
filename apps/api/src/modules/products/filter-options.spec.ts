import { INestApplication } from '@nestjs/common';
import { testMedia } from '../media/test-media';
import { Test } from '@nestjs/testing';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

// GET /products/filters: what the shop's filter lists can be chosen from.
function fakePrisma(data: { fabrics?: any[]; weaves?: any[]; colors?: any[]; min?: number | null; max?: number | null }) {
  return {
    product: {
      groupBy: jest.fn(async ({ by }: any) =>
        by[0] === 'fabric' ? (data.fabrics ?? []).map((fabric) => ({ fabric })) : (data.weaves ?? []).map((weaveMethod) => ({ weaveMethod })),
      ),
    },
    productVariant: {
      groupBy: jest.fn(async () => (data.colors ?? []).map((color) => ({ color }))),
      aggregate: jest.fn(async () => ({ _min: { pricePaise: data.min ?? null }, _max: { pricePaise: data.max ?? null } })),
    },
  };
}

describe('ProductsService.findFilterOptions', () => {
  it('lists each fabric, weave and colour once, in alphabetical order, with the price range', async () => {
    const prisma = fakePrisma({
      fabrics: ['Tussar Silk', 'Handloom Cotton', 'Pure Silk'],
      weaves: ['Pasapalli', 'Bomkai'],
      colors: ['Navy', 'Maroon', 'Ivory'],
      min: 120000,
      max: 1490000,
    });
    const options = await new ProductsService(prisma as any, testMedia()).findFilterOptions();
    expect(options).toEqual({
      fabrics: ['Handloom Cotton', 'Pure Silk', 'Tussar Silk'],
      weaveMethods: ['Bomkai', 'Pasapalli'],
      colors: ['Ivory', 'Maroon', 'Navy'],
      minPricePaise: 120000,
      maxPricePaise: 1490000,
    });
  });

  it('treats "Maroon" and "maroon" as one filter (the list filters ignore capitals) and drops blanks', async () => {
    const prisma = fakePrisma({ colors: ['Maroon', 'maroon', ' MAROON ', '', '   ', null, 'Teal'] });
    expect((await new ProductsService(prisma as any, testMedia()).findFilterOptions()).colors).toEqual(['Maroon', 'Teal']);
  });

  it('has empty lists and a null price range when nothing is for sale', async () => {
    const options = await new ProductsService(fakePrisma({}) as any, testMedia()).findFilterOptions();
    expect(options).toEqual({ fabrics: [], weaveMethods: [], colors: [], minPricePaise: null, maxPricePaise: null });
  });

  it('only looks at what customers can see: published products, active variants', async () => {
    const prisma = fakePrisma({});
    await new ProductsService(prisma as any, testMedia()).findFilterOptions();
    const fabricWhere = (prisma.product.groupBy.mock.calls[0] as any[])[0].where;
    expect(fabricWhere).toMatchObject({ publishStatus: 'published', variants: { some: { active: true } } });
    const colorWhere = (prisma.productVariant.groupBy.mock.calls[0] as any[])[0].where;
    expect(colorWhere).toMatchObject({ active: true, product: { publishStatus: 'published' } });
    const priceWhere = (prisma.productVariant.aggregate.mock.calls[0] as any[])[0].where;
    expect(priceWhere).toMatchObject({ active: true, product: { publishStatus: 'published' } });
  });
});

describe('GET /api/v1/products/filters over HTTP', () => {
  let app: INestApplication;
  let base: string;
  const findBySlug = jest.fn(async (slug: string) => ({ slug }));
  const findFilterOptions = jest.fn(async () => ({ fabrics: ['Pure Silk'], weaveMethods: [], colors: [], minPricePaise: 1, maxPricePaise: 2 }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: { findBySlug, findFilterOptions, findAll: jest.fn() } }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as any).port}`;
  });
  afterAll(() => app.close());

  it('is public and answers with the filter options, not with a product called "filters"', async () => {
    const res = await fetch(`${base}/api/v1/products/filters`);
    const json = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(json.data.fabrics).toEqual(['Pure Silk']);
    expect(findFilterOptions).toHaveBeenCalledTimes(1);
    expect(findBySlug).not.toHaveBeenCalledWith('filters');
  });

  it('a real product slug still reaches the product detail', async () => {
    const res = await fetch(`${base}/api/v1/products/silk-saree`);
    expect(((await res.json()) as any).data.slug).toBe('silk-saree');
    expect(findBySlug).toHaveBeenCalledWith('silk-saree');
  });
});
