// The bag, wishlist and orders show a small photo of each saree. These check that the photo reaches each reply.
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { testMediaWith } from '../media/test-media';
import { OrdersService } from './orders.service';

const PHOTOS = { 'var-red': 'products/p1/red-thumb.webp', 'var-blue': 'products/p2/blue-thumb.webp' };
const media = () => testMediaWith(PHOTOS);

describe('photos in the bag', () => {
  const line = (variantId: string) => ({
    id: `item-${variantId}`, quantity: 1,
    variant: {
      id: variantId, sku: variantId, name: null, color: null, pricePaise: 100000, compareAtPaise: null, active: true,
      product: { id: `p-${variantId}`, title: variantId, slug: variantId, publishStatus: 'published' },
      inventory: { onHand: 5, reserved: 0, unavailable: 0 },
    },
  });

  it('puts the saree\'s small photo on each line, and null where there is none yet', async () => {
    const service = new CartService({ cartItem: { findMany: async () => [line('var-red'), line('var-green')] } } as any, media());
    const cart = await service.getCart('u1');
    expect(cart.items.map((i) => i.variant.imageUrl)).toEqual(['https://photos.test/products/p1/red-thumb.webp', null]);
  });
});

describe('photos in the wishlist', () => {
  it('puts the small photo on each saved colour', async () => {
    const item = (variantId: string) => ({
      id: `w-${variantId}`, addedAt: new Date(),
      variant: {
        id: variantId, sku: variantId, name: null, color: 'Red', pricePaise: 100000, compareAtPaise: null, active: true,
        product: { id: `p-${variantId}`, slug: variantId, title: variantId, origin: null, fabric: null, weaveMethod: null, publishStatus: 'published' },
        inventory: { onHand: 5, reserved: 0, unavailable: 0 },
      },
    });
    const prisma = { wishlistItem: { findMany: async () => [item('var-blue'), item('var-green')] } };
    const wishlist = await new WishlistService(prisma as any, media()).getWishlist('u1');
    expect(wishlist.items.map((i: any) => i.variant.imageUrl)).toEqual(['https://photos.test/products/p2/blue-thumb.webp', null]);
  });
});

describe('photos in orders', () => {
  const o = () => ({
    id: 'o1', publicNumber: 'JUH-1', status: 'placed', paymentMode: 'cod', paymentStatus: 'cod_pending',
    subtotalPaise: 300000, shippingPaise: 0, taxPaise: 0, discountPaise: 0, totalPaise: 300000, notes: null, cancellationReason: null,
    addressSnapshot: {}, createdAt: new Date(), confirmedAt: null, packedAt: null, shippedAt: null, deliveredAt: null, cancelledAt: null,
    user: { id: 'u1', phone: '+919876500000', name: 'Priya' },
    items: [
      { id: 'i1', variantId: 'var-red', productTitle: 'Red saree', variantName: null, sku: 'R', qty: 1, unitPricePaise: 100000, totalPaise: 100000, variant: { color: 'Red' } },
      { id: 'i2', variantId: 'var-green', productTitle: 'Green saree', variantName: null, sku: 'G', qty: 2, unitPricePaise: 100000, totalPaise: 200000, variant: { color: 'Green' } },
    ],
    shipments: [], payments: [],
  });
  const expected = ['https://photos.test/products/p1/red-thumb.webp', null];

  it('shows each saree\'s photo in the customer\'s order list', async () => {
    const prisma = { order: { findMany: async () => [o()], count: async () => 1, groupBy: async () => [] } };
    const page = await new OrdersService(prisma as any, {} as any, media()).findMyOrders('u1', {} as any);
    expect(page.items[0].items.map((i: any) => i.imageUrl)).toEqual(expected);
  });

  it('shows each saree\'s photo on the customer\'s order page', async () => {
    const prisma = { order: { findFirst: async () => o() } };
    const detail: any = await new OrdersService(prisma as any, {} as any, media()).findMyOrder('u1', 'o1');
    expect(detail.items.map((i: any) => i.imageUrl)).toEqual(expected);
    expect(detail.items[0]).toMatchObject({ id: 'i1', productTitle: 'Red saree', qty: 1 }); // the rest of the item is unchanged
  });

  it('shows each saree\'s photo on the admin\'s order page, where it helps to pick the right one off the shelf', async () => {
    const prisma = {
      order: { findUnique: async () => o() },
      auditEvent: { findMany: async () => [] },
      user: { findMany: async () => [] },
      adminUser: { findMany: async () => [] },
    };
    const detail = await new OrdersService(prisma as any, {} as any, media()).findOneAdmin('o1');
    expect(detail.items.map((i: any) => i.imageUrl)).toEqual(expected);
  });
});
