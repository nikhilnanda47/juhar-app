export {}; // keeps this file a module
import { CART_CHANGED_EVENT, type LocalCartItem } from './cart-events';

let store: Record<string, string> = {};
let events: string[] = [];

function load() {
  jest.resetModules();
  return require('./cart-events') as typeof import('./cart-events');
}

beforeEach(() => {
  store = {};
  events = [];
  (global as any).window = { dispatchEvent: (e: Event) => events.push(e.type) };
  (global as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

// a complete guest-cart line (the cart stores the whole saree's details)
const line = (variantId: string, quantity: number): LocalCartItem => ({
  variantId, quantity, productId: 'p1', productTitle: 'Saree', productSlug: 'saree', variantName: null, color: null,
  sku: 'SKU-1', pricePaise: 100000, compareAtPaise: null, available: 5,
});

describe('cart events', () => {
  it('notifyCartChanged sends the cart-changed event', () => {
    load().notifyCartChanged();
    expect(events).toEqual([CART_CHANGED_EVENT]);
  });

  it('does nothing outside a browser', () => {
    delete (global as any).window;
    expect(() => load().notifyCartChanged()).not.toThrow();
  });

  describe('guest cart', () => {
    it('reads an empty cart when nothing is stored', () => {
      expect(load().readLocalCart()).toEqual([]);
    });

    it('survives damaged stored data', () => {
      store['juhar_local_cart'] = '{not json';
      expect(load().readLocalCart()).toEqual([]);
    });

    it('saving stores the items AND tells the badge', () => {
      const { saveLocalCart, readLocalCart } = load();
      saveLocalCart([line('v1', 2)]);
      expect(readLocalCart()).toEqual([line('v1', 2)]);
      expect(events).toEqual([CART_CHANGED_EVENT]);
    });

    it('clearing empties the cart AND tells the badge', () => {
      const { saveLocalCart, clearLocalCart, readLocalCart } = load();
      saveLocalCart([line('v1', 1)]);
      events.length = 0;
      clearLocalCart();
      expect(readLocalCart()).toEqual([]);
      expect(events).toEqual([CART_CHANGED_EVENT]);
    });
  });
});
