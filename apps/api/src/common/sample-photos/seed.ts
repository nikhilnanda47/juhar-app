// Adds (or removes) sample pictures on sarees that have no photo, through the SAME code a real upload goes through
// (checks, shrinking, storage, database rows, audit), so what you see is what an upload would give.
// For a database and a photo folder on this computer only (see prisma/seed-photos.ts, which refuses anything else).
import { PrismaClient } from '@prisma/client';
import { MediaService } from '../../modules/media/media.service';
import { renderPlaceholder } from './draw';
import { planPhotos, SAMPLE_ALT_PREFIX, SamplePhotoArgs } from './plan';

export interface SampleSeedResult {
  /** sarees that got pictures */
  sarees: number;
  /** pictures added (or removed) */
  photos: number;
  /** sarees left alone because they already have photos */
  skipped: number;
}

type Db = Pick<PrismaClient, 'product' | 'productMedia' | 'productVariant'>;

/** Gives every saree without a photo its sample pictures. A saree that has any photo (real or sample) is left alone. */
export async function addSamplePhotos(
  db: Db,
  media: Pick<MediaService, 'add'>,
  args: Pick<SamplePhotoArgs, 'prefix' | 'limit'>,
  log: (line: string) => void = () => undefined,
): Promise<SampleSeedResult> {
  const products = await db.product.findMany({
    where: args.prefix ? { slug: { startsWith: args.prefix } } : {},
    select: { id: true, slug: true, title: true, _count: { select: { media: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const result: SampleSeedResult = { sarees: 0, photos: 0, skipped: 0 };
  for (const product of products) {
    if (product._count.media > 0) {
      result.skipped += 1;
      continue;
    }
    if (args.limit !== null && result.sarees >= args.limit) break;

    const variants = await db.productVariant.findMany({
      where: { productId: product.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, color: true, name: true },
    });
    const specs = planPhotos(product.slug, variants);
    if (specs.length === 0) continue; // no colours yet: nothing to draw

    for (const spec of specs) {
      const buffer = await renderPlaceholder(spec);
      await media.add(product.id, { buffer }, { altText: spec.altText, ...(spec.variantId ? { variantId: spec.variantId } : {}) });
      result.photos += 1;
    }
    result.sarees += 1;
    log(`  ${product.slug}: ${specs.length} sample pictures`);
  }
  return result;
}

/** Removes the sample pictures (found by their description) and their files. Real photos are never touched. */
export async function removeSamplePhotos(
  db: Db,
  media: Pick<MediaService, 'remove'>,
  args: Pick<SamplePhotoArgs, 'prefix'>,
  log: (line: string) => void = () => undefined,
): Promise<SampleSeedResult> {
  const rows = await db.productMedia.findMany({
    where: {
      altText: { startsWith: SAMPLE_ALT_PREFIX },
      ...(args.prefix ? { product: { slug: { startsWith: args.prefix } } } : {}),
    },
    select: { id: true, productId: true },
    orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }],
  });
  const result: SampleSeedResult = { sarees: 0, photos: 0, skipped: 0 };
  const seen = new Set<string>();
  for (const row of rows) {
    await media.remove(row.productId, row.id);
    result.photos += 1;
    if (!seen.has(row.productId)) {
      seen.add(row.productId);
      result.sarees += 1;
    }
  }
  if (result.photos > 0) log(`  removed ${result.photos} sample pictures from ${result.sarees} sarees`);
  return result;
}
