const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Token management ──
let accessToken: string | null = null;

export function setToken(token: string) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sajani_token', token);
  }
}

export function loadToken(): boolean {
  if (typeof window === 'undefined') return false;
  accessToken = localStorage.getItem('sajani_token');
  return !!accessToken;
}

export function getToken(): string | null {
  return accessToken;
}

export function isLoggedIn(): boolean {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('sajani_token');
  }
  return !!accessToken;
}

export function clearTokens() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sajani_token');
    localStorage.removeItem('sajani_refresh_token');
  }
}

// ── Generic request ──
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
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
  blousePiece: boolean | null; length: string | null; width: string | null;
  weight: number | null; occasion: string | null; tags: string[];
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

export async function getProducts(params?: Record<string, string>): Promise<{ items: Product[]; total: number }> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/api/v1/products${query}`);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return request<Product>(`/api/v1/products/${slug}`);
}

export async function getCart(): Promise<CartResponse> {
  return request<CartResponse>('/api/v1/cart');
}

export async function addToCart(variantId: string, quantity: number): Promise<CartResponse> {
  return request<CartResponse>('/api/v1/cart/items', {
    method: 'POST', body: JSON.stringify({ variantId, quantity }),
  });
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
  return request<CartResponse>(`/api/v1/cart/items/${itemId}`, {
    method: 'PATCH', body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string): Promise<CartResponse> {
  return request<CartResponse>(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' });
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
    localStorage.setItem('sajani_refresh_token', data.refreshToken);
  }
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
