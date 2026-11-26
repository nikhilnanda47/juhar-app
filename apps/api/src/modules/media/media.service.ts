import { Inject, Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { asJson } from '../../common/audit/json';
import { MEDIA } from '@juhar/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { processImage } from './image-processor';
import { STORAGE_PROVIDER, StorageProvider } from './storage';

/** What the shop's replies carry for one photo */
export interface PresentedMedia {
  id: string;
  /** the large copy (product page) */
  url: string;
  /** the small copy (cards, lists) */
  thumbnailUrl: string;
  type: string;
  altText: string | null;
  sortOrder: number;
  /** the colour it shows, or null for the whole saree */
  variantId: string | null;
  width: number | null;
  height: number | null;
}

interface MediaRow {
  id: string;
  objectKey: string;
  thumbnailKey: string | null;
  type: string;
  altText: string | null;
  sortOrder: number;
  variantId: string | null;
  width: number | null;
  height: number | null;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** The public address of a stored file, from the key the database holds */
  urlFor(key: string): string {
    return this.storage.urlFor(key);
  }

  present(row: MediaRow): PresentedMedia {
    return {
      id: row.id,
      url: this.urlFor(row.objectKey),
      thumbnailUrl: this.urlFor(row.thumbnailKey || row.objectKey),
      type: row.type,
      altText: row.altText,
      sortOrder: row.sortOrder,
      variantId: row.variantId,
      width: row.width,
      height: row.height,
    };
  }

  /** A photo for a card or a list: the small copy and its description (null when the product has none) */
  card(row: Pick<MediaRow, 'objectKey' | 'thumbnailKey' | 'altText'> | null | undefined): { url: string; alt: string | null } | null {
    if (!row) return null;
    return { url: this.urlFor(row.thumbnailKey || row.objectKey), alt: row.altText };
  }

  /**
   * The small photo to show next to each of these colours (bag, wishlist, order): a photo of that very colour if
   * there is one, else a photo of the whole saree, else the first photo. Colours with no photo are left out.
   */
  async thumbnailsForVariants(variantIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const ids = [...new Set(variantIds)];
    if (ids.length === 0) return result;

    const variants = await this.prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true, productId: true } });
    if (variants.length === 0) return result;
    const photos = await this.prisma.productMedia.findMany({
      where: { productId: { in: [...new Set(variants.map((v) => v.productId))] }, type: 'image' },
      orderBy: { sortOrder: 'asc' },
      select: { productId: true, variantId: true, objectKey: true, thumbnailKey: true },
    });
    for (const variant of variants) {
      const ofProduct = photos.filter((p) => p.productId === variant.productId);
      const pick = ofProduct.find((p) => p.variantId === variant.id) ?? ofProduct.find((p) => p.variantId === null) ?? ofProduct[0];
      if (pick) result.set(variant.id, this.urlFor(pick.thumbnailKey || pick.objectKey));
    }
    return result;
  }

  async list(productId: string): Promise<PresentedMedia[]> {
    const rows = await this.prisma.productMedia.findMany({ where: { productId, type: 'image' }, orderBy: { sortOrder: 'asc' } });
    return rows.map((row) => this.present(row));
  }

  private async requireProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException({ code: 'PROD_001', message: 'Product not found' });
  }

  /** The colour has to be one of this product's own */
  private async requireVariantOf(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
    if (!variant) throw new BadRequestException('MEDIA_VARIANT_MISMATCH');
  }

  /** One product at a time while its photos change, so two uploads cannot both take the last place or the same position */
  private lockProduct(tx: Prisma.TransactionClient, productId: string) {
    return tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
  }

  /** Adds a photo at the end. Shrinks it, keeps two copies, records it in the audit trail. */
  async add(
    productId: string,
    file: { buffer: Buffer } | undefined,
    options: { altText?: string; variantId?: string },
    adminId?: string,
  ): Promise<PresentedMedia[]> {
    if (!file?.buffer?.length) throw new BadRequestException('PHOTO_NOT_AN_IMAGE');
    await this.requireProduct(productId);
    if (options.variantId) await this.requireVariantOf(productId, options.variantId);

    // an early, cheap refusal; the real check is repeated under the lock below
    const already = await this.prisma.productMedia.count({ where: { productId, type: 'image' } });
    if (already >= MEDIA.MAX_PER_PRODUCT) throw new ConflictException('PHOTO_LIMIT_REACHED');

    const image = await processImage(file.buffer);
    const name = randomUUID();
    const objectKey = `products/${productId}/${name}.webp`;
    const thumbnailKey = `products/${productId}/${name}-thumb.webp`;

    await this.storage.put(objectKey, image.full, 'image/webp');
    try {
      await this.storage.put(thumbnailKey, image.thumb, 'image/webp');
      await this.prisma.$transaction(async (tx) => {
        await this.lockProduct(tx, productId);
        const rows = await tx.productMedia.findMany({ where: { productId, type: 'image' }, select: { sortOrder: true } });
        if (rows.length >= MEDIA.MAX_PER_PRODUCT) throw new ConflictException('PHOTO_LIMIT_REACHED');
        const sortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
        const altText = options.altText?.trim() || null;
        const created = await tx.productMedia.create({
          data: {
            productId,
            variantId: options.variantId ?? null,
            objectKey,
            thumbnailKey,
            type: 'image',
            mimeType: 'image/webp',
            altText,
            width: image.width,
            height: image.height,
            sizeBytes: image.full.length,
            sortOrder,
          },
        });
        await tx.auditEvent.create({
          data: {
            action: 'product.photo_added',
            entityType: 'product',
            entityId: productId,
            actorType: 'admin',
            actorId: adminId,
            afterState: asJson({ mediaId: created.id, position: sortOrder + 1, altText, variantId: options.variantId ?? null }),
          },
        });
      });
    } catch (error) {
      await this.discard([objectKey, thumbnailKey]); // do not leave files nobody points at
      throw error;
    }
    return this.list(productId);
  }

  /** Changes a photo's description or the colour it shows. Only what differs is written. */
  async update(
    productId: string,
    mediaId: string,
    changes: { altText?: string | null; variantId?: string | null },
    adminId?: string,
  ): Promise<PresentedMedia[]> {
    const media = await this.prisma.productMedia.findFirst({ where: { id: mediaId, productId, type: 'image' } });
    if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');

    const data: { altText?: string | null; variantId?: string | null } = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (changes.altText !== undefined) {
      const altText = changes.altText === null ? null : changes.altText.trim() || null;
      if (altText !== media.altText) { data.altText = altText; before.altText = media.altText; after.altText = altText; }
    }
    if (changes.variantId !== undefined) {
      if (changes.variantId !== null) await this.requireVariantOf(productId, changes.variantId);
      if (changes.variantId !== media.variantId) { data.variantId = changes.variantId; before.variantId = media.variantId; after.variantId = changes.variantId; }
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.productMedia.update({ where: { id: mediaId }, data });
        await tx.auditEvent.create({
          data: {
            action: 'product.photo_updated', entityType: 'product', entityId: productId, actorType: 'admin', actorId: adminId,
            beforeState: asJson({ mediaId, ...before }), afterState: asJson({ mediaId, ...after }),
          },
        });
      });
    }
    return this.list(productId);
  }

  /** Puts the photos in the given order; the first becomes the cover. The list has to be exactly the product's photos. */
  async reorder(productId: string, ids: string[], adminId?: string): Promise<PresentedMedia[]> {
    await this.requireProduct(productId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockProduct(tx, productId);
      const rows = await tx.productMedia.findMany({ where: { productId, type: 'image' }, orderBy: { sortOrder: 'asc' }, select: { id: true } });
      const current = rows.map((row) => row.id);
      const sameSet = ids.length === current.length && new Set(ids).size === ids.length && ids.every((id) => current.includes(id));
      if (!sameSet) throw new BadRequestException('MEDIA_ORDER_MISMATCH');
      if (ids.every((id, index) => id === current[index])) return; // already in this order

      await Promise.all(ids.map((id, index) => tx.productMedia.update({ where: { id }, data: { sortOrder: index } })));
      await tx.auditEvent.create({
        data: {
          action: 'product.photos_reordered', entityType: 'product', entityId: productId, actorType: 'admin', actorId: adminId,
          beforeState: asJson({ order: current }), afterState: asJson({ order: ids }),
        },
      });
    });
    return this.list(productId);
  }

  /** Removes a photo and its files; the others close up so the order has no gaps. */
  async remove(productId: string, mediaId: string, adminId?: string): Promise<PresentedMedia[]> {
    const keys: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      await this.lockProduct(tx, productId);
      const media = await tx.productMedia.findFirst({ where: { id: mediaId, productId, type: 'image' } });
      if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');
      await tx.productMedia.delete({ where: { id: mediaId } });
      const rest = await tx.productMedia.findMany({ where: { productId, type: 'image' }, orderBy: { sortOrder: 'asc' }, select: { id: true } });
      await Promise.all(rest.map((row, index) => tx.productMedia.update({ where: { id: row.id }, data: { sortOrder: index } })));
      await tx.auditEvent.create({
        data: {
          action: 'product.photo_removed', entityType: 'product', entityId: productId, actorType: 'admin', actorId: adminId,
          beforeState: asJson({ mediaId, altText: media.altText, variantId: media.variantId, position: media.sortOrder + 1 }),
        },
      });
      keys.push(media.objectKey);
      if (media.thumbnailKey) keys.push(media.thumbnailKey);
    });
    await this.discard(keys); // after the row is gone; a file that cannot be deleted is only wasted space
    return this.list(productId);
  }

  private async discard(keys: string[]): Promise<void> {
    try {
      await this.storage.delete(keys);
    } catch (error) {
      this.logger.warn(`Could not delete ${keys.length} stored file(s): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
