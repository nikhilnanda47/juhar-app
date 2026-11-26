/**
 * Mobile API client — connects to NestJS backend.
 * Uses the TransformInterceptor response shape: { success, data, requestId }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyCartChanged } from './cartEvents';
import { notifyAuthChanged } from './authEvents';
import { resolveApiBase } from './apiBase';

// The server address is a setting of each build (EXPO_PUBLIC_API_URL; see apiBase.ts and eas.json).
// Expo replaces `process.env.EXPO_PUBLIC_API_URL` when it bundles, so it has to be written exactly like this.
const API_BASE = resolveApiBase({ isDev: __DEV__, envUrl: process.env.EXPO_PUBLIC_API_URL });

const TOKEN_KEY = 'juhar_token';
const REFRESH_KEY = 'juhar_refresh';

let accessToken: string | null = null;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId: string;
}

interface PaginatedData<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  /** how many items match the filters, over all pages (sent by the product list) */
  total?: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string | null;
  color: string | null;
  attributes: Record<string, unknown> | null;
  pricePaise: number;
  compareAtPaise: number | null;
  available: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  publishStatus: string;
  fabric: string | null;
  weaveMethod: string | null;
  origin: string | null;
  careInstructions: string | null;
  blousePiece: string | null;
  length: string | null;
  width: string | null;
  weight: string | null;
  occasion: string[] | null;
  tags: string[] | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variants: ProductVariant[];
  /** shop list cards only: the colour the card's price and its heart belong to */
  firstVariantId?: string | null;
  media: Array<{
    id: string;
    url: string;
    altText: string | null;
    mediaType: string;
    sortOrder: number;
  }>;
  createdAt: string;
}

/**
 * A failed API call. `message` is what the customer reads; `requestId` is the reference the API
 * gave this request (it is in every log line as req=<id>), so a customer can read it out and
 * support can find exactly what happened.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public requestId: string = '',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** What a customer reads when the server could not be reached at all. */
export const NETWORK_ERROR_MESSAGE = 'We could not reach the server. Please check your internet connection and try again.';

/** The request reference of an error, or '' (a network failure has none). */
export function referenceOf(error: unknown): string {
  return error instanceof ApiError ? error.requestId : '';
}

// Sign-in and token-refresh calls must never trigger a refresh themselves.
const NO_REFRESH_PATHS = [
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/refresh',
];

// One refresh at a time: calls that fail together share the same attempt.
let refreshing: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  let refreshToken: string | null = null;
  try {
    refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
  } catch {
    return false;
  }
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (json.success && json.data?.accessToken) {
      accessToken = json.data.accessToken;
      try { await AsyncStorage.setItem(TOKEN_KEY, json.data.accessToken); } catch { /* still usable in memory */ }
      return true;
    }
    // The server rejected the refresh token: the session is over.
    if (res.status === 401) await clearTokens();
    return false;
  } catch {
    // Network trouble: keep the tokens so a later attempt can still work.
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    // the system's own text is "Network request failed": say what happened in plain words
    throw new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE, 0, '');
  }
  const json: ApiResponse<T> = await res.json();

  // Access token expired: renew it once and repeat the call.
  if (res.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshAccessToken()) return request<T>(path, options, true);
  }

  if (!json.success) {
    const err = (json as any).error || { code: 'UNKNOWN', message: 'Request failed' };
    const details = Array.isArray(err.details) ? err.details.join('; ') : '';
    const requestId = String((json as any).requestId || res.headers?.get?.('x-request-id') || '');
    throw new ApiError(err.code, details ? `${err.message}: ${details}` : err.message, res.status, requestId);
  }

  return json.data;
}

// ── Token management ──

export async function loadToken(): Promise<boolean> {
  try {
    accessToken = await AsyncStorage.getItem(TOKEN_KEY);
    return !!accessToken;
  } catch {
    return false;
  }
}

export async function saveTokens(access: string, refresh: string) {
  accessToken = access;
  await AsyncStorage.setItem(TOKEN_KEY, access);
  await AsyncStorage.setItem(REFRESH_KEY, refresh);
  notifyCartChanged(); // the badge now shows the account's cart
  notifyAuthChanged(); // saved items: move the guest's hearts into the account and load its list
}

