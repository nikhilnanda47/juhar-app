import sharp from 'sharp';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MEDIA } from '@juhar/shared';
import { MediaService } from './media.service';
import { LocalStorage } from './storage';

const PRODUCT = '11111111-1111-4111-8111-111111111111';
const OTHER_PRODUCT = '22222222-2222-4222-8222-222222222222';
const BLUE = '33333333-3333-4333-8333-333333333333'; // a colour of PRODUCT
const RED = '44444444-4444-4444-8444-444444444444'; // a colour of PRODUCT
const STRANGER = '55555555-5555-4555-8555-555555555555'; // a colour of OTHER_PRODUCT

/** An in-memory stand-in for the database and for the file storage, enough to see what the service does */
function setup(options: { failCreate?: boolean; failSecondPut?: boolean } = {}) {
  let counter = 0;
  const media: any[] = [];
  const audits: any[] = [];
  const files = new Map<string, Buffer>();
  const variants = [
    { id: BLUE, productId: PRODUCT }, { id: RED, productId: PRODUCT }, { id: STRANGER, productId: OTHER_PRODUCT },
  ];
  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([key, value]: [string, any]) => (value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value));

  const productMedia = {
    findMany: jest.fn(async ({ where, orderBy, select }: any = {}) => {
      let rows = media.filter((row) => matches(row, where));
      if (orderBy?.sortOrder === 'asc') rows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
      return rows.map((row) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : { ...row }));
    }),
    findFirst: jest.fn(async ({ where }: any) => media.find((row) => matches(row, where)) ?? null),
    count: jest.fn(async ({ where }: any) => media.filter((row) => matches(row, where)).length),
    create: jest.fn(async ({ data }: any) => {
      if (options.failCreate) throw new Error('database is down');
      const row = { id: `aaaaaaaa-0000-4000-8000-${String(++counter).padStart(12, '0')}`, ...data };
      media.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => { Object.assign(media.find((row) => row.id === where.id)!, data); }),
    delete: jest.fn(async ({ where }: any) => { media.splice(media.findIndex((row) => row.id === where.id), 1); }),
  };
  const tx = {
    productMedia,
    auditEvent: { create: jest.fn(async ({ data }: any) => { audits.push(data); }) },
    $queryRaw: jest.fn(async () => []),
  };
  const prisma: any = {
    product: { findUnique: jest.fn(async ({ where }: any) => (where.id === PRODUCT || where.id === OTHER_PRODUCT ? { id: where.id } : null)) },
    productVariant: {
      findFirst: jest.fn(async ({ where }: any) => variants.find((v) => v.id === where.id && v.productId === where.productId) ?? null),
      findMany: jest.fn(async ({ where }: any) => variants.filter((v) => where.id.in.includes(v.id))),
    },
    productMedia,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const real = new LocalStorage('/tmp/never-written', 'https://photos.test');
  let puts = 0;
  const storage: any = {
    kind: 'local',
    urlFor: (key: string) => real.urlFor(key),
    put: jest.fn(async (key: string, body: Buffer) => {
      if (options.failSecondPut && ++puts === 2) throw new Error('storage is down');
      files.set(key, body);
    }),
    delete: jest.fn(async (keys: string[]) => { keys.forEach((key) => files.delete(key)); }),
  };
  const service = new MediaService(prisma, storage);
  return { service, prisma, media, audits, files, storage, tx };
}

const photo = (width = 1200, height = 1600) =>
  sharp({ create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } } }).jpeg().toBuffer().then((buffer) => ({ buffer }));
const codeOf = async (promise: Promise<unknown>) => { try { await promise; } catch (e: any) { return e; } throw new Error('expected a refusal'); };

