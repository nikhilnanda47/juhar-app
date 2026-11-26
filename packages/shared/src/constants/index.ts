import { OrderStatus } from '../enums';

// ── Order State Machine ──
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_REJECTED],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURN_REJECTED]: [],
  [OrderStatus.RETURNED]: [OrderStatus.REFUND_PENDING],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Rate Limits ──
export const RATE_LIMITS = {
  OTP_PER_PHONE: { max: 3, windowMinutes: 10 },
  OTP_PER_IP: { max: 10, windowMinutes: 60 },
  OTP_VERIFY_ATTEMPTS: 5,
  API_PER_USER: { max: 100, windowMinutes: 1 },
  API_PUBLIC_PER_IP: { max: 30, windowMinutes: 1 },
} as const;

// ── Auth ──
export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  OTP_RESEND_SECONDS: 30, // the API refuses a new code for the same number until this long after the last one
  OTP_LENGTH: 6,
} as const;

// ── Shipping (pilot: one flat rate) ──
// The ONE place the rule is written. The API charges with it and publishes it at
// GET /api/v1/config/shipping, which the web and mobile apps read for what they display.
export const SHIPPING = {
  FLAT_PAISE: 9900, // ₹99
  FREE_ABOVE_PAISE: 500000, // free when the subtotal is ₹5,000 or more
} as const;

// ── Delivery ──
// The ONE place the delivery rule is written (see utils/delivery.ts). The pilot delivers all over India,
// takes 5 to 7 days, and offers cash on delivery everywhere it delivers.
export const DELIVERY = {
  DAYS_MIN: 5,
  DAYS_MAX: 7,
  COD_AVAILABLE: true,
} as const;

// ── Inventory ──
export const INVENTORY = {
  UPI_RESERVATION_MINUTES: 30,
  COD_RESERVATION_MINUTES: 1440, // 24 hours
  EXPIRY_WORKER_INTERVAL_SECONDS: 60,
  /** A variant with this many pieces or fewer (but at least 1) available is "low stock" */
  LOW_STOCK_THRESHOLD: 3,
} as const;

// ── Cart ──
export const CART = {
  MAX_QUANTITY_PER_VARIANT: 10,
  MAX_ADDRESSES_PER_USER: 10,
} as const;

// ── Pagination ──
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

// ── Upload ──
export const UPLOAD = {
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_MIMES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_VIDEO_MIMES: ['video/mp4'] as const,
  SIGNED_URL_EXPIRY_SECONDS: 300, // 5 minutes
} as const;

// ── Returns ──
export const RETURNS = {
  WINDOW_DAYS: 7,
} as const;

// ── Order Number ──
export const ORDER_NUMBER_PREFIX = 'JUH';

// ── Currency ──
export const CURRENCY = {
  CODE: 'INR',
  PAISE_PER_RUPEE: 100,
} as const;