export async function clearTokens() {
  accessToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_KEY);
  notifyCartChanged(); // the badge now shows the guest cart
  notifyAuthChanged(); // anything that shows the previous customer's data (saved items) clears it
}

export function isLoggedIn(): boolean {
  return !!accessToken;
}

// ── Auth endpoints ──

export async function requestOtp(phone: string) {
  return request<{ message: string; expiresInSeconds: number }>(
    '/api/v1/auth/otp/request',
    { method: 'POST', body: JSON.stringify({ phone }) },
  );
}

export async function verifyOtp(phone: string, otp: string) {
  const data = await request<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    user: { id: string; phone: string; name: string | null; type: string };
  }>('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });

  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

// ── Profile endpoints ──

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  type: string;
  createdAt: string;
}

export async function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/v1/me');
}

export async function updateProfile(data: { name?: string; email?: string }): Promise<UserProfile> {
  return request<UserProfile>('/api/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Address endpoints ──

export interface Address {
  id: string;
  recipientName: string;
  recipientPhone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  label: string | null;
  isDefault: boolean;
}

export async function getAddresses(): Promise<Address[]> {
  return request<Address[]>('/api/v1/me/addresses');
}

export async function createAddress(data: Record<string, unknown>): Promise<Address> {
  return request<Address>('/api/v1/me/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(id: string, data: Record<string, unknown>): Promise<Address> {
  return request<Address>(`/api/v1/me/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(id: string): Promise<void> {
  await request(`/api/v1/me/addresses/${id}`, { method: 'DELETE' });
}

// ── Cart endpoints ──

export interface CartItemResponse {
  id: string;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    color: string | null;
    pricePaise: number;
    compareAtPaise: number | null;
    available: number;
    /** the saree this colour belongs to; carts saved before this existed (guest carts) may not have it */
    productId?: string;
    productTitle: string;
    productSlug: string;
    imageUrl: string | null;
  };
  quantity: number;
  lineTotalPaise: number;
  isAvailable: boolean;
  availabilityWarning?: string;
}

export interface CartResponse {
  items: CartItemResponse[];
  subtotalPaise: number;
  itemCount: number;
}

export async function getCart(): Promise<CartResponse> {
  return request<CartResponse>('/api/v1/cart');
}

export async function addToCart(variantId: string, quantity: number): Promise<CartResponse> {
  const cart = await request<CartResponse>('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ variantId, quantity }),
  });
  notifyCartChanged();
  return cart;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
  const cart = await request<CartResponse>(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
  notifyCartChanged();
  return cart;
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const cart = await request<CartResponse>(`/api/v1/cart/items/${itemId}`, {
    method: 'DELETE',
  });
  notifyCartChanged();
  return cart;
}

// ── Shipping rule (public) ──
// The rule lives in the API (one place); the screens only display what it says.

export interface ShippingRule {
  /** the charge, in paise, when the subtotal is below freeAbovePaise */
  flatPaise: number;
  /** delivery is free when the subtotal is this much (paise) or more */
  freeAbovePaise: number;
}

export async function getShippingRule(): Promise<ShippingRule> {
  return request<ShippingRule>('/api/v1/config/shipping');
}

// ── Public endpoints (no auth needed) ──

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/api/v1/categories');
}

export async function getProducts(params?: Record<string, string>): Promise<PaginatedData<Product> & { total: number }> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await request<PaginatedData<Product>>(`/api/v1/products${query}`);
  const items = data.items ?? [];
  return { items, cursor: data.cursor ?? null, hasMore: data.hasMore ?? false, total: data.total ?? items.length };
}

/** What the shop filters can be chosen from, read from the catalog by the API. */
export interface ProductFilterOptions {
  fabrics: string[];
  weaveMethods: string[];
  colors: string[];
  minPricePaise: number | null;
  maxPricePaise: number | null;
}

/** The answer to "can we deliver to this PIN code?" (the API owns the rule) */
export interface DeliveryCheck {
  pin: string;
  serviceable: boolean;
  codAvailable: boolean;
  days: { min: number; max: number } | null;
  reason: 'ok' | 'invalid' | 'not_served';
  message: string;
}

export async function checkDelivery(pin: string): Promise<DeliveryCheck> {
  return request<DeliveryCheck>(`/api/v1/delivery/check?pin=${encodeURIComponent(pin)}`);
}

export async function getProductFilters(): Promise<ProductFilterOptions> {
  const data = await request<Partial<ProductFilterOptions>>('/api/v1/products/filters');
  return {
    fabrics: data.fabrics ?? [],
    weaveMethods: data.weaveMethods ?? [],
    colors: data.colors ?? [],
    minPricePaise: data.minPricePaise ?? null,
    maxPricePaise: data.maxPricePaise ?? null,
  };
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return request<Product>(`/api/v1/products/${slug}`);
}

// ── Order endpoints ──
// Order payloads are still loosely typed (screens treat them as `any`).

export interface OrdersPage {
  items: any[];
  /** pass this back as `cursor` to get the next page; null on the last page */
  cursor: string | null;
  hasMore: boolean;
  /** how many orders match the status filter, over all pages */
  total: number;
  /** how many orders the customer has in each status (the filter is ignored) */
  counts: Record<string, number>;
}

/** One page of the customer's orders, newest first. Pass `status` to filter and `cursor` for the next page. */
export async function getOrders(
  options: { status?: string; cursor?: string; limit?: number } = {},
): Promise<OrdersPage> {
  await loadToken(); // order screens may open before any other call has loaded the token
  const query = new URLSearchParams();
  if (options.status) query.set('status', options.status);
  if (options.cursor) query.set('cursor', options.cursor);
  if (options.limit) query.set('limit', String(options.limit));
  const qs = query.toString();
  const data = await request<Partial<OrdersPage>>(`/api/v1/orders${qs ? '?' + qs : ''}`);
  return {
    items: data.items ?? [],
    cursor: data.cursor ?? null,
    hasMore: data.hasMore ?? false,
    total: data.total ?? (data.items ?? []).length,
    counts: data.counts ?? {},
  };
}

export async function getOrder(id: string): Promise<any> {
  await loadToken();
  return request<any>(`/api/v1/orders/${id}`);
}

export async function placeOrder(input: {
  addressId: string; paymentMode: string; idempotencyKey: string; notes?: string;
}): Promise<any> {
  await loadToken();
  const order = await request<any>('/api/v1/orders', { method: 'POST', body: JSON.stringify(input) });
  notifyCartChanged(); // placing an order empties the cart
  return order;
}

// ── Wishlist types ──

export interface WishlistVariant {
  id: string;
  sku: string;
  name: string | null;
  color: string | null;
  pricePaise: number;
  compareAtPaise: number | null;
  available: number;
  /** still sold: the product is published and this colour is active */
  isListed: boolean;
  /** listed and in stock */
  isAvailable: boolean;
  product: {
    id: string;
    slug: string;
    title: string;
    origin: string | null;
    fabric: string | null;
    weaveMethod: string | null;
  };
}

export interface WishlistItem {
  id: string;
  addedAt: string;
  variant: WishlistVariant;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

// ── Wishlist API calls ──

export async function getWishlist(): Promise<WishlistResponse> {
  return request<WishlistResponse>('/api/v1/wishlist');
}

export async function toggleWishlistItem(variantId: string): Promise<{ wishlisted: boolean; variantId: string }> {
  return request(`/api/v1/wishlist/items/${variantId}/toggle`, { method: 'POST' });
}

export async function checkWishlistItem(variantId: string): Promise<{ wishlisted: boolean; variantId: string }> {
  return request(`/api/v1/wishlist/${variantId}/check`);
}

// ── Helpers ──

export function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export function getLowestPrice(variants?: ProductVariant[]): number {
  if (!variants || variants.length === 0) return 0;
  return Math.min(...variants.map((v) => v.pricePaise));
}

export function getComparePrice(variants?: ProductVariant[]): number | null {
  if (!variants || variants.length === 0) return null;
  const prices = variants.map((v) => v.compareAtPaise).filter(Boolean) as number[];
  return prices.length > 0 ? Math.max(...prices) : null;
}

export function getTotalStock(variants?: ProductVariant[]): number {
  if (!variants) return 0;
  return variants.reduce((sum, v) => sum + (v.available ?? 0), 0);
}
