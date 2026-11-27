// The sample pictures against a REAL Postgres: which sarees get them, that they go through the real photo pipeline
// (rows, two files each, positions, colours, audit), that a saree with a real photo is left alone, and that removing
// them touches only the samples. Skipped unless DB_TESTS=1 (CI runs it):
//   (cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- sample-photos)
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { MediaService } from '../modules/media/media.service';
import { LocalStorage } from '../modules/media/storage';
import { addSamplePhotos, removeSamplePhotos } from '../common/sample-photos/seed';
import { SAMPLE_ALT_PREFIX } from '../common/sample-photos/plan';

const describeDb = process.env.DB_TESTS === '1' ? describe : describe.skip;
jest.setTimeout(60_000);

describeDb('sample pictures (real Postgres)', () => {
  const prisma = new PrismaClient();
  const tag = randomUUID().replace(/-/g, '').slice(0, 8);
  const prefix = `sp-${tag}-`;
  let dir = '';
  let media: MediaService;
  let categoryId = '';
  const productIds: string[] = [];

  async function saree(key: string, colours: { color: string; name: string }[], status = 'published') {
    const p = await prisma.product.create({ data: { slug: `${prefix}${key}`, title: `Sample test ${key}`, categoryId, publishStatus: status } });
    productIds.push(p.id);
    const variantIds: string[] = [];
    for (const [i, c] of colours.entries()) {
      const v = await prisma.productVariant.create({ data: { productId: p.id, sku: `SP-${tag}-${key}-${i}`, color: c.color, name: c.name, pricePaise: 100000 + i, sortOrder: i } });
      await prisma.inventory.create({ data: { variantId: v.id, onHand: 5 } });
      variantIds.push(v.id);
    }
    return { id: p.id, slug: p.slug, variantIds };
  }
  const photosOf = (productId: string) => prisma.productMedia.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
  const filesOf = async (productId: string) => (await readdir(join(dir, 'products', productId)).catch(() => [])).length;

  let two: Awaited<ReturnType<typeof saree>>;
  let one: Awaited<ReturnType<typeof saree>>;
  let hasReal: Awaited<ReturnType<typeof saree>>;
  let noColours: Awaited<ReturnType<typeof saree>>;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'juhar-sample-photos-'));
    media = new MediaService(prisma as never, new LocalStorage(dir, 'https://photos.test'));
    categoryId = (await prisma.category.create({ data: { slug: `sp-${tag}`, name: 'Sample photos test' } })).id;
    two = await saree('two', [{ color: 'Maroon', name: 'Maroon & Gold' }, { color: 'Teal', name: 'Teal & Silver' }]);
    one = await saree('one', [{ color: 'Mustard', name: 'Mustard & Terracotta' }], 'draft');
    hasReal = await saree('real', [{ color: 'Red', name: 'Red & Gold' }]);
    noColours = await saree('none', []);
    // one saree already has a REAL photo (not a sample)
    const real = await sharp({ create: { width: 900, height: 1200, channels: 3, background: { r: 20, g: 90, b: 60 } } }).jpeg().toBuffer();
    await media.add(hasReal.id, { buffer: real }, { altText: 'The real saree, laid flat' });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { entityType: 'product', entityId: { in: productIds } } });
    await prisma.productMedia.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.inventory.deleteMany({ where: { variant: { productId: { in: productIds } } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await rm(dir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  it('gives the sarees that have no photo their pictures, and leaves the others alone', async () => {
    const lines: string[] = [];
    const result = await addSamplePhotos(prisma, media, { prefix, limit: null }, (l) => lines.push(l));

    expect(result).toEqual({ sarees: 2, photos: 6 + 5, skipped: 1 }); // two colours: 2 full + 4 close-ups; one colour: 1 full + 4
    expect(lines.length).toBe(2);

    const twoPhotos = await photosOf(two.id);
    expect(twoPhotos).toHaveLength(6);
    expect(twoPhotos.map((p) => p.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(twoPhotos[0].variantId).toBe(two.variantIds[0]); // the cover shows the first colour
    expect(twoPhotos[1].variantId).toBe(two.variantIds[1]); // and the next one the second colour
    expect(twoPhotos.slice(2).every((p) => p.variantId === two.variantIds[0])).toBe(true);
    expect(twoPhotos.every((p) => p.altText?.startsWith(SAMPLE_ALT_PREFIX))).toBe(true);
    expect(twoPhotos.every((p) => p.mimeType === 'image/webp' && Math.max(p.width!, p.height!) === 1600)).toBe(true);
    expect(await filesOf(two.id)).toBe(12); // a large and a small copy of each, exactly as a real upload

    const onePhotos = await photosOf(one.id);
    expect(onePhotos).toHaveLength(5);
    expect(onePhotos.every((p) => p.variantId === null)).toBe(true); // one colour: the pictures show the whole saree

    // the saree with a real photo is untouched, and so is one with no colours (nothing to draw)
    const realPhotos = await photosOf(hasReal.id);
    expect(realPhotos).toHaveLength(1);
    expect(realPhotos[0].altText).toBe('The real saree, laid flat');
    expect(await photosOf(noColours.id)).toHaveLength(0);
  });

  it('records each picture in the audit trail like any photo', async () => {
    const audits = await prisma.auditEvent.count({ where: { entityType: 'product', entityId: two.id, action: 'product.photo_added' } });
    expect(audits).toBe(6);
  });

  it('run again, it adds nothing: every saree that can have pictures already does', async () => {
    const again = await addSamplePhotos(prisma, media, { prefix, limit: null });
    expect(again).toEqual({ sarees: 0, photos: 0, skipped: 3 });
  });

  it('removes only the sample pictures and their files, never a real photo', async () => {
    // a real photo on a saree that also has sample pictures
    const real = await sharp({ create: { width: 900, height: 1200, channels: 3, background: { r: 120, g: 20, b: 60 } } }).jpeg().toBuffer();
    await media.add(two.id, { buffer: real }, { altText: 'A real detail photo' });
    expect(await photosOf(two.id)).toHaveLength(7);

    const lines: string[] = [];
    const removed = await removeSamplePhotos(prisma, media, { prefix }, (l) => lines.push(l));
    expect(removed).toEqual({ sarees: 2, photos: 6 + 5, skipped: 0 });

    const left = await photosOf(two.id);
    expect(left.map((p) => p.altText)).toEqual(['A real detail photo']);
    expect(left[0].sortOrder).toBe(0); // the order closes up
    expect(await filesOf(two.id)).toBe(2); // only the real photo's two files remain
    expect(await photosOf(one.id)).toHaveLength(0);
    expect((await photosOf(hasReal.id))[0].altText).toBe('The real saree, laid flat');
  });

  it('then sample pictures can be added again to the sarees with none', async () => {
    const again = await addSamplePhotos(prisma, media, { prefix, limit: null });
    expect(again.sarees).toBe(1); // "one" again; "two" now has a real photo and "real" always had one
    expect(again.skipped).toBe(2);
  });

  it('--limit stops after that many sarees', async () => {
    await removeSamplePhotos(prisma, media, { prefix });
    const extra = [await saree('x1', [{ color: 'Red', name: 'Red' }]), await saree('x2', [{ color: 'Red', name: 'Red' }])];
    const result = await addSamplePhotos(prisma, media, { prefix: `${prefix}x`, limit: 1 });
    expect(result.sarees).toBe(1);
    const counts = await Promise.all(extra.map(async (p) => (await photosOf(p.id)).length));
    expect(counts.sort()).toEqual([0, 5]);
  });

  it('the prefix keeps it to the sarees asked for', async () => {
    const other = await saree('zz', [{ color: 'Blue', name: 'Blue' }]);
    await addSamplePhotos(prisma, media, { prefix: `${prefix}x`, limit: null });
    expect(await photosOf(other.id)).toHaveLength(0);
  });
});
