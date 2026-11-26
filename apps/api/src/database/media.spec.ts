// Product photos against a REAL Postgres (MediaService): many uploads at once must never exceed the limit or share a
// position, and reordering, removing and the bag/wishlist/order thumbnails must hold with real rows. Skipped unless
// DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- database/media)
// The test creates its own category, product and colours, keeps files in a temporary folder, and deletes everything afterwards.
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { MEDIA } from '@juhar/shared';
import { MediaService } from '../modules/media/media.service';
import { LocalStorage } from '../modules/media/storage';
import { ProductsService } from '../modules/products/products.service';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;

describeDb('product photos (real Postgres)', () => {
  const prisma = new PrismaClient();
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  let dir = '';
  let media: MediaService;
  let categoryId = '';
  let productId = '';
  let blue = '';
  let red = '';

  const photo = (shade = 100) =>
    sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: shade, g: 60, b: 80 } } }).jpeg().toBuffer().then((buffer) => ({ buffer }));
  const filesStored = async () => (await readdir(join(dir, 'products', productId)).catch(() => [])).length;
  const rows = () => prisma.productMedia.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'juhar-photos-'));
    media = new MediaService(prisma as any, new LocalStorage(dir, 'https://photos.test'));
    categoryId = (await prisma.category.create({ data: { slug: `ph-${tag}`, name: 'Photo test' } })).id;
    const product = await prisma.product.create({ data: { slug: `ph-${tag}`, title: `Photo test ${tag}`, categoryId, publishStatus: 'published' } });
    productId = product.id;
    blue = (await prisma.productVariant.create({ data: { productId, sku: `PH-${tag}-B`, color: 'Blue', pricePaise: 100000 } })).id;
    red = (await prisma.productVariant.create({ data: { productId, sku: `PH-${tag}-R`, color: 'Red', pricePaise: 100000 } })).id;
    await prisma.inventory.create({ data: { variantId: blue, onHand: 5 } });
    await prisma.inventory.create({ data: { variantId: red, onHand: 5 } });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { entityType: 'product', entityId: productId } });
    await prisma.productMedia.deleteMany({ where: { productId } });
    await prisma.inventory.deleteMany({ where: { variantId: { in: [blue, red] } } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await rm(dir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  it('twelve uploads at the same moment: exactly the limit is kept, in distinct positions, and the refused ones leave no files', async () => {
    const files = await Promise.all(Array.from({ length: 12 }, (_, i) => photo(60 + i * 10)));
    const results = await Promise.allSettled(files.map((file, i) => media.add(productId, file, { altText: `photo ${i}` }, undefined)));

    const kept = await rows();
    expect(kept).toHaveLength(MEDIA.MAX_PER_PRODUCT);
    expect(kept.map((m) => m.sortOrder)).toEqual(Array.from({ length: MEDIA.MAX_PER_PRODUCT }, (_, i) => i)); // 0..9, no gaps, no repeats
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(MEDIA.MAX_PER_PRODUCT);
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(refused).toHaveLength(2);
    refused.forEach((r) => expect(r.reason.message).toBe('PHOTO_LIMIT_REACHED'));
    expect(await filesStored()).toBe(MEDIA.MAX_PER_PRODUCT * 2); // a large and a small copy of each kept photo, nothing else
    expect(await prisma.auditEvent.count({ where: { entityType: 'product', entityId: productId, action: 'product.photo_added' } })).toBe(MEDIA.MAX_PER_PRODUCT);
  });

  it('reorders: the new first photo is the cover of the shop card', async () => {
    const before = (await rows()).map((m) => m.id);
    const reversed = [...before].reverse();
    await media.reorder(productId, reversed);
    expect((await rows()).map((m) => m.id)).toEqual(reversed);

    const products = new ProductsService(prisma as any, media);
    const card = (await products.findAll({ search: tag, limit: 5 } as any)).items[0];
    const cover = (await rows())[0];
    expect(card.primaryImage).toEqual({ url: `https://photos.test/${cover.thumbnailKey}`, alt: cover.altText });
    expect(card.primaryImage!.url).toContain('-thumb.webp');
  });

  it('the product page lists every photo with the large copy first in each pair', async () => {
    const products = new ProductsService(prisma as any, media);
    const detail = await products.findBySlug(`ph-${tag}`);
    expect(detail.media).toHaveLength(MEDIA.MAX_PER_PRODUCT);
    for (const item of detail.media) {
      expect(item.url).toMatch(/^https:\/\/photos\.test\/products\/.+\.webp$/);
      expect(item.url).not.toContain('-thumb');
      expect(item.thumbnailUrl).toContain('-thumb.webp');
    }
    expect(detail.media.map((m) => m.sortOrder)).toEqual(Array.from({ length: MEDIA.MAX_PER_PRODUCT }, (_, i) => i));
  });

  it('removes a photo: the others close up and its two files are deleted', async () => {
    const [first, second] = await rows();
    await media.remove(productId, first.id);
    const left = await rows();
    expect(left).toHaveLength(MEDIA.MAX_PER_PRODUCT - 1);
    expect(left[0].id).toBe(second.id);
    expect(left.map((m) => m.sortOrder)).toEqual(Array.from({ length: left.length }, (_, i) => i));
    expect(await filesStored()).toBe((MEDIA.MAX_PER_PRODUCT - 1) * 2);
    // and there is room for one more again
    await media.add(productId, await photo(), {});
    expect(await rows()).toHaveLength(MEDIA.MAX_PER_PRODUCT);
  });

  it('the bag, wishlist and orders show the colour\'s own photo, else the whole saree\'s, else the first', async () => {
    const all = await rows();
    const url = (m: { thumbnailKey: string | null }) => `https://photos.test/${m.thumbnailKey}`;
    await prisma.productMedia.updateMany({ where: { productId }, data: { variantId: null } }); // every photo shows the whole saree

    // only red has a photo of its own: blue falls back to the first whole-saree photo
    await media.update(productId, all[3].id, { variantId: red });
    let result = await media.thumbnailsForVariants([blue, red]);
    expect(result.get(red)).toBe(url(all[3]));
    expect(result.get(blue)).toBe(url(all[0]));

    // blue gets one too (not the first photo): it now wins for blue
    await media.update(productId, all[6].id, { variantId: blue });
    result = await media.thumbnailsForVariants([blue, red]);
    expect(result.get(blue)).toBe(url(all[6]));
    expect(result.get(red)).toBe(url(all[3]));

    // the whole saree has no photo of its own any more, only colour photos: anything beats a grey box
    await prisma.productMedia.updateMany({ where: { productId, variantId: null }, data: { variantId: red } });
    await media.update(productId, all[6].id, { variantId: red });
    result = await media.thumbnailsForVariants([blue]);
    expect(result.get(blue)).toBe(url(all[0]));
  });

  it('changes the colour of a photo only to a colour of this product', async () => {
    const [any] = await rows();
    const stranger = (await prisma.productVariant.findFirst({ where: { productId: { not: productId } } }))?.id;
    if (stranger) {
      await expect(media.update(productId, any.id, { variantId: stranger })).rejects.toThrow('MEDIA_VARIANT_MISMATCH');
    }
  });

  it('deleting the product takes its photo rows with it (the files are not touched by the database)', async () => {
    const extra = await prisma.product.create({ data: { slug: `ph2-${tag}`, title: `Photo test two ${tag}`, categoryId } });
    await prisma.productMedia.create({ data: { productId: extra.id, objectKey: 'k.webp', type: 'image', mimeType: 'image/webp' } });
    await prisma.product.delete({ where: { id: extra.id } });
    expect(await prisma.productMedia.count({ where: { productId: extra.id } })).toBe(0);
  });
});
