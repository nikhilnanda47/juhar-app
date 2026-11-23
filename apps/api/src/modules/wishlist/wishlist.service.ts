import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToWishlistDto } from './dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(userId: string, dto: AddToWishlistDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: { select: { publishStatus: true } } },
    });

    if (!variant || !variant.active) {
      throw new NotFoundException('VARIANT_NOT_FOUND');
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId: dto.variantId } },
    });

    if (existing) {
      throw new ConflictException('ALREADY_IN_WISHLIST');
    }

    await this.prisma.wishlistItem.create({
      data: { userId, variantId: dto.variantId },
    });

    return { wishlisted: true, variantId: dto.variantId };
  }

  async removeItem(userId: string, variantId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });

    if (!item) {
      throw new NotFoundException('WISHLIST_ITEM_NOT_FOUND');
    }

    await this.prisma.wishlistItem.delete({
      where: { userId_variantId: { userId, variantId } },
    });

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
                id: true, slug: true, title: true, origin: true, fabric: true, weaveMethod: true,
              },
            },
            inventory: {
              select: { onHand: true, reserved: true, unavailable: true },
            },
            media: false,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    const wishlistItems = items.map((item) => {
      const v = item.variant;
      const inv = v.inventory;
      const available = inv ? inv.onHand - inv.reserved - inv.unavailable : 0;

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
          isAvailable: available > 0 && v.active,
          product: v.product,
        },
      };
    });

    return { items: wishlistItems, total: wishlistItems.length };
  }

  async toggleItem(userId: string, variantId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({
        where: { userId_variantId: { userId, variantId } },
      });
      return { wishlisted: false, variantId };
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || !variant.active) {
      throw new NotFoundException('VARIANT_NOT_FOUND');
    }

    await this.prisma.wishlistItem.create({
      data: { userId, variantId },
    });

    return { wishlisted: true, variantId };
  }

  async checkItem(userId: string, variantId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });

    return { wishlisted: !!item, variantId };
  }
}
