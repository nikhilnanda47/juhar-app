# Juhar — High-Level Design (Pilot P0)

**Version:** 1.0  
**Date:** 13 November 2026  
**Status:** Draft for review  
**Last synced with code:** 22 November 2026 (see "Implementation status" notes)  
**Scope:** Pilot launch — Sambalpur / Western Odisha, ~20–30 SKUs, 5–6 pieces per design

---

## 1. Pilot Scope Summary

**What we're building:**
- Mobile app for customers to browse Sambalpuri sarees, place orders (UPI + COD)
- Admin panel for catalog, inventory, orders, and fulfillment management
- Backend API with atomic inventory reservations and payment verification

**What we're NOT building (pilot):**
- Web storefront, SEO pages
- Multi-vendor/seller marketplace
- AI recommendations, AR try-on
- Microservices, Kafka, Kubernetes
- Nationwide fulfillment
- Wishlist, reviews, personalization, loyalty, push campaigns

> **Implementation status (2026-11-22):** The responsive customer website (`apps/web`, Next.js 14) was added after this scope was written (see 3.2). It is a storefront without dedicated SEO work. Everything else in the list above remains out of scope.

**Pilot constraints:**
- ~20–30 designs, ~5–6 pieces each from a single relative-owned manufacturing unit
- Sambalpur and Western Odisha delivery area
- Small catalog = simple search (no Elasticsearch needed)
- Low traffic = single API instance, no read replicas

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile App | React Native 0.88 + Expo SDK 58 + React 19 + React Navigation 7 + TypeScript | Cross-platform Android/iOS from one codebase |
| Web App | Next.js 14 + React 18 + Tailwind CSS 3.4 + TypeScript | Customer-facing website, responsive, SEO-ready |
| Backend API | NestJS + TypeScript | Modular, typed, OpenAPI generation |
| ORM | Prisma | Type-safe queries, versioned migrations |
| Database | PostgreSQL 16 | ACID for inventory reservations, JSONB for attributes |
| Admin Panel | Next.js + TypeScript | React ecosystem, shared types with API |
| Object Storage | AWS S3 | Product images; signed uploads |
| CDN | CloudFront | Image delivery across India |
| Auth | OTP via SMS (MSG91 / Gupshup) | Phone-based, India standard |
| Payments | Razorpay (or Cashfree) | UPI, webhook verification, refund APIs |
| Shipping | Manual entry (pilot) | Admin enters tracking ID; no courier API integration yet |
| Notifications | WhatsApp Business API | Order confirmations, shipping updates |
| Monorepo | npm workspaces | Shared types across apps |
| CI/CD | GitHub Actions | Lint → test → build → deploy |
| Hosting | Railway / Render / AWS (TBD) | Managed PostgreSQL + container hosting |

> **Implementation status (2026-11-22):** The table above is the target stack. In the code today:
> - **OTP:** a mock provider with a fixed code (`123456`); no SMS provider is wired (see section 9).
> - **Payments:** not integrated. Only Cash on Delivery works.
> - **Object storage / CDN:** not integrated. Products use placeholder images; there is no Media module.
> - **Notifications / WhatsApp:** not built. WhatsApp integration is pending, and the web order page still contains a placeholder support number.
> - **CI/CD:** GitHub Actions runs typecheck/test/build for API, web, admin and mobile (section 8). There is no lint step (no ESLint config yet) and no automated deploy.

---

## 3. Application Components

### 3.1 Mobile App (`apps/mobile`)

**Onboarding (2 screens — implemented)**

| Screen | P0 Features |
|---|---|
| Splash | "Juhar ଜୁହାର୍" wordmark (Noto Serif 28px, primary), pulsing dots, fade-in animation, 2.5s auto-dismiss |
| Welcome / Onboarding | 3-slide carousel with swipe + pagination dots. Slides: "Handwoven with care", "Direct from the loom", "Delivered to your door". Skip link + Next/Start Shopping CTA. Shown only on first launch (AsyncStorage flag) |

**Authentication (embedded in Profile screen)**

Login Phone, OTP Verify, and Name Capture are inline states within the Profile/Account screen — not separate screen files. Phone input with +91 prefix, 6-digit OTP, and name capture with skip option.

**Core Shopping Flow (8 screens — implemented)**

