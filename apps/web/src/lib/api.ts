import { notifyCartChanged } from './cart-events';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Token management ──
let accessToken: string | null = null;

export function setToken(token: string) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('juhar_token', token);
  }
}

export function loadToken(): boolean {
  if (typeof window === 'undefined') return false;
  accessToken = localStorage.getItem('juhar_token');
  return !!accessToken;
}

export function getToken(): string | null {
  return accessToken;
}

export function isLoggedIn(): boolean {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('juhar_token');
  }
  return !!accessToken;
}

export function clearTokens() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('juhar_token');
    localStorage.removeItem('juhar_refresh_token');
  }
  notifyCartChanged(); // the badge now shows the guest cart
}

// ── Errors ──
/**
 * A failed API call. `message` is what the customer reads; `requestId` is the reference the API
 * gave this request (it is in every log line as req=<id>), so a customer can read it out and
 * support can find exactly what happened.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public requestId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The request reference of an error, or '' (a network failure has none). */
export function referenceOf(error: unknown): string {
  return error instanceof ApiError ? error.requestId : '';
}

// ── Generic request ──
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
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('juhar_refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (json.success && json.data?.accessToken) {
      setToken(json.data.accessToken);
      return true;
    }
    // The server rejected the refresh token: the session is over.
    if (res.status === 401) clearTokens();
    return false;
  } catch {
    // Network trouble: keep the tokens so a later attempt can still work.
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  // Access token expired: renew it once and repeat the call.
  if (res.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshAccessToken()) return request<T>(path, options, true);
  }

  if (!json.success) {
    const message = json.error?.message || 'Request failed';
    const details = Array.isArray(json.error?.details) ? json.error.details.join('; ') : '';
    const requestId = String(json.requestId || res.headers?.get?.('x-request-id') || '');
    throw new ApiError(details ? `${message}: ${details}` : message, json.error?.code || 'UNKNOWN', res.status, requestId);
  }
  return json.data;
}

// ── Format ──
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ── Types ──
export interface Category {
  id: string; slug: string; name: string; description: string | null;
  sortOrder: number; active: boolean;
}

export interface ProductVariant {
  id: string; sku: string; name: string | null; color: string | null;
  attributes: Record<string, unknown> | null;
  pricePaise: number; compareAtPaise: number | null;
  available: number; isAvailable: boolean;
}

export interface Product {
  id: string; slug: string; title: string; description: string | null;
  shortDescription: string | null;
  origin: string | null; fabric: string | null; weaveMethod: string | null;
  careInstructions: string | null;
  blousePiece: string | null; length: string | null; width: string | null;
  weight: string | null; occasion: string[] | null; tags: string[];
  // List view fields
  startingPricePaise: number; compareAtPaise: number | null;
  totalStock: number;
  // Detail view fields
  variants: ProductVariant[];
  category: Category | null;
  media: { id: string; url: string; thumbnailUrl: string | null; type: string; altText: string | null; sortOrder: number }[];
  // Compat aliases
  material?: string | null; technique?: string | null; weaveType?: string | null;
  images?: { id: string; url: string; alt: string | null; sortOrder: number }[];
}

export interface CartItemResponse {
  id: string;
  variant: {
    id: string; sku: string; name: string | null; color: string | null;
    pricePaise: number; compareAtPaise: number | null; available: number;
    productTitle: string; productSlug: string; imageUrl: string | null;
  };
  quantity: number; lineTotalPaise: number;
  isAvailable: boolean; availabilityWarning?: string;
}

export interface CartResponse {
  items: CartItemResponse[]; subtotalPaise: number; itemCount: number;
}

export interface Address {
  id: string; recipientName: string; recipientPhone: string;
  line1: string; line2?: string; landmark?: string;
  city: string; district: string; state: string; pinCode: string;
  label: string; isDefault: boolean;
}

export interface UserProfile {
  id: string; phone: string; name: string | null; email: string | null;
}

// ── API calls ──
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/api/v1/categories');
}

export interface ProductsPage {
  items: Product[];
  /** pass this back as `cursor` to get the next page; null on the last page */
  cursor: string | null;
  hasMore: boolean;
  /** how many products match the filters, over all pages */
  total: number;
}

export async function getProducts(params?: Record<string, string>): Promise<ProductsPage> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await request<Partial<ProductsPage>>(`/api/v1/products${query}`);
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

export async function getCart(): Promise<CartResponse> {
  return request<CartResponse>('/api/v1/cart');
}

export async function addToCart(variantId: string, quantity: number): Promise<CartResponse> {
  const cart = await request<CartResponse>('/api/v1/cart/items', {
    method: 'POST', body: JSON.stringify({ variantId, quantity }),
  });
  notifyCartChanged();
  return cart;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
  const cart = await request<CartResponse>(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH', body: JSON.stringify({ quantity }),
  });
  notifyCartChanged();
  return cart;
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  const cart = await request<CartResponse>(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' });
  notifyCartChanged();
  return cart;
}

export async function requestOtp(phone: string) {
  return request('/api/v1/auth/otp/request', {
    method: 'POST', body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const data = await request<{ accessToken: string; refreshToken: string; isNewUser: boolean }>(
    '/api/v1/auth/otp/verify',
    { method: 'POST', body: JSON.stringify({ phone, otp }) }
  );
  setToken(data.accessToken);
  if (typeof window !== 'undefined') {
    localStorage.setItem('juhar_refresh_token', data.refreshToken);
  }
  notifyCartChanged(); // the badge now shows the account's cart
  return data;
}

export async function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/api/v1/me');
}

export async function updateProfile(data: { name?: string; email?: string }): Promise<UserProfile> {
  return request<UserProfile>('/api/v1/me', {
    method: 'PATCH', body: JSON.stringify(data),
  });
}

export async function getAddresses(): Promise<Address[]> {
  return request<Address[]>('/api/v1/me/addresses');
}

export async function createAddress(data: Omit<Address, 'id'>): Promise<Address> {
  return request<Address>('/api/v1/me/addresses', {
    method: 'POST', body: JSON.stringify(data),
  });
}

// ── Orders ──
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
  loadToken(); // order pages may open before any other call has loaded the token
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
  loadToken();
  return request<any>(`/api/v1/orders/${id}`);
}

export async function placeOrder(input: {
  addressId: string; paymentMode: string; idempotencyKey: string; notes?: string;
}): Promise<any> {
  loadToken();
  const order = await request<any>('/api/v1/orders', { method: 'POST', body: JSON.stringify(input) });
  notifyCartChanged(); // placing an order empties the cart
  return order;
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
