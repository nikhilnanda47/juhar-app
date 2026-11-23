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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
    return this.request<any[]>('/api/v1/admin/categories');
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
    return this.request<{ items: any[]; cursor: string | null; hasMore: boolean }>(
      `/api/v1/admin/products${query}`,
    );
  }

  async createProduct(data: Record<string, unknown>) {
    return this.request('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Orders ──
  async getOrders(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{
      items: any[];
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

  async updateOrderStatus(id: string, data: { status: string; trackingId?: string; courierName?: string; reason?: string }) {
    return this.request(`/api/v1/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
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

export const api = new ApiClient();
