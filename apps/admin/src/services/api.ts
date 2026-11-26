const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Sign-in and token-refresh calls must never trigger a refresh themselves.
const NO_REFRESH_PATHS = [
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/refresh',
];

export class ApiClient {
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('juhar_admin_token', token);
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('juhar_admin_token');
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('juhar_admin_refresh');
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('juhar_admin_token');
      localStorage.removeItem('juhar_admin_refresh');
    }
  }

  // One refresh at a time: calls that fail together share the same attempt.
  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();
      if (json.success && json.data?.accessToken) {
        this.setToken(json.data.accessToken);
        return true;
      }
      // The server rejected the refresh token: the session is over.
      if (res.status === 401) this.clearToken();
      return false;
    } catch {
      // Network trouble: keep the tokens so a later attempt can still work.
      return false;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    // A file upload (FormData) must not be given a JSON type: the browser adds its own, with the boundary
    const isUpload = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isUpload ? {} : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();

    if (res.status === 401 && !retried && !NO_REFRESH_PATHS.includes(path)) {
      if (await this.refreshAccessToken()) {
        return this.request<T>(path, options, true);
      }
    }

    if (!json.success) {
      const error = json.error || { code: 'UNKNOWN', message: 'Request failed' };
      throw new ApiError(error.code, error.message, res.status, error.details);
    }

    return json.data;
  }

  // ── Auth ──
  async requestOtp(phone: string) {
    return this.request<{ message: string; expiresInSeconds: number }>(
      '/api/v1/auth/otp/request',
      { method: 'POST', body: JSON.stringify({ phone }) },
    );
  }

  async verifyOtp(phone: string, otp: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
      user: { id: string; phone: string; name: string | null; type: string; role?: string };
    }>('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async getMe() {
    return this.request<{ id: string; phone: string; name: string | null; type: string; role?: string }>(
      '/api/v1/auth/me',
    );
  }

  // ── Categories ──
  async getCategories() {
    return this.request<AdminCategory[]>('/api/v1/admin/categories');
  }

  async createCategory(data: { name: string; slug?: string; description?: string; sortOrder?: number }) {
    return this.request('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Products ──
  async getProducts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{
      items: AdminProductListItem[];
      cursor: string | null;
      hasMore: boolean;
      /** Counts over the whole catalog (not just this page or filter) */
      counts?: ProductCounts;
    }>(`/api/v1/admin/products${query}`);
  }

  async createProduct(data: Record<string, unknown>) {
    return this.request<{ id: string; slug: string }>('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Photos (every call answers with the product's whole photo list, in order; the first is the cover) ──

  /** Upload one photo. The server shrinks it and keeps a large and a small copy. */
  async uploadPhoto(productId: string, file: File, details: { altText?: string; variantId?: string } = {}) {
    const form = new FormData();
    form.append('file', file);
    if (details.altText) form.append('altText', details.altText);
    if (details.variantId) form.append('variantId', details.variantId);
    return this.request<AdminPhoto[]>(`/api/v1/admin/products/${productId}/media`, { method: 'POST', body: form });
  }

  /** Change a photo's description, or the colour it shows (null: the whole saree). */
  async updatePhoto(productId: string, photoId: string, data: { altText?: string | null; variantId?: string | null }) {
    return this.request<AdminPhoto[]>(`/api/v1/admin/products/${productId}/media/${photoId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /** Put the photos in a new order: every photo id of the product, the first becomes the cover. */
  async reorderPhotos(productId: string, ids: string[]) {
    return this.request<AdminPhoto[]>(`/api/v1/admin/products/${productId}/media/order`, {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  }

  async removePhoto(productId: string, photoId: string) {
    return this.request<AdminPhoto[]>(`/api/v1/admin/products/${productId}/media/${photoId}`, { method: 'DELETE' });
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /** One product in full with ALL its colours (also the ones hidden from the shop) and their stock. */
  async getProduct(id: string) {
    return this.request<AdminProductDetail>(`/api/v1/admin/products/${id}`);
  }

  /** Change one colour: name, colour, price, compare-at price (null removes it), or hide/show it in the shop. */
  async updateVariant(productId: string, variantId: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /** Add a new colour to an existing product. */
  async addVariant(productId: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/admin/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Orders ──
  async getOrders(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{
      items: AdminOrderListItem[];
      cursor: string | null;
      hasMore: boolean;
      /**
       * Counts over all orders (not just this page): placed, placed COD orders waiting more than
       * 24 hours, and today's totals for India (cancelled orders left out).
       */
      counts?: {
        placed: number;
        overdue: number;
        today: { date: string; orders: number; gmvPaise: number };
      };
    }>(
      `/api/v1/admin/orders${query}`,
    );
  }

  // ── Stock ──
  /** Change the on-hand stock of one colour: add or remove an `adjustment`, or give the counted number as `setTo`. */
  async adjustStock(body: { variantId: string; adjustment?: number; setTo?: number; reason: StockReason; notes?: string }) {
    return this.request<{ variantId: string; onHand: number; reserved: number; unavailable: number; available: number }>(
      '/api/v1/admin/inventory/adjust',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** The recent manual stock changes of one colour, newest first. */
  async getStockHistory(variantId: string) {
    return this.request<StockChange[]>(`/api/v1/admin/inventory/${variantId}/history`);
  }

  /** One order in full: items, delivery address, customer, payment, shipments and history. */
  async getOrder(id: string) {
    return this.request<AdminOrderDetail>(`/api/v1/admin/orders/${id}`);
  }

  async updateOrderStatus(id: string, data: { status: string; trackingId?: string; courierName?: string; reason?: string }) {
    return this.request(`/api/v1/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export interface ProductCounts {
  products: number;
  published: number;
  draft: number;
  archived: number;
  variants: number;
  /** Active variants with 1 to lowStockThreshold pieces available */
  lowStock: number;
  /** What counts as low stock: this many pieces available or fewer */
  lowStockThreshold: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The sentence to show for a failed call: the error's own message, or `fallback` when it has none. */
export function messageOf(error: unknown, fallback: string): string {
  return (error instanceof Error && error.message) || fallback;
}

export const api = new ApiClient();

/** A category as the admin lists it */
export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

/** One product in the admin's product list (and the inventory page, which reads the same list) */
export interface AdminProductListItem {
  id: string;
  slug: string;
  title: string;
  publishStatus: string;
  fabric: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
  variants: {
    id: string;
    sku: string;
    name: string | null;
    color: string | null;
    pricePaise: number;
    inventory: { onHand: number; reserved: number; unavailable: number } | null;
  }[];
  /** the cover photo (small copy), null when there is none yet */
  primaryImage?: { url: string; alt: string | null } | null;
}

/** One order in the admin's list of orders */
export interface AdminOrderListItem {
  id: string;
  publicNumber: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  totalPaise: number;
  itemCount: number;
  items: { productTitle: string; variantName?: string | null; qty: number; totalPaise: number }[];
  createdAt: string;
  customer: { id: string; phone: string; name: string | null } | null;
  /** minutes a "placed" order has waited for an admin; null for any other status */
  waitingMinutes: number | null;
  overdue: boolean;
}

export interface AdminOrderDetail {
  id: string;
  publicNumber: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  notes: string | null;
  createdAt: string;
  cancellationReason: string | null;
  /** the delivery address as it was when the order was placed */
  address: {
    recipientName: string; recipientPhone: string;
    line1: string; line2?: string | null; landmark?: string | null;
    city: string; district: string; state: string; pinCode: string;
  };
  customer: { id: string; phone: string; name: string | null } | null;
  items: {
    id: string; productTitle: string; variantName: string | null; color: string | null; sku: string;
    /** the small photo of this colour (or of the saree), to pick the right one off the shelf; null when there is none */
    imageUrl?: string | null;
    qty: number; unitPricePaise: number; totalPaise: number;
  }[];
  shipments: { id: string; carrier: string | null; trackingId: string | null; status: string; dispatchedAt: string | null; deliveredAt: string | null }[];
  payments: { id: string; gateway: string; method: string | null; status: string; amountPaise: number; paidAt: string | null }[];
  /** oldest first; `by` is the admin who did the step, null when it was the customer */
  history: { status: string; at: string; by: { name: string; role: string } | null; reason: string | null }[];
  waitingMinutes: number | null;
  overdue: boolean;
}

export type StockReason = 'received' | 'damaged' | 'correction' | 'return_restocked' | 'other';

export interface StockChange {
  at: string;
  adjustment: number | null;
  onHandBefore: number | null;
  onHandAfter: number | null;
  reason: StockReason | null;
  notes: string | null;
  by: { name: string; role: string } | null;
}

/** One product photo as the admin sees it: `url` is the large copy, `thumbnailUrl` the small one */
export interface AdminPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string | null;
  sortOrder: number;
  /** the colour it shows, or null for the whole saree */
  variantId: string | null;
  width: number | null;
  height: number | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  categoryId: string;
  category: { id: string; name: string } | null;
  publishStatus: 'draft' | 'published' | 'archived';
  fabric: string | null;
  weaveMethod: string | null;
  origin: string | null;
  careInstructions: string | null;
  blousePiece: string | null;
  length: string | null;
  width: string | null;
  weight: string | null;
  occasion: string[];
  tags: string[];
  media: AdminPhoto[];
  variants: {
    id: string;
    sku: string;
    name: string | null;
    color: string | null;
    pricePaise: number;
    compareAtPaise: number | null;
    active: boolean;
    inventory: { onHand: number; reserved: number; unavailable: number } | null;
  }[];
}
