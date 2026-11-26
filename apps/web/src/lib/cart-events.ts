// The cart badge learns about changes from these helpers instead of asking the server every few seconds.
// Anything that changes the cart (server calls, the guest cart, login, logout) calls notifyCartChanged().

export const CART_CHANGED_EVENT = 'juhar-cart-changed';
export const LOCAL_CART_KEY = 'juhar_local_cart';

/** Tell the cart badge (and anything else listening) that the cart changed. */
export function notifyCartChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

// ── Guest cart (kept in this browser until the customer logs in) ──

/** One line of the guest cart, kept in this browser (what the saree page saves when a guest adds to the bag) */
export interface LocalCartItem {
  variantId: string;
  quantity: number;
  productId: string;
  productTitle: string;
  productSlug: string;
  variantName: string | null;
  color: string | null;
  sku: string;
  pricePaise: number;
  compareAtPaise: number | null;
  available: number;
  /** the small photo, so the bag can show it without asking again (older carts have none) */
  imageUrl?: string | null;
}

export function readLocalCart(): LocalCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalCart(items: LocalCartItem[]): void {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  notifyCartChanged();
}

export function clearLocalCart(): void {
  localStorage.removeItem(LOCAL_CART_KEY);
  notifyCartChanged();
}
