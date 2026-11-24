import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto';

/** True when the database refused a row because the (user, variant) pair is already saved. */
function isAlreadySaved(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A customer can only save what the shop sells: an active variant of a published product.
   * Anything else answers "not found", so a draft or retired product is not revealed.
   */
  private async assertSavable(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { publishStatus: true } } },
    });
    if (!variant || !variant.active || variant.product.publishStatus !== 'published') {
      throw new NotFoundException('VARIANT_NOT_FOUND');
    }
  }

  async addItem(userId: string, dto: AddToWishlistDto) {
    await this.assertSavable(dto.variantId);

    try {
      await this.prisma.wishlistItem.create({ data: { userId, variantId: dto.variantId } });
    } catch (error) {
      // Two taps at once, or already saved: the unique key in the database is the real check
      // (reading first and then creating lets both requests through and one of them used to crash with a 500).
      if (isAlreadySaved(error)) throw new ConflictException('ALREADY_IN_WISHLIST');
      throw error;
    }

    return { wishlisted: true, variantId: dto.variantId };
  }

  async removeItem(userId: string, variantId: string) {
    // One statement, so two taps at once cannot both find the row and one fail on the delete
    const { count } = await this.prisma.wishlistItem.deleteMany({ where: { userId, variantId } });
    if (count === 0) throw new NotFoundException('WISHLIST_ITEM_NOT_FOUND');

    return { wishlisted: false, variantId };
  }

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true, slug: true, title: true, origin: true, fabric: true, weaveMethod: true, publishStatus: true,
              },
            },
            inventory: {
              select: { onHand: true, reserved: true, unavailable: true },
            },
          },
        },
      },
      orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
    });

    const wishlistItems = items.map((item) => {
      const v = item.variant;
      const inv = v.inventory;
      const available = inv ? inv.onHand - inv.reserved - inv.unavailable : 0;
      // Still on sale? A saved item can stop being sold later (product unpublished, colour retired).
      // The app then shows "No longer available" instead of a button that would fail and a link to a missing page.
      const isListed = v.active && v.product.publishStatus === 'published';
      const { publishStatus: _hidden, ...product } = v.product;

      return {
        id: item.id,
        addedAt: item.addedAt,
        variant: {
          id: v.id,
          sku: v.sku,
          name: v.name,
          color: v.color,
          pricePaise: v.pricePaise,
          compareAtPaise: v.compareAtPaise,
          available,
          isListed,
          isAvailable: isListed && available > 0,
          product,
        },
      };
    });

    return { items: wishlistItems, total: wishlistItems.length };
  }

  async toggleItem(userId: string, variantId: string) {
    // Removing is always allowed (even for a product that is no longer sold), and is one statement
    const removed = await this.prisma.wishlistItem.deleteMany({ where: { userId, variantId } });
    if (removed.count > 0) return { wishlisted: false, variantId };

    await this.assertSavable(variantId);

    try {
      await this.prisma.wishlistItem.create({ data: { userId, variantId } });
    } catch (error) {
      // A second tap got there first: it is saved, which is what this tap wanted
      if (!isAlreadySaved(error)) throw error;
    }

    return { wishlisted: true, variantId };
  }

  async checkItem(userId: string, variantId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });

    return { wishlisted: !!item, variantId };
  }
}
