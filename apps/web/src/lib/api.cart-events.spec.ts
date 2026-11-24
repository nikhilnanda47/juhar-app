export {}; // keeps this file a module
import { CART_CHANGED_EVENT } from './cart-events';
import { AUTH_CHANGED_EVENT } from './auth-events';

// Which calls announce a cart change to the badge, and which must not.
const ok = (data: unknown) => ({ status: 200, json: async () => ({ success: true, data }) });
const fail = (status: number, message = 'Nope') => ({
  status,
  json: async () => ({ success: false, error: { code: `HTTP_${status}`, message } }),
});

let events: string[] = [];
let store: Record<string, string> = {};

function api(response: unknown) {
  jest.resetModules();
  (global as any).fetch = jest.fn(async () => response);
  return require('./api') as typeof import('./api');
}

beforeEach(() => {
  events = [];
  store = {};
  (global as any).window = { dispatchEvent: (e: Event) => events.push(e.type) };
  (global as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('API calls that change the cart tell the badge', () => {
  it('addToCart', async () => {
    await api(ok({ itemCount: 1 })).addToCart('v1', 1);
    expect(events).toEqual([CART_CHANGED_EVENT]);
  });

  it('updateCartItem', async () => {
    await api(ok({ itemCount: 3 })).updateCartItem('i1', 3);
    expect(events).toEqual([CART_CHANGED_EVENT]);
  });

  it('removeCartItem', async () => {
    await api(ok({ itemCount: 0 })).removeCartItem('i1');
    expect(events).toEqual([CART_CHANGED_EVENT]);
  });

  it('placeOrder (placing an order empties the cart)', async () => {
    await api(ok({ id: 'o1' })).placeOrder({ addressId: 'a', paymentMode: 'cod', idempotencyKey: 'k' });
    expect(events).toEqual([CART_CHANGED_EVENT]);
  });

  it('signing in (the badge switches to the account cart; saved items follow the login)', async () => {
    await api(ok({ accessToken: 'A', refreshToken: 'R', isNewUser: false })).verifyOtp('+919999999999', '123456');
    expect(events).toEqual([CART_CHANGED_EVENT, AUTH_CHANGED_EVENT]);
  });

  it('signing out (the badge switches to the guest cart; saved items forget the customer)', () => {
    api(ok({})).clearTokens();
    expect(events).toEqual([CART_CHANGED_EVENT, AUTH_CHANGED_EVENT]);
  });

  it('cart changes alone do not announce a login change', async () => {
    await api(ok({ itemCount: 1 })).addToCart('v1', 1);
    expect(events).not.toContain(AUTH_CHANGED_EVENT);
  });
});

describe('API calls that must NOT tell the badge', () => {
  it('loading the cart does not (otherwise the badge would refresh itself in a loop)', async () => {
    await api(ok({ itemCount: 2 })).getCart();
    expect(events).toEqual([]);
  });

  it.each([
    ['addToCart', (a: any) => a.addToCart('v1', 1)],
    ['updateCartItem', (a: any) => a.updateCartItem('i1', 1)],
    ['removeCartItem', (a: any) => a.removeCartItem('i1')],
    ['placeOrder', (a: any) => a.placeOrder({ addressId: 'a', paymentMode: 'cod', idempotencyKey: 'k' })],
  ])('a failed %s changed nothing, so it says nothing', async (_name, run) => {
    await expect(run(api(fail(409, 'Out of stock')))).rejects.toThrow('Out of stock');
    expect(events).toEqual([]);
  });

  it('a wrong OTP does not', async () => {
    await expect(api(fail(401, 'Invalid OTP')).verifyOtp('+919999999999', '000000')).rejects.toThrow();
    expect(events).toEqual([]);
  });
});
