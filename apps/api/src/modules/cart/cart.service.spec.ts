// The cart count must be the number of pieces (3 sarees = 3), the same as a guest cart shows,
// so the badge does not change when a guest logs in.
import { CartService } from './cart.service';
import { testMedia } from '../media/test-media';

function line(id: string, quantity: number) {
  return {
    id: `item-${id}`,
    quantity,
    variant: {
      id, sku: `SKU-${id}`, name: null, color: null, pricePaise: 100000, compareAtPaise: null, active: true,
      product: { id: `product-${id}`, title: `Saree ${id}`, slug: `saree-${id}`, publishStatus: 'published' },
      inventory: { onHand: 50, reserved: 0, unavailable: 0 },
    },
  };
}

const serviceWith = (items: any[]) =>
  new CartService({ cartItem: { findMany: async () => items } } as any, testMedia());

describe('CartService.getCart itemCount', () => {
  it('is 0 for an empty cart', async () => {
    expect((await serviceWith([]).getCart('u1')).itemCount).toBe(0);
  });

  it('one product with quantity 3 counts as 3, not 1', async () => {
    const cart = await serviceWith([line('a', 3)]).getCart('u1');
    expect(cart.items).toHaveLength(1);
    expect(cart.itemCount).toBe(3);
  });

  it('adds up the quantities of different products', async () => {
    const cart = await serviceWith([line('a', 2), line('b', 1), line('c', 4)]).getCart('u1');
    expect(cart.itemCount).toBe(7);
  });

  it('counts a line that is out of stock too, like the guest cart does', async () => {
    const out = line('d', 2);
    out.variant.inventory = { onHand: 0, reserved: 0, unavailable: 0 };
    expect((await serviceWith([line('a', 1), out]).getCart('u1')).itemCount).toBe(3);
  });
});

// The wishlist heart on a shop card is per saree, so a line in the bag has to say which saree it is from.
describe('CartService.getCart productId', () => {
  it('tells which saree each line belongs to', async () => {
    const cart = await serviceWith([line('a', 1), line('b', 2)]).getCart('u1');
    expect(cart.items.map((i) => i.variant.productId)).toEqual(['product-a', 'product-b']);
  });
});
