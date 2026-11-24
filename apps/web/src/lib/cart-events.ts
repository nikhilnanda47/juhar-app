// The cart badge learns about changes from these helpers instead of asking the server every few seconds.
// Anything that changes the cart (server calls, the guest cart, login, logout) calls notifyCartChanged().

export const CART_CHANGED_EVENT = 'juhar-cart-changed';
export const LOCAL_CART_KEY = 'juhar_local_cart';

/** Tell the cart badge (and anything else listening) that the cart changed. */
export function notifyCartChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

// ── Guest cart (kept in this browser until the customer logs in) ──

export function readLocalCart(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalCart(items: any[]): void {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  notifyCartChanged();
}

export function clearLocalCart(): void {
  localStorage.removeItem(LOCAL_CART_KEY);
  notifyCartChanged();
}