describe('MediaService.add', () => {
  it('shrinks the photo, keeps both copies, saves it last in the order and records who did it', async () => {
    const { service, media, audits, files } = setup();
    const list = await service.add(PRODUCT, await photo(), { altText: '  Sapphire, laid flat  ' }, 'admin-1');

    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ productId: PRODUCT, type: 'image', mimeType: 'image/webp', altText: 'Sapphire, laid flat', sortOrder: 0, variantId: null });
    expect(media[0].objectKey).toMatch(new RegExp(`^products/${PRODUCT}/[0-9a-f-]{36}\\.webp$`));
    expect(media[0].thumbnailKey).toBe(media[0].objectKey.replace('.webp', '-thumb.webp'));
    expect([...files.keys()].sort()).toEqual([media[0].objectKey, media[0].thumbnailKey].sort());
    expect(media[0]).toMatchObject({ width: 1200, height: 1600, sizeBytes: files.get(media[0].objectKey)!.length });
    expect(audits).toEqual([expect.objectContaining({ action: 'product.photo_added', entityType: 'product', entityId: PRODUCT, actorType: 'admin', actorId: 'admin-1' })]);
    expect(list).toEqual([expect.objectContaining({ url: `https://photos.test/${media[0].objectKey}`, thumbnailUrl: `https://photos.test/${media[0].thumbnailKey}`, sortOrder: 0 })]);
  });

  it('puts each new photo after the others', async () => {
    const { service, media } = setup();
    await service.add(PRODUCT, await photo(), {});
    await service.add(PRODUCT, await photo(), {});
    const list = await service.add(PRODUCT, await photo(), {});
    expect(media.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
    expect(list.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
  });

  it('takes the product row first, so two uploads cannot take the same place', async () => {
    const { service, tx } = setup();
    await service.add(PRODUCT, await photo(), {});
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('can tie the photo to one of the product\'s own colours, and to no other', async () => {
    const { service, media } = setup();
    await service.add(PRODUCT, await photo(), { variantId: BLUE });
    expect(media[0].variantId).toBe(BLUE);
    const error = await codeOf(service.add(PRODUCT, await photo(), { variantId: STRANGER }));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe('MEDIA_VARIANT_MISMATCH');
    expect(media).toHaveLength(1);
  });

  it('refuses an 11th photo, and stores nothing', async () => {
    const { service, media, files } = setup();
    for (let i = 0; i < MEDIA.MAX_PER_PRODUCT; i++) await service.add(PRODUCT, await photo(), {});
    const stored = files.size;
    const error = await codeOf(service.add(PRODUCT, await photo(), {}));
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.message).toBe('PHOTO_LIMIT_REACHED');
    expect(media).toHaveLength(MEDIA.MAX_PER_PRODUCT);
    expect(files.size).toBe(stored);
  });

  it('refuses a file that is not a photo before storing anything', async () => {
    const { service, storage, media } = setup();
    expect((await codeOf(service.add(PRODUCT, { buffer: Buffer.from('not a photo') }, {}))).message).toBe('PHOTO_NOT_AN_IMAGE');
    expect(storage.put).not.toHaveBeenCalled();
    expect(media).toHaveLength(0);
  });

  it('refuses a request with no file, and a product that does not exist', async () => {
    const { service } = setup();
    expect((await codeOf(service.add(PRODUCT, undefined, {}))).message).toBe('PHOTO_NOT_AN_IMAGE');
    const missing = await codeOf(service.add('99999999-9999-4999-8999-999999999999', await photo(), {}));
    expect(missing).toBeInstanceOf(NotFoundException);
  });

  it('removes the files it stored when the database refuses the row (nothing is left behind)', async () => {
    const { service, files, media } = setup({ failCreate: true });
    await expect(service.add(PRODUCT, await photo(), {})).rejects.toThrow('database is down');
    expect(media).toHaveLength(0);
    expect(files.size).toBe(0);
  });

  it('removes the first file when the second cannot be stored', async () => {
    const { service, files, media } = setup({ failSecondPut: true });
    await expect(service.add(PRODUCT, await photo(), {})).rejects.toThrow('storage is down');
    expect(media).toHaveLength(0);
    expect(files.size).toBe(0);
  });
});

describe('MediaService.update', () => {
  const withOne = async () => {
    const ctx = setup();
    await ctx.service.add(PRODUCT, await photo(), { altText: 'first' });
    return { ...ctx, id: ctx.media[0].id as string };
  };

  it('changes the description and the colour, and records what it was and what it is', async () => {
    const { service, media, audits, id } = await withOne();
    await service.update(PRODUCT, id, { altText: 'Sapphire, laid flat', variantId: BLUE }, 'admin-1');
    expect(media[0]).toMatchObject({ altText: 'Sapphire, laid flat', variantId: BLUE });
    const audit = audits[audits.length - 1];
    expect(audit).toMatchObject({ action: 'product.photo_updated', actorId: 'admin-1' });
    expect(audit.beforeState).toEqual({ mediaId: id, altText: 'first', variantId: null });
    expect(audit.afterState).toEqual({ mediaId: id, altText: 'Sapphire, laid flat', variantId: BLUE });
  });

  it('clears a description with an empty text or null, and a colour with null', async () => {
    const { service, media, id } = await withOne();
    await service.update(PRODUCT, id, { altText: '   ' });
    expect(media[0].altText).toBeNull();
    await service.update(PRODUCT, id, { variantId: RED });
    await service.update(PRODUCT, id, { variantId: null });
    expect(media[0].variantId).toBeNull();
  });

  it('writes nothing when nothing really changes', async () => {
    const { service, audits, prisma, id } = await withOne();
    const before = audits.length;
    prisma.$transaction.mockClear();
    await service.update(PRODUCT, id, { altText: 'first' });
    expect(audits).toHaveLength(before);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses another product\'s colour, and a photo that is not this product\'s', async () => {
    const { service, id } = await withOne();
    expect((await codeOf(service.update(PRODUCT, id, { variantId: STRANGER }))).message).toBe('MEDIA_VARIANT_MISMATCH');
    const error = await codeOf(service.update(OTHER_PRODUCT, id, { altText: 'x' }));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.message).toBe('MEDIA_NOT_FOUND');
  });
});

describe('MediaService.reorder', () => {
  const withThree = async () => {
    const ctx = setup();
    for (let i = 0; i < 3; i++) await ctx.service.add(PRODUCT, await photo(), { altText: `photo ${i}` });
    return { ...ctx, ids: ctx.media.map((m) => m.id as string) };
  };

  it('puts the photos in the new order and the first becomes the cover', async () => {
    const { service, audits, ids } = await withThree();
    const list = await service.reorder(PRODUCT, [ids[2], ids[0], ids[1]], 'admin-1');
    expect(list.map((m) => m.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(list.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
    const audit = audits[audits.length - 1];
    expect(audit).toMatchObject({ action: 'product.photos_reordered', actorId: 'admin-1' });
    expect(audit.beforeState).toEqual({ order: ids });
    expect(audit.afterState).toEqual({ order: [ids[2], ids[0], ids[1]] });
  });

  it('writes nothing when the order is already this one', async () => {
    const { service, audits, ids } = await withThree();
    const before = audits.length;
    await service.reorder(PRODUCT, ids);
    expect(audits).toHaveLength(before);
  });

  it.each([
    ['a photo missing', (ids: string[]) => [ids[0], ids[1]]],
    ['a photo twice', (ids: string[]) => [ids[0], ids[0], ids[1]]],
    ['an unknown photo', (ids: string[]) => [ids[0], ids[1], '99999999-9999-4999-8999-999999999999']],
    ['one more than there are', (ids: string[]) => [...ids, '99999999-9999-4999-8999-999999999999']],
  ])('refuses a list with %s (the page was out of date)', async (_name, make) => {
    const { service, media, ids } = await withThree();
    const error = await codeOf(service.reorder(PRODUCT, make(ids)));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe('MEDIA_ORDER_MISMATCH');
    expect(media.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe('MediaService.remove', () => {
  it('removes the photo and both its files, and the others close up', async () => {
    const ctx = setup();
    for (let i = 0; i < 3; i++) await ctx.service.add(PRODUCT, await photo(), {});
    const [first, second, third] = ctx.media.map((m) => ({ ...m }));
    const list = await ctx.service.remove(PRODUCT, second.id, 'admin-1');

    expect(list.map((m) => m.id)).toEqual([first.id, third.id]);
    expect(list.map((m) => m.sortOrder)).toEqual([0, 1]);
    expect(ctx.files.has(second.objectKey)).toBe(false);
    expect(ctx.files.has(second.thumbnailKey)).toBe(false);
    expect(ctx.files.has(first.objectKey)).toBe(true);
    expect(ctx.audits[ctx.audits.length - 1]).toMatchObject({ action: 'product.photo_removed', actorId: 'admin-1', beforeState: expect.objectContaining({ mediaId: second.id, position: 2 }) });
  });

  it('is a "not found" for a photo that is not there or belongs to another product, and deletes no files', async () => {
    const ctx = setup();
    await ctx.service.add(PRODUCT, await photo(), {});
    const error = await codeOf(ctx.service.remove(OTHER_PRODUCT, ctx.media[0].id));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(ctx.storage.delete).not.toHaveBeenCalled();
    expect(ctx.media).toHaveLength(1);
  });

  it('still succeeds when the files cannot be deleted (only wasted space)', async () => {
    const ctx = setup();
    await ctx.service.add(PRODUCT, await photo(), {});
    ctx.storage.delete.mockRejectedValueOnce(new Error('bucket unreachable'));
    await expect(ctx.service.remove(PRODUCT, ctx.media[0].id)).resolves.toEqual([]);
    expect(ctx.media).toHaveLength(0);
  });
});

describe('MediaService.thumbnailsForVariants', () => {
  const row = (productId: string, variantId: string | null, sortOrder: number, name: string) =>
    ({ id: name, productId, variantId, type: 'image', objectKey: `${name}.webp`, thumbnailKey: `${name}-thumb.webp`, sortOrder });

  it('prefers a photo of that colour, then a photo of the whole saree, then the first photo', async () => {
    const { service, media } = setup();
    media.push(row(PRODUCT, RED, 0, 'red-photo'), row(PRODUCT, null, 1, 'whole'), row(PRODUCT, RED, 2, 'red-2'));
    const result = await service.thumbnailsForVariants([BLUE, RED]);
    expect(result.get(RED)).toBe('https://photos.test/red-photo-thumb.webp');
    expect(result.get(BLUE)).toBe('https://photos.test/whole-thumb.webp'); // no photo of its own: the whole-saree one

    media.length = 0;
    media.push(row(PRODUCT, RED, 0, 'red-only'));
    expect((await service.thumbnailsForVariants([BLUE])).get(BLUE)).toBe('https://photos.test/red-only-thumb.webp'); // anything beats a grey box
  });

  it('leaves out colours of products that have no photos, and asks nothing for an empty list', async () => {
    const { service, prisma } = setup();
    expect((await service.thumbnailsForVariants([STRANGER])).size).toBe(0);
    prisma.productVariant.findMany.mockClear();
    expect((await service.thumbnailsForVariants([])).size).toBe(0);
    expect(prisma.productVariant.findMany).not.toHaveBeenCalled();
  });

  it('asks the database once for all of them, not once per colour', async () => {
    const { service, prisma } = setup();
    await service.thumbnailsForVariants([BLUE, RED, STRANGER, BLUE]);
    expect(prisma.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.productMedia.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('MediaService.card and present', () => {
  it('give the small copy for a card (falling back to the large one) and the large one for the page', () => {
    const { service } = setup();
    expect(service.card({ objectKey: 'a.webp', thumbnailKey: 'a-thumb.webp', altText: 'x' })).toEqual({ url: 'https://photos.test/a-thumb.webp', alt: 'x' });
    expect(service.card({ objectKey: 'a.webp', thumbnailKey: null, altText: null })).toEqual({ url: 'https://photos.test/a.webp', alt: null });
    expect(service.card(undefined)).toBeNull();
    expect(service.present({ id: '1', objectKey: 'a.webp', thumbnailKey: 'a-thumb.webp', type: 'image', altText: null, sortOrder: 0, variantId: null, width: 10, height: 20 }))
      .toMatchObject({ url: 'https://photos.test/a.webp', thumbnailUrl: 'https://photos.test/a-thumb.webp' });
  });
});
