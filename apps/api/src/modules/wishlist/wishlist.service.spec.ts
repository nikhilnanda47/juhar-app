import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WishlistService } from './wishlist.service';
import { MediaService } from '../media/media.service';
import { testMedia } from '../media/test-media';
import { PrismaService } from '../../prisma/prisma.service';

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000000';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000000';
const VARIANT_1 = 'cccccccc-0000-0000-0000-000000000001';
const VARIANT_2 = 'cccccccc-0000-0000-0000-000000000002';

/** The error Prisma raises when the (user, variant) pair is already in the table. */
const alreadySaved = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

const sellable = (over: Record<string, unknown> = {}, publishStatus = 'published') => ({
  id: VARIANT_1, active: true, product: { publishStatus }, ...over,
});

function makePrisma() {
  return {
    productVariant: { findUnique: jest.fn() },
    wishlistItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistService, { provide: PrismaService, useValue: prisma }, { provide: MediaService, useValue: testMedia() }],
    }).compile();
    service = module.get(WishlistService);
  });

  describe('addItem', () => {
    it('adds a variant to the wishlist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockResolvedValue({});

      const result = await service.addItem(USER_A, { variantId: VARIANT_1 });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({ data: { userId: USER_A, variantId: VARIANT_1 } });
      expect(result).toEqual({ wishlisted: true, variantId: VARIANT_1 });
    });

    it('throws 404 when the variant does not exist', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(service.addItem(USER_A, { variantId: VARIANT_1 })).rejects.toThrow(NotFoundException);
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('throws 404 for a retired (inactive) variant', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(sellable({ active: false }));
      await expect(service.addItem(USER_A, { variantId: VARIANT_1 })).rejects.toThrow(NotFoundException);
    });

    it.each(['draft', 'archived'])('throws 404 for a variant of a %s product, so it is not revealed', async (status) => {
      prisma.productVariant.findUnique.mockResolvedValue(sellable({}, status));
      await expect(service.addItem(USER_A, { variantId: VARIANT_1 })).rejects.toThrow(NotFoundException);
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('throws 409 when the variant is already saved (the database unique key says so)', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockRejectedValue(alreadySaved());
      await expect(service.addItem(USER_A, { variantId: VARIANT_1 })).rejects.toThrow(ConflictException);
    });

    it('does not turn another database failure into a 409', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockRejectedValue(new Error('connection lost'));
      await expect(service.addItem(USER_A, { variantId: VARIANT_1 })).rejects.toThrow('connection lost');
    });
  });

  describe('removeItem', () => {
    it('removes a variant from the wishlist', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeItem(USER_A, VARIANT_1);

      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_A, variantId: VARIANT_1 } });
      expect(result).toEqual({ wishlisted: false, variantId: VARIANT_1 });
    });

    it('throws 404 when the item is not in the wishlist', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.removeItem(USER_A, VARIANT_1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleItem (what both apps call)', () => {
    it('removes the item when it is saved, without looking at the product', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.toggleItem(USER_A, VARIANT_1);

      expect(result).toEqual({ wishlisted: false, variantId: VARIANT_1 });
      expect(prisma.productVariant.findUnique).not.toHaveBeenCalled(); // a product no longer sold can still be un-saved
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('saves the item when it is not saved yet', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockResolvedValue({});

      const result = await service.toggleItem(USER_A, VARIANT_1);

      expect(result).toEqual({ wishlisted: true, variantId: VARIANT_1 });
      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({ data: { userId: USER_A, variantId: VARIANT_1 } });
    });

    it('refuses to save an unknown, retired or unpublished variant (404, nothing created)', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
      for (const found of [null, sellable({ active: false }), sellable({}, 'draft')]) {
        prisma.productVariant.findUnique.mockResolvedValue(found);
        await expect(service.toggleItem(USER_A, VARIANT_1)).rejects.toThrow(NotFoundException);
      }
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('two taps at once: when the other tap saved it first, this one is still a success (no 500)', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockRejectedValue(alreadySaved());

      await expect(service.toggleItem(USER_A, VARIANT_1)).resolves.toEqual({ wishlisted: true, variantId: VARIANT_1 });
    });

    it('does not hide a real database failure', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
      prisma.productVariant.findUnique.mockResolvedValue(sellable());
      prisma.wishlistItem.create.mockRejectedValue(new Error('connection lost'));
      await expect(service.toggleItem(USER_A, VARIANT_1)).rejects.toThrow('connection lost');
    });

    it('only ever touches the logged-in customer\'s own rows', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });
      await service.toggleItem(USER_B, VARIANT_2);
      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_B, variantId: VARIANT_2 } });
    });
  });

  describe('getWishlist', () => {
    const row = (over: Record<string, unknown> = {}, productOver: Record<string, unknown> = {}) => ({
      id: 'item-1', addedAt: new Date(),
      variant: {
        id: VARIANT_1, sku: 'SKU-1', name: null, color: 'Red', pricePaise: 150000, compareAtPaise: null, active: true,
        product: { id: 'prod-1', slug: 'test-saree', title: 'Test Saree', origin: null, fabric: null, weaveMethod: null, publishStatus: 'published', ...productOver },
        inventory: { onHand: 10, reserved: 1, unavailable: 0 },
        ...over,
      },
    });

    it('returns the customer\'s items with the stock they can still buy', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([row()]);
      const result = await service.getWishlist(USER_A);
      expect(result.total).toBe(1);
      expect(result.items[0].variant).toMatchObject({ id: VARIANT_1, available: 9, isListed: true, isAvailable: true });
    });

    it('asks for this customer\'s rows only', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([]);
      await service.getWishlist(USER_A);
      expect((prisma.wishlistItem.findMany.mock.calls[0] as any[])[0].where).toEqual({ userId: USER_A });
    });

    it('returns an empty list for a customer with nothing saved', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([]);
      expect(await service.getWishlist(USER_A)).toEqual({ items: [], total: 0 });
    });

    it('marks an item "not listed" (and not available) when its product was unpublished after it was saved', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([row({}, { publishStatus: 'draft' })]);
      const { variant } = (await service.getWishlist(USER_A)).items[0];
      expect(variant.isListed).toBe(false);
      expect(variant.isAvailable).toBe(false); // even with stock on the shelf
      expect(variant.available).toBe(9);
    });

    it('marks an item "not listed" when its variant was retired', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([row({ active: false })]);
      expect((await service.getWishlist(USER_A)).items[0].variant).toMatchObject({ isListed: false, isAvailable: false });
    });

    it('a listed item with no stock left is "out of stock", not "not listed"', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([row({ inventory: { onHand: 2, reserved: 2, unavailable: 0 } })]);
      expect((await service.getWishlist(USER_A)).items[0].variant).toMatchObject({ isListed: true, isAvailable: false, available: 0 });
    });

    it('does not send the product\'s publish status to the customer', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([row()]);
      expect((await service.getWishlist(USER_A)).items[0].variant.product).not.toHaveProperty('publishStatus');
    });
  });

  describe('checkItem', () => {
    it('returns wishlisted: true when the item exists', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue({ id: 'item-1' });
      expect(await service.checkItem(USER_A, VARIANT_1)).toEqual({ wishlisted: true, variantId: VARIANT_1 });
    });

    it('returns wishlisted: false when it does not', async () => {
      prisma.wishlistItem.findUnique.mockResolvedValue(null);
      expect(await service.checkItem(USER_A, VARIANT_1)).toEqual({ wishlisted: false, variantId: VARIANT_1 });
    });
  });
});
