import { CategoriesService } from './categories.service';

type Category = { id: string; slug: string; name: string; imageUrl: string | null };
const cat = (id: string, name: string, imageUrl: string | null = null): Category => ({ id, slug: id, name, imageUrl });

function build(categories: Category[], photoFor: Record<string, { objectKey: string; thumbnailKey: string | null; altText: string | null } | null>) {
  const findFirst = jest.fn(async (args: { where: { product: { categoryId: string } } }) => photoFor[args.where.product.categoryId] ?? null);
  const prisma = { category: { findMany: jest.fn(async () => categories) }, productMedia: { findFirst } };
  const media = { card: (row: { objectKey: string; thumbnailKey: string | null } | null) => (row ? { url: `https://p/${row.thumbnailKey || row.objectKey}`, alt: 'x' } : null) };
  return { service: new CategoriesService(prisma as never, media as never), findFirst };
}

describe('CategoriesService.findAllActive: the picture of each category', () => {
  it("uses the photo of the category's newest published saree, with the category name as its description", async () => {
    const { service, findFirst } = build([cat('c1', 'Heritage')], { c1: { objectKey: 'a.webp', thumbnailKey: 'a-thumb.webp', altText: 'Sample picture: maroon' } });
    const [first] = await service.findAllActive();
    expect(first.coverImage).toEqual({ url: 'https://p/a-thumb.webp', alt: 'Heritage' });
    const args = findFirst.mock.calls[0][0] as unknown as { where: unknown; orderBy: unknown };
    expect(args.where).toEqual({ type: 'image', product: { categoryId: 'c1', publishStatus: 'published' } }); // drafts never lend a photo
    expect(args.orderBy).toEqual([{ product: { createdAt: 'desc' } }, { sortOrder: 'asc' }]);
  });

  it('an address set on the category itself wins, and no photo is looked up', async () => {
    const { service, findFirst } = build([cat('c1', 'Heritage', 'https://cdn/heritage.jpg')], {});
    const [first] = await service.findAllActive();
    expect(first.coverImage).toEqual({ url: 'https://cdn/heritage.jpg', alt: 'Heritage' });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('is null for a category whose sarees have no photo yet, and keeps every other field', async () => {
    const { service } = build([cat('c1', 'Everyday'), cat('c2', 'Signature')], { c2: { objectKey: 'b.webp', thumbnailKey: null, altText: null } });
    const list = await service.findAllActive();
    expect(list.map((c) => [c.slug, c.coverImage?.url ?? null])).toEqual([['c1', null], ['c2', 'https://p/b.webp']]);
  });
});
