export {}; // keeps this file a module
// Which calls announce a cart change to the badge, and which must not.
let mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore[k] ?? null,
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    removeItem: async (k: string) => { delete mockStore[k]; },
  },
}));

const ok = (data: unknown) => ({ status: 200, json: async () => ({ success: true, data }) });
const fail = (status: number, message = 'Nope') => ({
  status,
  json: async () => ({ success: false, error: { code: `HTTP_${status}`, message } }),
});

const item = { variantId: 'v1', quantity: 1, productTitle: 'Saree', productSlug: 's', variantName: null, color: null, sku: 'S1', pricePaise: 1000, compareAtPaise: null, available: 5 };
let changes = 0;
let stopListening: () => void;

function modules(response: unknown) {
  jest.resetModules();
  (global as any).fetch = jest.fn(async () => response);
  const events = require('./cartEvents') as typeof import('./cartEvents');
  stopListening = events.onCartChanged(() => { changes++; });
  return { api: require('./api') as typeof import('./api'), local: require('./localCart') as typeof import('./localCart') };
}

beforeEach(() => { mockStore = {}; changes = 0; });
afterEach(() => stopListening?.());

describe('calls that change the cart tell the badge', () => {
  it('addToCart', async () => { await modules(ok({ itemCount: 1 })).api.addToCart('v1', 1); expect(changes).toBe(1); });
  it('updateCartItem', async () => { await modules(ok({ itemCount: 3 })).api.updateCartItem('i1', 3); expect(changes).toBe(1); });
  it('removeCartItem', async () => { await modules(ok({ itemCount: 0 })).api.removeCartItem('i1'); expect(changes).toBe(1); });
  it('placeOrder (placing an order empties the cart)', async () => {
    await modules(ok({ id: 'o1' })).api.placeOrder({ addressId: 'a', paymentMode: 'cod', idempotencyKey: 'k' });
    expect(changes).toBe(1);
  });
  it('signing in (the badge switches to the account cart)', async () => {
    await modules(ok({})).api.saveTokens('A', 'R');
    expect(changes).toBe(1);
  });
  it('signing out (the badge switches to the guest cart)', async () => {
    await modules(ok({})).api.clearTokens();
    expect(changes).toBe(1);
  });

  describe('guest cart', () => {
    it('adding an item', async () => { await modules(ok({})).local.addToLocalCart(item); expect(changes).toBe(1); });
    it('changing a quantity', async () => {
      const { local } = modules(ok({}));
      await local.addToLocalCart(item); changes = 0;
      await local.updateLocalCartItem('v1', 3);
      expect(changes).toBe(1);
    });
    it('removing an item', async () => {
      const { local } = modules(ok({}));
      await local.addToLocalCart(item); changes = 0;
      await local.removeLocalCartItem('v1');
      expect(changes).toBe(1);
    });
    it('clearing the cart', async () => { await modules(ok({})).local.clearLocalCart(); expect(changes).toBe(1); });
    it('syncing to the account after login announces (one per item sent, then the clear)', async () => {
      const { local } = modules(ok({ itemCount: 1 }));
      await local.addToLocalCart(item); changes = 0;
      await local.syncLocalCartToServer();
      expect(changes).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('calls that must NOT tell the badge', () => {
  it('loading the cart does not (otherwise the badge would refresh itself in a loop)', async () => {
    await modules(ok({ itemCount: 2 })).api.getCart();
    expect(changes).toBe(0);
  });

  it('reading the guest cart does not', async () => {
    await modules(ok({})).local.getLocalCart();
    expect(changes).toBe(0);
  });

  it.each([
    ['addToCart', (m: any) => m.api.addToCart('v1', 1)],
    ['updateCartItem', (m: any) => m.api.updateCartItem('i1', 1)],
    ['removeCartItem', (m: any) => m.api.removeCartItem('i1')],
    ['placeOrder', (m: any) => m.api.placeOrder({ addressId: 'a', paymentMode: 'cod', idempotencyKey: 'k' })],
  ])('a failed %s changed nothing, so it says nothing', async (_name, run) => {
    await expect(run(modules(fail(409, 'Out of stock')))).rejects.toThrow('Out of stock');
    expect(changes).toBe(0);
  });
});
