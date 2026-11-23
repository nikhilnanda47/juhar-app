import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../prisma/prisma.service';

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000000';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000000';
const VARIANT_1 = 'cccccccc-0000-0000-0000-000000000001';
const VARIANT_2 = 'cccccccc-0000-0000-0000-000000000002';

function makePrisma() {
  return {
    productVariant: {
      findUnique: jest.fn(),
    },
    wishlistItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WishlistService);
  });

  describe('addItem', () => {
    it('adds a variant to the wishlist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: VARIANT_1, active: true,
        product: { publishStatus: 'published' },
      });
      prisma.wishlistItem.findUnique.mockResolvedValue(null);
      prisma.wishlistItem.create.mockResolvedValue({});

      const result = await service.addItem(USER_A, { variantId: VARIANT_1 });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
        data: { userId: USER_A, variantId: VARIANT_1 },
      });
      expect(result).toEqual({ wishlisted: true, variantId: VARIANT_1 });
    });

    it('throws 404 when variant does not exist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.addItem(USER_A, { variantId: VARIANT_1 }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws 409 when variant already in wishlist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: VARIANT_1, active: true,
        product: { publishStatus: 'published' },
      });
      prisma.wishlistItem.findUnique.mockResolvedValue({
        id: 'some-id', userId: USER_A, variantId: VARIANT_1,
      });

      await expect(service.addItem(USER_A, { variantId: VARIANT_1 }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('removeItem', () => {
    it('removes a variant from the wishlist', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue({
        id: 'some-id', userId: USER_A, variantId: VARIANT_1,
      });
      prisma.wishlistItem.delete.mockResolvedValue({});

      const result = await service.removeItem(USER_A, VARIANT_1);

      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { userId_variantId: { userId: USER_A, variantId: VARIANT_1 } },
      });
      expect(result).toEqual({ wishlisted: false, variantId: VARIANT_1 });
    });

    it('throws 404 when item not in wishlist', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(USER_A, VARIANT_1))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getWishlist', () => {
    it('returns wishlist items for the user', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([
        {
          id: 'item-1', addedAt: new Date(),
          variant: {
            id: VARIANT_1, sku: 'SKU-1', name: null, color: 'Red',
            pricePaise: 150000, compareAtPaise: null, active: true,
            product: { id: 'prod-1', slug: 'test-saree', title: 'Test Saree', origin: null, fabric: null, weaveMethod: null },
            inventory: { onHand: 10, reserved: 1, unavailable: 0 },
          },
        },
      ]);

      const result = await service.getWishlist(USER_A);

      expect(result.total).toBe(1);
      expect(result.items[0].variant.id).toBe(VARIANT_1);
      expect(result.items[0].variant.available).toBe(9);
    });

    it('returns empty list for user with no wishlist items', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([]);

      const result = await service.getWishlist(USER_A);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('user isolation', () => {
    it('does not return another user\'s wishlist items', async () => {
      prisma.wishlistItem.findMany.mockImplementation(({ where }) => {
        if (where.userId === USER_A) {
          return Promise.resolve([{
            id: 'item-a', addedAt: new Date(),
            variant: {
              id: VARIANT_1, sku: 'SKU-1', name: null, color: null, active: true,
              pricePaise: 100000, compareAtPaise: null,
              product: { id: 'p1', slug: 'saree-1', title: 'Saree 1', origin: null, fabric: null, weaveMethod: null },
              inventory: { onHand: 5, reserved: 0, unavailable: 0 },
            },
          }]);
        }
        return Promise.resolve([]);
      });

      const resultA = await service.getWishlist(USER_A);
      const resultB = await service.getWishlist(USER_B);

      expect(resultA.total).toBe(1);
      expect(resultB.total).toBe(0);
    });

    it('cannot remove another user\'s wishlist item', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(USER_B, VARIANT_1))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('checkItem', () => {
    it('returns wishlisted: true when item exists', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'item-1' });

      const result = await service.checkItem(USER_A, VARIANT_1);

      expect(result).toEqual({ wishlisted: true, variantId: VARIANT_1 });
    });

    it('returns wishlisted: false when item does not exist', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue(null);

      const result = await service.checkItem(USER_A, VARIANT_1);

      expect(result).toEqual({ wishlisted: false, variantId: VARIANT_1 });
    });
  });
});