| Screen | P0 Features |
|---|---|
| Home | Sub-header "Juhar ଜୁହାର୍" + "WESTERN ODISHA", 16:9 hero with gradient overlay, 2×2 collection grid with gradient name overlay, horizontal New Arrivals with low stock text |
| Explore | "Shop" title (Noto Serif 22px), search bar with shadow + filter icon, category chips, count row, product cards with wishlist heart overlay, origin badge, stock status |
| Product Detail | 3:4 hero with "GI CERTIFIED LOOM" badge, dot pagination, scarcity pill, price + discount pill, color swatches, PIN code check, details table, delivery items, "You may also like" scroll, sticky Add to Bag (green on success). Guests can add to bag (local guest cart, see 3.3); login is required at checkout |
| Cart | Back circle + "My Bag (N)", free shipping progress meter, item cards with thumbnails + stepper (minus removes at qty 0) + "Save to Wishlist", coupon section, price details, sticky bar with savings |
| Checkout — Address | "Saved Addresses" with count badge, address cards with radio + "Default" badge + delivery estimate, "Add New Address" button, assurance note, sticky "Deliver Here" |
| Checkout — Add Address | Reassurance banner, shadow inputs (no border), +91 phone prefix, label chips (Home/Office/Other), custom checkbox, sticky "Save Address" |
| Checkout — Review | "Delivering to" + "VERIFIED ADDRESS" badge, address card with Change, items with cluster dot badge, payment radios (COD selected, UPI disabled), price details, delivery notice, trust footer, sticky "Place Order" |
| Order Success | BounceIn green checkmark, "Order placed!" (Noto Serif), craft gratitude subtitle, tappable order ref pill, preview card with delivery info, assurance card, "View Order" + "Continue Shopping →" |

**Post-Purchase (2 screens — implemented)**

| Screen | P0 Features |
|---|---|
| Orders List | Summary banner with order count + "ARTISAN CERTIFIED", order cards with status badge, item preview strip, "ORDER TOTAL" + "View Details →", support note |
| Order Detail | COD badge + date, status timeline with green checkmarks (all completed steps green), tracking section with courier + copy button, items with prices, delivery address with location icon + HOME badge, payment summary with COD badge, WhatsApp support card |

**Profile & Account (1 screen — implemented)**

