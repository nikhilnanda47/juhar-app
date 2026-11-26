// For tests: a real MediaService whose files "live" at https://photos.test/<key> (nothing is written anywhere).
import { MediaService } from './media.service';
import { LocalStorage } from './storage';

/** A database with no photos in it */
export const NO_PHOTOS = {
  productVariant: { findMany: async () => [] },
  productMedia: { findMany: async () => [] },
};

export function testMedia(prisma: unknown = NO_PHOTOS): MediaService {
  return new MediaService(prisma as any, new LocalStorage('/tmp/juhar-test-media', 'https://photos.test'));
}

/**
 * A media service where the given colours (variant ids) have a photo: `{ 'variant-id': 'some/key-thumb.webp' }`.
 * Each colour belongs to its own product, so the photo is that colour's.
 */
export function testMediaWith(thumbnailKeys: Record<string, string>): MediaService {
  return testMedia({
    productVariant: {
      findMany: async ({ where }: any) => where.id.in.filter((id: string) => id in thumbnailKeys).map((id: string) => ({ id, productId: `p-${id}` })),
    },
    productMedia: {
      findMany: async ({ where }: any) =>
        where.productId.in
          .map((productId: string) => productId.slice(2))
          .filter((id: string) => id in thumbnailKeys)
          .map((id: string) => ({
            productId: `p-${id}`, variantId: null, objectKey: thumbnailKeys[id].replace('-thumb', ''), thumbnailKey: thumbnailKeys[id],
          })),
    },
  });
}
