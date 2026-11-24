export {}; // keeps this file a module
import { CART_CHANGED_EVENT } from './cart-events';

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
      saveLocalCart([{ variantId: 'v1', quantity: 2 }]);
      expect(readLocalCart()).toEqual([{ variantId: 'v1', quantity: 2 }]);
      expect(events).toEqual([CART_CHANGED_EVENT]);
    });

    it('clearing empties the cart AND tells the badge', () => {
      const { saveLocalCart, clearLocalCart, readLocalCart } = load();
      saveLocalCart([{ variantId: 'v1', quantity: 1 }]);
      events.length = 0;
      clearLocalCart();
      expect(readLocalCart()).toEqual([]);
      expect(events).toEqual([CART_CHANGED_EVENT]);
    });
  });
});