| Screen | P0 Features |
|---|---|
| Profile | Avatar circle with initials (56px, primary bg), name + phone, settings button. 3-column quick action tiles (Orders/Saved/Addresses with icon circles + subtitles). Menu card: Edit Profile, FAQs, Help & Support (WhatsApp 24/7 badge), Terms & Privacy. Log Out button (#C44A4A). App version footer. Inline auth screens for phone/OTP/name capture |

**Deferred screens (9 — not yet implemented)**

No Internet, App Update Required, Maintenance, My Addresses (standalone), Search Results, FAQs (standalone). Login Phone / OTP / Name Capture are handled inline in Profile.

**Total: 13 screens implemented**

**Theming and dark mode (implemented)**

- **Structure:** `src/theme/colors.ts` defines two full palettes (`lightColors`, `darkColors`) and the `ColorPalette` type. `ThemeProvider` (`src/theme/ThemeContext.tsx`) wraps the app in `App.tsx`; screens call `useTheme()` for `{ colors, isDark, toggleTheme }` and build styles with `createStyles(colors)` inside `useMemo`. Surfaces and text take their colours from the active palette rather than fixed values.
- **Persistence:** the choice is stored in `AsyncStorage` under the key `juhar_theme` (`'light'` or `'dark'`).
- **Toggle:** Profile screen menu card (a `Switch`, labelled "Dark Mode"/"Light Mode") when logged in, and a sun/moon icon button in the Account header on the login screen, so guests can switch too.
- **Navigation chrome:** stack headers, the tab bar and the status bar (`light`/`dark` style) follow the active palette.

> **Implementation status (2026-11-22):** The app always starts in light mode and applies the saved choice once `AsyncStorage` has loaded, so a brief light flash is possible on launch. System appearance is not read (`userInterfaceStyle` is `automatic` in `app.json`, but `ThemeProvider` does not follow it). No "follow system" option exists yet.

### 3.2 Web App (`apps/web`)

**Technology:** Next.js 14 (App Router) + Tailwind CSS + TypeScript  
**Port:** `localhost:3001`  
**Purpose:** Customer-facing responsive website with same features as mobile app

**11 pages** mirroring all mobile screens:

| Route | Description | Desktop Layout |
|-------|-------------|----------------|
| `/` | Home — hero, collections, new arrivals | Full-width hero, 4-col grid |
| `/shop` | Product listing — search, filters, grid | Filter chips, 5-col grid, table-like |
| `/shop/[slug]` | Product detail — images, variants, add to bag | 55/45 split (image + info), thumbnail strip |
| `/cart` | Cart — items, stepper, price summary | 2-col (items + sticky price sidebar) |
| `/checkout/address` | Select delivery address | 2-col grid cards + sticky summary sidebar |
| `/checkout/address/new` | Add new address | Numbered sections, live preview sidebar |
| `/checkout/review` | Order review — place order | Centered, single column |
| `/order-success` | Order confirmation | Centered card |
| `/orders` | Orders list | Table layout with filter chips |
| `/orders/[id]` | Order detail — timeline, tracking | Horizontal timeline + 2-col sidebar |
| `/account` | Profile / Login / OTP | Split-panel auth; 2-col profile |

**Key features:**
- **Responsive:** Bottom nav on mobile (hidden `lg:`), desktop nav in header
- **Guest cart:** Items stored in `localStorage`, synced to server on login
- **Cart badge:** Count shown on cart icon in both Header and BottomNav via `CartProvider` context
- **Same API:** Connects to same backend as mobile app (`localhost:3000`)
- **Auth:** Split-panel login (burgundy brand panel + form), OTP verify, name capture
- **Order states:** the order detail page shows a cancelled banner (date + reason) for cancelled orders and a return/refund notice above a completed timeline for post-delivery statuses; the orders list has a badge for each status
- **Build constraint:** pages that call `useSearchParams()` (`/checkout/review`, `/order-success`) render their content inside a `<Suspense>` boundary, which `next build` requires for static prerendering
- **Zoom:** pinch-zoom is allowed (the viewport does not disable scaling)

**Theming and dark mode (implemented)**

- **Tokens:** colours are CSS custom properties holding RGB channels (e.g. `--color-primary: 139 58 74`) in `src/app/globals.css`, defined under `:root` (light) and `.dark` (dark). `tailwind.config.ts` maps every colour to `rgb(var(--color-…) / <alpha-value>)`, so opacity modifiers such as `bg-surface/80` work in both themes. `darkMode: 'class'`.
- **Provider:** `ThemeProvider` / `useTheme()` in `src/lib/theme-context.tsx` toggles the `dark` class on `<html>`, saves the choice in `localStorage` under `juhar_theme`, and updates the `theme-color` meta tag (`#FAFAF7` light, `#121212` dark).
- **No flash on load:** an inline script in `src/app/layout.tsx` reads `juhar_theme` before first paint and adds the `dark` class; `<html>` uses `suppressHydrationWarning`.
- **Toggle:** sun/moon button in the desktop Header, and a toggle row in the Account page menu (logged-in profile view).

> **Implementation status (2026-11-22):** The default is light; the system preference is not detected. There is no toggle in the mobile-width layout for logged-out visitors (the Header toggle is desktop-only and the login panel has none). The admin panel has no dark mode.

### 3.3 Guest Cart Flow

Users can browse and add to cart without logging in:

1. **Add to Bag** → stored locally (`AsyncStorage` on mobile, `localStorage` on web)
2. **Cart tab** → renders local cart with full stepper/remove functionality
3. **Proceed to Checkout** → redirected to login
4. **After login** → `syncLocalCartToServer()` pushes local items to server cart, clears local storage
5. **Cart badge** → updates on both platforms, polling every 2–3 seconds

**Files:** `apps/mobile/src/services/localCart.ts`, `apps/web/src/lib/cart-context.tsx`

### 3.4 Backend API (`apps/api`)

12 NestJS modules for pilot:

| Module | P0 Scope |
|---|---|
| **Auth** | OTP send/verify, JWT sessions, rate limiting |
| **Users** | Profile, phone verification |
| **Addresses** | CRUD, PIN code, default address |
| **Categories** | List, sort order |
| **Products** | CRUD (admin), public search/filter/sort, paginated catalog |
| **Media** | Signed S3 uploads, thumbnail generation, CDN URLs |
| **Inventory** | on_hand/reserved/available per SKU, atomic reservation with row lock, expiry worker, audit log |
| **Cart** | Server-side cart, price recalculation, variant validation |
| **Checkout** | Quote (totals + shipping + tax), stock reservation → order creation in single transaction |
| **Orders** | State machine (Placed→Confirmed→Packed→Shipped→Delivered + cancellation/return branches), payment status tracking |
| **Payments** | Gateway integration, webhook signature verification, amount validation, idempotent processing, manual refunds |
| **Admin** | RBAC (owner, catalog_editor, fulfillment_operator, support), audit events |

**Deferred modules (post-pilot):** Shipping API integration, Notifications service, Analytics/reporting engine

> **Implementation status (2026-11-22):** 9 of the 12 modules are active: Auth, Users, Addresses, Categories, Products, Inventory, Cart, Checkout, Orders. **Media**, **Payments** and the standalone **Admin** module (reports, admin-user management) are not built. Admin endpoints for categories, products, inventory and orders live inside their feature modules, protected by `JwtAuthGuard` + `AdminAuthGuard` + `RolesGuard`. The stock reservation expiry worker is implemented (every minute). Known gaps in these modules (inventory settlement on confirm/ship, order-number generation, admin cancel reason, auth rate limiting) are tracked in the team tracker.

### 3.5 Admin Panel (`apps/admin`)

| Section | P0 Scope |
|---|---|
| Dashboard | Today's orders count, pending confirmations, low stock alerts |
| Catalog | Create/edit/archive products, categories, variants, image upload, fabric metadata, preview before publish |
| Inventory | Stock per SKU, manual adjustments with reason + audit trail |
| Orders | Search/filter by status/date/phone, confirm, pack, dispatch (enter tracking ID), cancel, process returns, initiate refunds |
| Customers | Lookup by phone or order ID, support notes |
| Reports | Orders, GMV, COD pending, refunds, stock summary, top products |
| Settings | Admin user management, role assignment |

> **Implementation status (2026-11-22):** Built: OTP login, dashboard (stats + recent orders), categories (list/create/activate), product catalog (list, create with variants, publish/unpublish), inventory (view only) and orders (search/filter; confirm → pack → ship with tracking ID → deliver; cancel a placed or confirmed order with a required reason). **Not built:** product edit, manual stock adjustment UI (the API endpoint exists), order detail page, returns and refunds, customers, reports, settings/RBAC management. The panel is light-theme only.

### 3.6 Shared Package (`packages/shared`)

- TypeScript DTOs and interfaces
- Enums: `OrderStatus`, `PaymentStatus`, `ShipmentStatus`, `AdminRole` (plus payment mode, reservation, publish, return, refund and stock-adjustment enums)
- Constants: state machine transitions (`ORDER_TRANSITIONS`, `canTransitionOrder`), rate limits, auth/inventory/cart limits, order-number prefix
- Utils: paise ↔ rupee formatting, slug generation, order-number generation, phone and PIN validation

> **Implementation status (2026-11-22):** The package compiles to `packages/shared/dist/` (`main`/`types` point there). A root `postinstall` script (`npm run build -w packages/shared`) builds it after every `npm install` / `npm ci`, so a fresh clone can typecheck and run the API without a separate step. Compiled output is git-ignored and no longer committed next to the sources. The API imports it as `@juhar/shared`. The admin panel maps it to the source via a tsconfig path but does not import it yet. The order-number prefix constant is `JUH`, so generated numbers read `JUH-YYYYMMDD-XXXX` (orders placed before the rename may carry the old `SAJ-` prefix).

---

## 4. Data Flow

### 4.1 Customer Purchase Flow

```
Customer                       API                          External
────────                       ───                          ────────
Browse (guest)
  ├─ GET /categories
  ├─ GET /products?filters
  └─ GET /products/:slug

Login (at checkout)
  ├─ POST /auth/otp/request ──────────────────────────────> OTP Provider
  └─ POST /auth/otp/verify ───> JWT issued

Cart
  ├─ POST /cart/items ─────────> validate variant + stock
  └─ GET  /cart ───────────────> server-priced items

Checkout
  ├─ POST /checkout/quote ─────> calculate totals + shipping
  │
  ├─ POST /orders ─────────────> BEGIN TX
  │   (idempotency key)           ├─ SELECT inventory FOR UPDATE
  │                                ├─ Reserve stock
  │                                ├─ Create order (PLACED)
  │                                └─ COMMIT
  │
  │ [If UPI prepaid]
  ├─ POST /payments/initiate ──────────────────────────────> Payment Gateway
  │                            <── checkout URL ────────────
  │ [Customer pays]
  │                            <── POST /webhooks/payments ─ Payment Gateway
  │                                ├─ Verify signature
  │                                ├─ Verify amount
  │                                ├─ Update payment = SUCCESS
  │                                └─ Order = CONFIRMED
  │
  │ [If COD]
  │                                └─ Order = PLACED (unpaid)
  │                                    Admin manually confirms
  │
  └─ GET /orders/:id ──────────> order detail + status
```

### 4.2 Inventory Reservation (Atomic)

```
POST /orders
    │
    ▼
BEGIN TRANSACTION
    ├── SELECT inventory WHERE variant_id = ? FOR UPDATE
    ├── available = on_hand - reserved
    ├── available >= qty?
    │     ├─ YES → reserved += qty
    │     │        Create reservation (expires in 30 min for UPI, 24 hours for COD)
    │     │        Create order
    │     │        COMMIT
    │     └─ NO  → ROLLBACK → 409 Conflict
    │
Expiry Worker (every 60s)
    └── Release expired HELD reservations → reserved -= qty
```

### 4.3 Order State Machine

```
PLACED ──> CONFIRMED ──> PACKED ──> SHIPPED ──> DELIVERED
  │            │                                    │
  ▼            ▼                                    ▼
CANCELLED  CANCELLED                         RETURN_REQUESTED
(release    (release                               │
 stock)      stock)                          ┌─────┴─────┐
                                             ▼           ▼
                                      RETURN_APPROVED  RETURN_REJECTED
                                             │
                                             ▼
                                          RETURNED
                                             │
                                             ▼
                                       REFUND_PENDING
                                             │
                                             ▼
                                          REFUNDED
```

---

## 5. Database Schema (Pilot)

18 tables — single PostgreSQL database:

```
users (id UUID PK, phone UNIQUE, name, email, verified_at, status, created_at, updated_at)
addresses (id, user_id FK, label, recipient_name, recipient_phone, line1, line2, landmark, city, district, state, pin_code, is_default, created_at, updated_at)
categories (id, slug UNIQUE, name, description, image_url, sort_order, active, created_at, updated_at)
products (id, slug UNIQUE, title, description, short_description, category_id FK, publish_status, fabric, weave_method, origin, care_instructions, blouse_piece, length, width, weight, occasion[], tags[], created_at, updated_at)
product_variants (id, product_id FK, sku UNIQUE, name, color, attributes JSONB, price_paise INT, compare_at_paise INT?, active, sort_order, created_at, updated_at)
product_media (id, product_id FK, variant_id?, object_key, thumbnail_key, type, mime_type, alt_text, width, height, size_bytes, sort_order, created_at)
inventory (variant_id PK FK, on_hand INT, reserved INT, unavailable INT, version INT, updated_at)
inventory_reservations (id, variant_id FK, order_id?, qty, status, expires_at, created_at, updated_at)
cart_items (id, user_id FK, variant_id FK, quantity, added_at, updated_at)
orders (id, public_number UNIQUE, user_id FK, status, payment_mode, payment_status, subtotal_paise, discount_paise, shipping_paise, tax_paise, total_paise, address_snapshot JSONB, notes, idempotency_key UNIQUE, confirmed_at, packed_at, shipped_at, delivered_at, cancelled_at, cancellation_reason, created_at, updated_at)
order_items (id, order_id FK, variant_id FK, product_title, variant_name, sku, qty, unit_price_paise, tax_paise, total_paise, product_image_url, created_at)
payments (id, order_id FK, gateway, provider_order_id, provider_payment_id, method, amount_paise, currency, status, failure_reason, paid_at, created_at, updated_at)
shipments (id, order_id FK, carrier, tracking_id, tracking_url, status, estimated_delivery, dispatched_at, delivered_at, created_at, updated_at)
returns (id, order_id FK, order_item_id FK, qty, reason, reason_detail, status, admin_notes, requested_at, resolved_at, created_at, updated_at)
refunds (id, order_id FK, return_id? FK, payment_id FK, gateway_refund_id, amount_paise, status, reason, initiated_by FK, created_at, updated_at)
admin_users (id, phone UNIQUE, name, email, role, status, last_login_at, created_at, updated_at)
audit_events (id, actor_type, actor_id, action, entity_type, entity_id, before_state JSONB, after_state JSONB, metadata JSONB, created_at)
webhook_events (id, provider, provider_event_id UNIQUE, event_type, payload JSONB, status, processed_at, error_message, created_at)
```

Key constraints: integer paise for money, UTC timestamps, UUID PKs, indexes on SKU/slug/phone/order status/public_number. See `docs/architecture/database-design.md` for full column details, types, and constraints.

---

## 6. REST API Contract (Pilot)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health | Public | Health check |
| POST | /api/v1/auth/otp/request | Public (rate-limited) | Send OTP |
| POST | /api/v1/auth/otp/verify | Public | Verify OTP, get JWT |
| POST | /api/v1/auth/refresh | Public | Refresh access token |
| GET | /api/v1/me | Customer | Get profile |
| PATCH | /api/v1/me | Customer | Update profile |
| GET | /api/v1/me/addresses | Customer | List addresses |
| POST | /api/v1/me/addresses | Customer | Create address |
| PATCH | /api/v1/me/addresses/:id | Customer | Update address |
| DELETE | /api/v1/me/addresses/:id | Customer | Delete address |
| GET | /api/v1/categories | Public | Category list |
| GET | /api/v1/products | Public | Paginated catalog with filters/sort |
| GET | /api/v1/products/:slug | Public | Product detail |
| GET | /api/v1/cart | Customer | Get cart (server-priced) |
| POST | /api/v1/cart/items | Customer | Add to cart |
| PATCH | /api/v1/cart/items/:id | Customer | Update cart item quantity |
| DELETE | /api/v1/cart/items/:id | Customer | Remove from cart |
| POST | /api/v1/checkout/quote | Customer | Server-calculated totals |
| POST | /api/v1/orders | Customer | Place order (idempotent) |
| GET | /api/v1/orders | Customer | Order history |
| GET | /api/v1/orders/:id | Customer (owner) | Order detail |
| POST | /api/v1/orders/:id/cancel | Customer | Cancel order |
| POST | /api/v1/orders/:id/return | Customer | Request return |
| POST | /api/v1/payments/:orderId/initiate | Customer | Start UPI payment |
| POST | /api/v1/webhooks/payments | Webhook (signed) | Payment callback |
| POST | /api/v1/admin/categories | Admin | Create category |
| PATCH | /api/v1/admin/categories/:id | Admin | Update category |
| GET | /api/v1/admin/products | Admin | List all products (incl. drafts) |
| POST | /api/v1/admin/products | Admin | Create product with variants |
| PATCH | /api/v1/admin/products/:id | Admin | Update product |
| POST | /api/v1/admin/products/:id/variants | Admin | Add variant |
| PATCH | /api/v1/admin/products/:id/variants/:variantId | Admin | Update variant |
| POST | /api/v1/admin/media/upload-url | Admin | Request signed upload URL |
| POST | /api/v1/admin/media/confirm | Admin | Confirm upload + thumbnails |
| DELETE | /api/v1/admin/media/:id | Admin | Delete media |
| GET | /api/v1/admin/inventory | Admin | List stock levels |
| POST | /api/v1/admin/inventory/adjustments | Admin | Adjust stock (audited) |
| GET | /api/v1/admin/orders | Admin | Search/filter orders |
| GET | /api/v1/admin/orders/:id | Admin | Order detail (admin view) |
| PATCH | /api/v1/admin/orders/:id/status | Admin | Update order status |
| POST | /api/v1/admin/orders/:id/refund | Admin | Initiate refund |
| GET | /api/v1/admin/reports/orders | Admin | Orders & revenue report |
| GET | /api/v1/admin/reports/stock | Admin | Stock summary |
| GET | /api/v1/admin/reports/top-products | Admin | Top selling products |
| GET | /api/v1/admin/users | Admin (owner) | List admin users |
| POST | /api/v1/admin/users | Admin (owner) | Create admin user |

**46 endpoints in the table above.** `docs/api/openapi.yaml` is the detailed reference and lists 49 operations (35 implemented, 14 planned): it also documents `GET /auth/me`, `GET /admin/categories` and `GET /admin/inventory/{variantId}`, which are implemented but not in this table. Errors: `{success, error: {code, message, details?}, requestId}` with 400/401/403/404/409/429 statuses. See `docs/api/openapi.yaml` for full request/response schemas.

> **Implementation status (2026-11-22):** The API implements the auth, profile, address, catalog, cart, checkout, customer-order and admin category/product/order endpoints in the table. **Not implemented yet:** `POST /orders/:id/return`, `POST /payments/:orderId/initiate`, `POST /webhooks/payments`, the three `/admin/media/*` endpoints, `GET /admin/orders/:id`, `POST /admin/orders/:id/refund`, the three `/admin/reports/*` endpoints and both `/admin/users` endpoints. **Differences:** inventory is exposed as `GET /admin/inventory/:variantId` and `POST /admin/inventory/adjust` (the table shows `GET /admin/inventory` and `POST /admin/inventory/adjustments`); `GET /admin/categories` and `GET /auth/me` exist but are not listed. The table above remains the design target.

---

## 7. External Integrations (Pilot)

| Service | Integration | Pilot Approach |
|---|---|---|
| **OTP** | API call to send/verify | Managed provider (MSG91/Gupshup), rate-limited per phone+IP |
| **Payments** | Server SDK + webhook | Razorpay/Cashfree sandbox → production; verify signature + amount |
| **Media Storage** | S3 signed uploads | Admin uploads images; generate thumbnails on upload via Sharp |
| **CDN** | CloudFront in front of S3 | Cache product images with long TTL |
| **WhatsApp** | API for notifications | Order confirmation + shipping updates (via aggregator) |
| **Shipping** | Manual (no API) | Admin enters carrier name + tracking ID; no automated serviceability |

---

## 8. Deployment (Pilot)

### Environments

| Env | DB | Payments | Purpose |
|---|---|---|---|
| Local | Docker Compose PostgreSQL | Mock | Development |
| Staging | Managed PostgreSQL | Sandbox | Testing with team |
| Production | Managed PostgreSQL (daily backups) | Live | Real orders |

### Infrastructure (Minimal for Pilot)

```
┌─────────────┐  ┌──────────────┐
│ Mobile App  │  │ Admin Panel  │
│ Expo (RN)   │  │ Next.js      │
│ Android+iOS │  │ (Vercel)     │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                │ HTTPS
       ┌────────▼────────┐
       │  NestJS API     │
       │  (Single        │
       │   Container)    │
       │  Railway/Render  │
       └──┬──────┬───────┘
          │      │
   ┌──────▼──┐  ┌▼──────────┐
   │PostgreSQL│  │ S3 + CDN  │
   │(Managed) │  │ (Images)  │
   └─────────┘  └───────────┘
```

- **No load balancer** — single container sufficient for pilot traffic
- **No read replicas** — small dataset, low query volume
- **No message broker** — background workers run in-process (cron-style)
- **No Kubernetes** — managed container platform (Railway/Render) or single EC2

### CI/CD

```
Push → Lint + Typecheck + Test (parallel) → Build → Deploy Staging (auto) → Deploy Prod (manual)
```

> **Implementation status (2026-11-22):** The pipeline in `.github/workflows/ci.yml` runs four parallel jobs on Node 22. Deploy stages are not automated yet.
>
> ```
> Triggers: push to main and develop-*  ·  pull request into main  ·  manual dispatch
> (a newer run on the same ref cancels the older one; each job has a 15-minute timeout)
>
> API     npm ci → prisma generate → migrate deploy → schema check → typecheck (shared + api) → test → build
>         (Postgres 16 service container; JWT/DB env supplied for tests; migrations are applied to it
>         and `prisma migrate diff` fails the job if schema.prisma has a change with no migration)
> Web     npm ci → typecheck → next build
> Admin   npm ci → typecheck → test (Jest) → next build
> Mobile  npm ci (inside apps/mobile) → tsc --noEmit
> ```
>
> - `npm ci` at the repo root also runs the `postinstall` that builds `packages/shared` into `dist/`.
> - Mobile has its own install because `apps/mobile` is not part of the root npm workspaces (Expo needs an isolated `node_modules`).
> - There is no lint step (no ESLint config exists yet), and the API test job runs Jest (`npm test -w apps/api`); it now fails if no tests are found. Covered so far: the order state machine, stock reservation and checkout (fake database, no Postgres needed), plus the database `CHECK` constraints, which are tested against the migrated Postgres service (`DB_TESTS=1`).
> - A fifth job, `build`, depends on the four above and fails unless they all succeeded. The repository ruleset `main-protection` requires a check with exactly that name, plus a pull request with 1 approving review, and blocks deletion and force-pushes on `main`. Renaming or removing the `build` job would make pull requests unmergeable until the ruleset is updated.

---

## 9. Security (Pilot)

| Area | Approach |
|---|---|
| Auth | Phone OTP → JWT (15min access + 7d refresh) |
| Admin auth | Same OTP flow, role checked via DB; admin endpoints behind RBAC guard |
| Payments | Never store card/UPI creds; hosted gateway SDK; verify webhook signatures |
| Inputs | class-validator DTOs on every endpoint; sanitize strings |
| Uploads | Signed URLs with content-type restriction; max 10MB images, 50MB video |
| Secrets | Environment variables only; .env in .gitignore |
| HTTPS | TLS enforced; platform handles certs |
| Rate limiting | OTP: 3/phone/10min, 10/IP/hour, 5 verify attempts per OTP; API: 100 req/min/user; Public: 30 req/min/IP (design target; the enforced limits are listed below) |
| Audit | All admin mutations logged in audit_events table |

> **Implementation status (2026-11-22):** The rows above are the design target. Gaps in the code today:
> - **OTP provider:** `AuthModule` builds the provider from `OTP_PROVIDER`; only `MockOtpProvider` exists (fixed OTP `123456`, logged to the console), so anyone can log in as any phone number, including the seeded admin. The API refuses to start with `NODE_ENV=production` while the provider is `mock` or unset, so the mock cannot reach customers by accident. A real SMS provider must still be built before any real use.
> - **OTP store:** hashed OTPs and attempt counts live in an in-memory map, so they reset on restart and do not work across multiple instances.
> - **Rate limiting:** enforced since 2026-11-22 by a global `AppThrottlerGuard`. OTP request: 3/phone and 10/IP per 10 minutes; OTP verify: 5/phone and 20/IP per 10 minutes; all other endpoints: 100 req/min per logged-in user (per IP when logged out). Blocked calls get 429 `RATE_LIMITED`. Behind a proxy the API needs `TRUST_PROXY`. Counters are in memory (per instance, reset on restart). Details are in LLD section 5.3.
> - **Refresh tokens:** the API issues and verifies them (`POST /auth/refresh`), and the admin, web and mobile clients all use it (on a 401 the client refreshes once and repeats the request; a rejected refresh token ends the session and shows the login screen), so sessions last up to 7 days. Refresh tokens cannot be revoked.
> - **Startup checks:** the API now refuses to start unless `DATABASE_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET` are set (`src/config/env.validation.ts`), naming the missing variables. `CORS_ORIGINS`, when set, replaces the built-in local origin list entirely.

---

## 10. Monorepo Structure

```
juhar-app/
├── apps/
│   ├── mobile/              # React Native + Expo SDK 58 (own node_modules; not an npm workspace)
│   │   ├── App.tsx          # ThemeProvider > navigation, splash/welcome gating
│   │   └── src/
│   │       ├── components/  # AnimatedUI, RefreshButton
│   │       ├── screens/     # 13 screens
│   │       ├── navigation/  # Tab + stack navigators
│   │       ├── services/    # API client, local guest cart
│   │       └── theme/       # colors (light + dark), ThemeContext, typography, spacing
│   ├── web/                 # Next.js 14 customer website (port 3001)
│   │   └── src/
│   │       ├── app/         # 11 routes + globals.css (CSS-variable theme tokens)
│   │       ├── components/  # Header, BottomNav
│   │       ├── lib/         # api.ts, cart-context.tsx, theme-context.tsx
│   │       └── fonts/
│   ├── api/                 # NestJS (port 3000)
│   │   ├── src/
│   │   │   ├── modules/     # auth, users, addresses, categories, products,
│   │   │   │                # inventory, cart, checkout, orders
│   │   │   │                # (media, payments, admin: planned)
│   │   │   ├── common/      # decorators, DTOs, filters, interceptors
│   │   │   ├── config/      # env.validation.ts (required-variable check at startup)
│   │   │   └── prisma/
│   │   └── prisma/          # schema + migrations + seed
│   └── admin/               # Next.js admin panel (port 3002)
│       └── src/
│           ├── app/
│           ├── components/
│           └── services/
├── packages/
│   └── shared/              # Types, enums, constants, utils
│       ├── src/             # TypeScript sources only
│       └── dist/            # build output (git-ignored); created by the root postinstall
├── .github/workflows/ci.yml # API, web, admin and mobile jobs
├── docs/
│   ├── architecture/        # HLD, LLD, database design, deployment plan
│   ├── api/                 # openapi.yaml
│   └── design/              # UI specification
├── docker-compose.yml       # Local PostgreSQL
├── package.json             # Workspace root (workspaces: packages/*, apps/api, apps/admin, apps/web)
└── tsconfig.base.json
```

> **Implementation status (2026-11-22):** The root `postinstall` script builds `packages/shared` into `dist/`. API unit tests live next to the code as `*.spec.ts` files (Jest + ts-jest, config in `apps/api/jest.config.js`); they are excluded from the production build via `tsconfig.build.json`. The order state machine, stock reservation and checkout have tests so far, and there is no `test/` end-to-end directory.

---

## 11. Open Decisions (Must Resolve Before Build)

> Decisions 11 to 13 were added on 2026-11-22 from implementation findings. The owner column is still to be assigned.

| # | Decision | Default Proposal | Owner |
|---|---|---|---|
| 1 | Payment gateway | Razorpay (wider UPI support) | Finance |
| 2 | OTP provider | MSG91 (cost-effective for India) | Tech |
| 3 | Hosting platform | Railway (simple, managed Postgres included) | Tech |
| 4 | Shipping areas | Sambalpur + 5 nearby districts | Ops |
| 5 | COD surcharge | None for pilot | Business |
| 6 | Return window | 7 days, unworn, tags attached | Business |
| 7 | Tax treatment | Inclusive GST shown in product price | Finance |
| 8 | Initial SKU count | ~20–30 designs from factory audit | Merchandising |
| 9 | WhatsApp provider | Gupshup / Wati | Tech |
| 10 | Stock ownership | Reserved allocation to Juhar (not shared) | Ops |
| 11 | Unconfirmed COD orders: what should happen to a COD order nobody confirms? | **Decided 2026-11-22:** keep the stock held until an admin acts (confirm, ship or cancel); the expiry worker no longer releases COD holds. Follow-up: flag stale unconfirmed orders to the admin. | Ops |
| 12 | Should admins be able to cancel an order after it is packed? The state machine allows cancellation only from `placed` and `confirmed`. | Keep as is; handle post-pack problems as returns | TBD |
| 13 | Real customer support / WhatsApp number. WhatsApp integration is pending, and the web order page links to a placeholder number. | Use one business number once the integration exists; hide the link until then | TBD |
