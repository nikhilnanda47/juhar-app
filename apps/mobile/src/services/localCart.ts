import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToCart as serverAddToCart, type CartResponse } from './api';
import { notifyCartChanged } from './cartEvents';

const LOCAL_CART_KEY = 'juhar_local_cart';

export interface LocalCartItem {
  variantId: string;
  quantity: number;
  // Snapshot of product info for display
  /** older guest carts do not have it */
  productId?: string;
  productTitle: string;
  productSlug: string;
  variantName: string | null;
  color: string | null;
  sku: string;
  pricePaise: number;
  compareAtPaise: number | null;
  available: number;
}

// ── Read local cart ──
export async function getLocalCart(): Promise<LocalCartItem[]> {
  const raw = await AsyncStorage.getItem(LOCAL_CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ── Save local cart ──
async function saveLocalCart(items: LocalCartItem[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  notifyCartChanged();
}

// ── Add item to local cart ──
export async function addToLocalCart(item: LocalCartItem): Promise<LocalCartItem[]> {
  const cart = await getLocalCart();
  const existing = cart.find((c) => c.variantId === item.variantId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item });
  }
  await saveLocalCart(cart);
  return cart;
}

// ── Update quantity in local cart ──
export async function updateLocalCartItem(variantId: string, quantity: number): Promise<LocalCartItem[]> {
  let cart = await getLocalCart();
  if (quantity <= 0) {
    cart = cart.filter((c) => c.variantId !== variantId);
  } else {
    const item = cart.find((c) => c.variantId === variantId);
    if (item) item.quantity = quantity;
  }
  await saveLocalCart(cart);
  return cart;
}

// ── Remove from local cart ──
export async function removeLocalCartItem(variantId: string): Promise<LocalCartItem[]> {
  const cart = (await getLocalCart()).filter((c) => c.variantId !== variantId);
  await saveLocalCart(cart);
  return cart;
}

// ── Clear local cart ──
export async function clearLocalCart(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_CART_KEY);
  notifyCartChanged();
}

// ── Convert local cart to CartResponse format for UI ──
export function localCartToResponse(items: LocalCartItem[]): CartResponse {
  const cartItems = items.map((item) => ({
    id: `local-${item.variantId}`,
    variant: {
      id: item.variantId,
      sku: item.sku,
      name: item.variantName,
      color: item.color,
      pricePaise: item.pricePaise,
      compareAtPaise: item.compareAtPaise,
      available: item.available,
      productId: item.productId,
      productTitle: item.productTitle,
      productSlug: item.productSlug,
      imageUrl: null,
    },
    quantity: item.quantity,
    lineTotalPaise: item.pricePaise * item.quantity,
    isAvailable: item.available > 0,
  }));

  return {
    items: cartItems,
    subtotalPaise: cartItems.reduce((sum, i) => sum + i.lineTotalPaise, 0),
    itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
  };
}

// ── Sync local cart to server after login ──
export async function syncLocalCartToServer(): Promise<CartResponse | null> {
  const localItems = await getLocalCart();
  if (localItems.length === 0) return null;

  let serverCart: CartResponse | null = null;
  for (const item of localItems) {
    try {
      serverCart = await serverAddToCart(item.variantId, item.quantity);
    } catch {
      // Skip items that fail (e.g. out of stock)
    }
  }
  await clearLocalCart();
  return serverCart;
}

// ── Check if local cart has items ──
export async function hasLocalCartItems(): Promise<boolean> {
  const cart = await getLocalCart();
  return cart.length > 0;
}
