# Juhar — Low-Level Design (Pilot P0)

**Version:** 1.0  
**Date:** 13 November 2026  
**Status:** Draft for review  
**Code sync:** Blockquotes marked *Implementation status (2026-11-22)* record where the code differs from or lags this design. The design text itself is unchanged.  

---

## 1. Backend Module Architecture

> **Implementation status (2026-11-22):** The tree below is the design. In `apps/api/src` today:
> - `config/` holds only `env.validation.ts` (see 5.5).
> - Guards live in `modules/auth/guards/` (`jwt-auth`, `admin-auth`, `roles`), not `common/guards/`.
> - `common/` has `decorators/`, `dto/pagination.dto.ts`, `filters/` and `interceptors/`. There is no `pipes/` (`ValidationPipe` is registered globally in `main.ts`) and no `utils/` (money, slug and order-number helpers are in `packages/shared`).
> - Implemented modules: auth, users, addresses, categories, products, inventory, cart, checkout, orders. `media`, `payments` and `admin` do not exist (`PaymentsModule` and `AdminModule` are commented out in `app.module.ts`). There is also a `health.controller.ts`.

```
src/
├── main.ts                          # Bootstrap NestJS app
├── app.module.ts                    # Root module
├── config/
│   ├── config.module.ts             # Environment config
│   ├── config.service.ts            # Typed config access
│   └── config.validation.ts         # Joi/Zod env schema
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        # Customer auth
│   │   ├── admin-auth.guard.ts      # Admin auth
│   │   └── roles.guard.ts           # RBAC check
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── idempotency-key.decorator.ts
│   ├── logging/                     # Request ID, access log, logger (see 5.1)
│   │   ├── request-id.middleware.ts
│   │   ├── access-log.middleware.ts
│   │   ├── app-logger.ts
│   │   ├── request-context.ts
│   │   └── redact.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts # Response envelope
│   ├── filters/
│   │   └── http-exception.filter.ts # Standard error format
│   ├── pipes/
│   │   └── validation.pipe.ts       # DTO validation
│   ├── dto/
│   │   ├── pagination.dto.ts        # Cursor pagination
│   │   └── api-response.dto.ts      # {success, data, error, requestId}
│   └── utils/
│       ├── paise.util.ts            # Money helpers
│       ├── slug.util.ts             # Slug generation
│       └── order-number.util.ts     # JUH-YYYYMMDD-XXXX generator
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts            # Extends PrismaClient, onModuleInit
└── modules/
    ├── auth/
    ├── users/
    ├── addresses/
    ├── categories/
    ├── products/
    ├── media/
    ├── inventory/
    ├── cart/
    ├── checkout/
    ├── orders/
    ├── payments/
    └── admin/
```

---

## 2. Module Designs

### 2.1 Auth Module

**Purpose:** OTP-based phone authentication for customers and admins.

> **Implementation status (2026-11-22):**
> - `AuthModule` builds the OTP provider from the `OTP_PROVIDER` setting (`providers/otp-provider.factory.ts`; unset means `mock`). Only `mock` exists today (fixed OTP `123456`, logged to the console); an unknown value stops the API at startup. `validateEnv` also **refuses to start when `NODE_ENV=production` and the provider is `mock` or unset**, with a message explaining why. A real SMS provider is added by creating a class that implements `OtpProvider`, adding it to the factory and to `SUPPORTED_OTP_PROVIDERS` in `config/otp-provider.ts`.
> - OTPs are hashed (SHA-256) and kept in an in-memory `Map` inside `AuthService`, not Redis, so they are lost on restart and not shared between instances. The 5-attempt limit and a 30-second resend cooldown are enforced there. The per-phone and per-IP limits are not (see 5.3).
> - `verifyOtp` issues an access token (15 min) and a refresh token (7 days), and `POST /auth/refresh` works. The refresh token is returned in the JSON body, not an httpOnly cookie. All three API clients use it the same way (admin: `apps/admin/src/services/api.ts`; web: `apps/web/src/lib/api.ts`; mobile: `apps/mobile/src/services/api.ts`). On a 401 the client calls `/auth/refresh` once (calls that fail together share one refresh), saves the new access token and repeats the failed request once (a repeated order keeps its idempotency key). Only a rejected refresh token (401, for example after 7 days) clears the login: the admin returns to `/login`, the web and mobile apps show the login form. A network error or a 5xx during refresh keeps the tokens. Sign-in calls (`/auth/otp/request`, `/auth/otp/verify`) never trigger a refresh, and neither does a client with no stored refresh token. The refresh token is stored in `localStorage` (admin `juhar_admin_refresh`, web `juhar_refresh_token`) or `AsyncStorage` (mobile `juhar_refresh`). Refresh tokens are stateless (no rotation, no revocation).
> - `GET /auth/me` (JWT required) also exists. The token payload `type` is `admin` (plus `role`) when the phone exists in `admin_users`.
> - There is no `throttle-otp.guard.ts`. Guards are `JwtAuthGuard`, `AdminAuthGuard` and `RolesGuard` in `modules/auth/guards/`.

```
modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── request-otp.dto.ts
│   └── verify-otp.dto.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   └── throttle-otp.guard.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

**DTOs:**

```typescript
// request-otp.dto.ts
class RequestOtpDto {
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/)
  phone: string;             // E.164 Indian mobile
}

// verify-otp.dto.ts
class VerifyOtpDto {
  @IsString()
  @Matches(/^\+91[6-9]\d{9}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
```

**Service Methods:**

| Method | Input | Output | Business Rules |
|---|---|---|---|
| `requestOtp(dto)` | phone | `{ message, expiresIn }` | Rate limit: 3/phone/10min, 10/IP/hour. Generate 6-digit OTP, store hashed with 5min expiry. Send via SMS provider. |
| `verifyOtp(dto)` | phone, otp | `{ accessToken, refreshToken, isNewUser }` | Compare hashed OTP. If valid: upsert user (create if new), set `verified_at`, issue JWT pair. Mark OTP as used. |
| `refreshToken(token)` | refreshToken | `{ accessToken }` | Validate refresh token, issue new access token. |

**JWT Payload:**

```typescript
interface JwtPayload {
  sub: string;        // user UUID
  phone: string;
  type: 'customer' | 'admin';
  iat: number;
  exp: number;
}
```

**Token Lifecycle:**
- Access token: 15 minutes
- Refresh token: 7 days, stored as httpOnly cookie
- On verify: return both tokens
- On refresh: return new access token only

**Error Cases:**

| Error | HTTP | Code | When |
|---|---|---|---|
| OTP_RATE_LIMITED | 429 | AUTH_001 | Too many OTP requests |
| OTP_EXPIRED | 400 | AUTH_002 | OTP older than 5 minutes |
| OTP_INVALID | 401 | AUTH_003 | Wrong OTP code |
| OTP_MAX_ATTEMPTS | 401 | AUTH_004 | 5 wrong attempts → invalidate OTP |
| REFRESH_TOKEN_INVALID | 401 | AUTH_005 | Expired or tampered refresh token |

---

### 2.2 Users Module

**Purpose:** Customer profile management.

```
modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    └── update-profile.dto.ts
```

**DTOs:**

```typescript
class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

**Service Methods:**

| Method | Input | Output | Rules |
|---|---|---|---|
| `findById(id)` | UUID | User | Return profile |
| `findByPhone(phone)` | phone | User or null | Lookup for auth |
| `update(id, dto)` | UUID, UpdateProfileDto | User | Only own profile; email uniqueness check |

---

### 2.3 Addresses Module

**Purpose:** Delivery address CRUD with default management.

```
modules/addresses/
├── addresses.module.ts
├── addresses.controller.ts
├── addresses.service.ts
└── dto/
    ├── create-address.dto.ts
    └── update-address.dto.ts
```

**DTOs:**

```typescript
class CreateAddressDto {
  @IsString() @MaxLength(100)
  recipientName: string;

  @Matches(/^\+91[6-9]\d{9}$/)
  recipientPhone: string;

  @IsString() @MaxLength(255)
  line1: string;

  @IsOptional() @IsString()
  line2?: string;

  @IsOptional() @IsString()
  landmark?: string;

  @IsString() @MaxLength(100)
  city: string;

  @IsString() @MaxLength(100)
  district: string;

  @IsString() @MaxLength(100) @IsOptional()
  state?: string;               // Defaults to "Odisha"

  @Matches(/^[1-9][0-9]{5}$/)
  pinCode: string;

  @IsOptional() @IsString()
  label?: string;               // "Home", "Office"

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}
```

**Service Methods:**

| Method | Input | Output | Rules |
|---|---|---|---|
| `create(userId, dto)` | UUID, CreateAddressDto | Address | Max 10 addresses per user. If `isDefault=true` or first address, unset other defaults in same transaction. |
| `findAll(userId)` | UUID | Address[] | Only own addresses, ordered default-first |
| `update(userId, id, dto)` | UUID, UUID, UpdateDto | Address | Ownership check. If setting default, unset others. `isDefault: false` on the current default is ignored (a customer with addresses always has exactly one default). |
| `delete(userId, id)` | UUID, UUID | `{ message }` | Ownership check; runs in one transaction. Always allowed: an order keeps its own copy of the address (`order.addressSnapshot`), so no order depends on the row. If the default is deleted, the most recently added remaining address becomes the default. A second delete of the same address gets 404. |

**Error Cases:**

| Error | HTTP | Code |
|---|---|---|
| ADDRESS_NOT_FOUND | 404 | ADDR_001 |
| ADDRESS_LIMIT_REACHED | 400 | ADDR_002 |
| ADDRESS_NOT_OWNED | 403 | ADDR_003 |

---

### 2.4 Categories Module

**Purpose:** Product category listing (admin-managed).

```
modules/categories/
├── categories.module.ts
├── categories.controller.ts
├── categories.service.ts
└── dto/
    ├── create-category.dto.ts
    └── update-category.dto.ts
```

**DTOs:**

```typescript
class CreateCategoryDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsOptional() @IsString()
  slug?: string;               // Auto-generated from name if omitted

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}
```

**Endpoints:**

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/v1/categories | Public | Active categories, sorted by `sort_order` |
| POST | /api/v1/admin/categories | Admin (catalog_editor+) | Create category |
| PATCH | /api/v1/admin/categories/:id | Admin | Update category |

---

### 2.5 Products Module

**Purpose:** Product catalog — admin CRUD + public search/filter/sort.

```
modules/products/
├── products.module.ts
├── products.controller.ts        # Public endpoints
├── products-admin.controller.ts  # Admin endpoints
├── products.service.ts
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    ├── create-variant.dto.ts
    ├── update-variant.dto.ts
    ├── product-query.dto.ts
    └── product-response.dto.ts
```

**Product Query DTO (public catalog):**

```typescript
class ProductQueryDto {
  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsString()
  search?: string;              // ILIKE on title, description, tags

  @IsOptional() @IsString()
  fabric?: string;              // Exact filter

  @IsOptional() @IsString()
  weaveMethod?: string;

  @IsOptional() @IsString()
  color?: string;               // Filter via variants

  @IsOptional() @IsInt() @Min(0)
  minPrice?: number;            // In paise

  @IsOptional() @IsInt()
  maxPrice?: number;

  @IsOptional() @IsEnum(ProductSortBy)
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'relevance';

  @IsOptional() @IsString()
  cursor?: string;              // Cursor pagination

  @IsOptional() @IsInt() @Min(1) @Max(50)
  limit?: number;               // Default 20
}
```

**Create Product DTO (admin):**

```typescript
class CreateProductDto {
  @IsString() @MaxLength(255)
  title: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  shortDescription?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional() @IsEnum(PublishStatus)
  publishStatus?: 'draft' | 'published';  // Default: draft

  @IsOptional() @IsString()
  fabric?: string;

  @IsOptional() @IsString()
  weaveMethod?: string;

  @IsOptional() @IsString()
  origin?: string;

  @IsOptional() @IsString()
  careInstructions?: string;

  @IsOptional() @IsString()
  blousePiece?: string;

  @IsOptional() @IsString()
  length?: string;

  @IsOptional() @IsString()
  width?: string;

  @IsOptional() @IsString()
  weight?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  occasion?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @ArrayMinSize(1)
  variants: CreateVariantDto[];
}

class CreateVariantDto {
  @IsString() @MaxLength(50)
  sku: string;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsObject()
  attributes?: Record<string, any>;

  @IsInt() @Min(1)
  pricePaise: number;

  @IsOptional() @IsInt() @Min(1)
  compareAtPaise?: number;

  @IsInt() @Min(0)
  initialStock: number;         // Creates inventory row
}
```

**Service Methods:**

| Method | Input | Output | Rules |
|---|---|---|---|
| `findAll(query)` | ProductQueryDto | `{ items, cursor, hasMore, total }` (`total` = every product that matches the filters, over all pages; the apps show it as "58 sarees") | Only `published` + `active` variants. Cursor pagination by `created_at` + `id` (the id breaks ties, so products created in the same instant keep one fixed order and paging never skips or repeats one). Join inventory for availability. **Sorting:** `newest` (default) orders by `created_at` descending. `price_asc` / `price_desc` order the whole filtered catalog in SQL by the cheapest active variant (`MIN(price_paise)`, the card price), ties by `id`; the page is cut from that order and the cursor is the last product's `id` on the page (an unknown cursor gives an empty page). The ids of all matching products are read on each price-sorted request, which is fine up to a few thousand products. `relevance` is not implemented and behaves like `newest`. |
| `findBySlug(slug)` | slug | ProductDetail | Include variants (active only), media (sorted), inventory availability. 404 if not published. |
| `create(dto, adminId)` | CreateProductDto, UUID | Product | Auto-generate slug from title. Create variants + inventory rows in transaction. Audit log. |
| `update(id, dto, adminId)` | UUID, UpdateDto, UUID | Product | Validate category exists. Update slug if title changes (check uniqueness). Audit log with before/after. |
| `archive(id, adminId)` | UUID, UUID | void | Set `publish_status = 'archived'`. Don't delete — order history references. |

**Product Response (public):**

```typescript
class ProductCardResponse {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  categorySlug: string;
  primaryImage: { url: string; alt: string };
  startingPricePaise: number;       // Lowest active variant price
  compareAtPaise: number | null;
  isAvailable: boolean;             // Any variant has available > 0
  fabric: string;
  weaveMethod: string;
}

class ProductDetailResponse {
  // All ProductCard fields plus:
  description: string;
  origin: string;
  careInstructions: string;
  blousePiece: string;
  length: string;
  width: string;
  weight: string;
  occasion: string[];
  media: MediaItem[];               // Sorted images + video
  variants: VariantResponse[];      // Each with price, color, availability
}

class VariantResponse {
  id: string;
  sku: string;
  name: string;
  color: string;
  attributes: Record<string, any>;
  pricePaise: number;
  compareAtPaise: number | null;
  available: number;                // on_hand - reserved - unavailable
  isAvailable: boolean;
}
```

**Error Cases:**

| Error | HTTP | Code |
|---|---|---|
| PRODUCT_NOT_FOUND | 404 | PROD_001 |
| SLUG_ALREADY_EXISTS | 409 | PROD_002 |
| SKU_ALREADY_EXISTS | 409 | PROD_003 |
| CATEGORY_NOT_FOUND | 400 | PROD_004 |
| COMPARE_PRICE_INVALID | 400 | PROD_005 (on create, add variant and update variant; update checks the values the variant will have after the change, for example raising the price above the stored compare-at price is refused) |

---

### 2.6 Media Module

**Purpose:** Product image/video upload via signed S3 URLs.

> **Implementation status (2026-11-22):** Not implemented (planned Phase 5). There is no `modules/media`. The `product_media` table exists and `ProductsService` reads from it, but there is no upload flow and no media is seeded, so clients render placeholder boxes instead of product images.

```
modules/media/
├── media.module.ts
├── media.controller.ts
├── media.service.ts
├── s3.service.ts
└── dto/
    ├── request-upload.dto.ts
    └── confirm-upload.dto.ts
```

**Upload Flow:**

```
Admin                    API                           S3
──────                   ───                           ──
1. POST /admin/media/upload-url
   { productId, type, mimeType }
                         Validate mime (image/jpeg,
                         image/png, image/webp, video/mp4)
                         Generate object key
                         Create signed PUT URL (5min expiry)
                    <──  { uploadUrl, objectKey }

2. PUT {uploadUrl}  ─────────────────────────────────> Upload file
                                                       (max 10MB image, 50MB video)

3. POST /admin/media/confirm
   { productId, objectKey, altText }
                         Verify object exists in S3
                         Generate thumbnail (Sharp: 300px, 600px)
                         Upload thumbnails to S3
                         Insert product_media row
                    <──  { media }
```

**Service Methods:**

| Method | Rules |
|---|---|
| `requestUploadUrl(dto)` | Validate product exists + admin owns. Generate S3 signed PUT URL. Content-type restricted. Max 10MB for images. |
| `confirmUpload(dto)` | Verify S3 object exists. Generate thumbnails via Sharp. Store media record. |
| `reorder(productId, mediaIds[])` | Update `sort_order` for all media of a product. |
| `delete(mediaId, adminId)` | Delete S3 objects (original + thumbnails). Remove DB row. Audit log. |

---

### 2.7 Inventory Module

**Purpose:** Stock tracking with atomic reservations.

> **Implementation status (2026-11-22):** `getStock`, `getStockBulk`, `adjustStock` (audited), `reserve` (row lock via `SELECT … FOR UPDATE`), `releaseReservation`, `commitOrderReservations`, `settleShipment` and the every-minute expiry cron exist in `inventory.service.ts` and `reservation-expiry.cron.ts`. There is no separate `reservation.service.ts`. Stock lifecycle as built:
> - **Place order:** units are reserved (`reserved += qty`), reservation `held`.
> - **Confirm** (`OrdersService.updateStatus`): `commitOrderReservations` turns the order's `held` reservations into `committed`. Numbers do not change.
> - **Ship:** `settleShipment` runs inside the status transaction, before the shipment row is created. Per order line it locks the stock row, then `on_hand -= qty` and `reserved -= quantity still held` (0 if the hold had already expired or been released), and marks the holds `fulfilled`. If `on_hand` is lower than the line quantity it throws `409 STOCK_MISMATCH` and the whole status change rolls back (the order stays `packed`), so the admin must correct the stock count first. Since migration `20261122150000_check_constraints` the database also refuses any write that leaves `reserved + unavailable` above `on_hand`, so a wrong shelf count can no longer be saved in the first place and `STOCK_MISMATCH` is a second line of defence. `settleShipment` changes `on_hand` and `reserved` in a single `UPDATE`, which the constraint requires.
> - **Cancel** (placed or confirmed only): `releaseReservation` gives back every `held`/`committed` hold (`reserved -= qty`), status `released`.
> - **Expiry job:** expires `held` reservations past `expires_at` **except those of cash-on-delivery orders**, which stay until an admin confirms, ships or cancels the order (decision, 2026-11-22). Reservations with no order and non-COD holds (the future UPI flow) still expire. Expiring a UPI hold does not yet cancel its order; Phase 4 payments should do that.
> - **Known limits:** an unconfirmed COD order holds its stock indefinitely (the admin panel flags those still `placed` after 24 hours as overdue, see the admin endpoints note below; nothing cancels them); `commitReservation(reservationId, orderId)` (single hold) exists but the order flow uses `commitOrderReservations`.
> - Admin routes in code: `GET /admin/inventory/:variantId` and `POST /admin/inventory/adjust` (the adjust route is restricted to `owner` and `catalog_editor`).

```
modules/inventory/
├── inventory.module.ts
├── inventory.controller.ts       # Admin only
├── inventory.service.ts
├── reservation.service.ts
├── reservation-expiry.cron.ts    # Scheduled worker
└── dto/
    ├── adjust-stock.dto.ts
    └── stock-response.dto.ts
```

**Adjust Stock DTO (admin):**

```typescript
class AdjustStockDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  adjustment: number;           // Positive = add, negative = remove

  @IsEnum(AdjustmentReason)
  reason: 'received' | 'damaged' | 'correction' | 'return_restocked' | 'other';

  @IsOptional() @IsString()
  notes?: string;
}
```

**Service Methods:**

| Method | Input | Output | Rules |
|---|---|---|---|
| `getStock(variantId)` | UUID | StockResponse | Return on_hand, reserved, unavailable, available (computed) |
| `getStockBulk(variantIds)` | UUID[] | StockResponse[] | Batch lookup for cart/catalog |
| `adjustStock(dto, adminId)` | AdjustStockDto, UUID | StockResponse | Validate: `on_hand + adjustment >= reserved + unavailable`. Update with optimistic lock (`version`). Audit log with before/after. |
| `reserve(variantId, qty, expiresAt)` | UUID, int, Date | Reservation | **Inside existing transaction.** `SELECT ... FOR UPDATE`. Check available >= qty. Increment reserved. Create reservation row. |
| `commitReservation(reservationId)` | UUID | void | Set status = 'committed'. (Stock stays reserved until fulfillment.) |
| `releaseReservation(reservationId)` | UUID | void | Decrement reserved. Set status = 'released'. |

**Reservation Expiry Cron:**

```typescript
@Cron(CronExpression.EVERY_MINUTE)
async handleExpiredReservations() {
  // Find all reservations WHERE status = 'held' AND expires_at < NOW()
  // For each: release reservation (decrement reserved, set status = 'expired')
  // Run in individual transactions (one failure doesn't block others)
  // Log count of expired reservations
}
```

**Concurrency Control:**

```typescript
// Inside a Prisma interactive transaction:
async reserve(tx: PrismaTx, variantId: string, qty: number, expiresAt: Date) {
  // 1. Lock row
  const inv = await tx.$queryRaw`
    SELECT * FROM inventory WHERE variant_id = ${variantId} FOR UPDATE
  `;

  // 2. Check availability
  const available = inv.on_hand - inv.reserved - inv.unavailable;
  if (available < qty) {
    throw new ConflictException('INSUFFICIENT_STOCK');
  }

  // 3. Reserve
  await tx.inventory.update({
    where: { variantId },
    data: {
      reserved: { increment: qty },
      version: { increment: 1 },
    },
  });

  // 4. Create reservation record
  return tx.inventoryReservation.create({
    data: { variantId, qty, expiresAt, status: 'held' },
  });
}
```

**Error Cases:**

| Error | HTTP | Code |
|---|---|---|
| INSUFFICIENT_STOCK | 409 | INV_001 |
| STOCK_WOULD_GO_NEGATIVE | 400 | INV_002 |
| VARIANT_NOT_FOUND | 404 | INV_003 |
| RESERVATION_NOT_FOUND | 404 | INV_004 |
| RESERVATION_ALREADY_PROCESSED | 409 | INV_005 |

---

### 2.8 Cart Module

**Purpose:** Server-side cart with live pricing. Supplemented by client-side guest cart for unauthenticated users.

**Client-side guest cart:**
- Mobile: `apps/mobile/src/services/localCart.ts` — AsyncStorage-based, provides `addToLocalCart()`, `updateLocalCartItem()`, `removeLocalCartItem()`, `syncLocalCartToServer()`, `localCartToResponse()`
- Web: `apps/web/src/lib/cart-context.tsx` — React context with `CartProvider`, exposes `useCartCount()` for badge display. The badge does not poll: it refreshes when something calls `notifyCartChanged()` (`lib/cart-events.ts`: the cart API calls in `lib/api.ts`, `placeOrder`, login, logout and the guest-cart helpers `saveLocalCart` / `clearLocalCart`), on the `storage` event (other tabs), on window focus or when the tab becomes visible, and every 5 minutes while visible (`lib/cart-refresh.ts`). Bursts of changes are merged into one refresh (250 ms) and an older response never overwrites a newer one. Mobile does the same with `services/cartEvents.ts` and `services/cartRefresh.ts`, wired in `TabNavigator` (cart API calls, `placeOrder`, `saveTokens`/`clearTokens` and the `localCart.ts` writes announce changes; foreground = `AppState` active). **Anything new that changes the cart must call `notifyCartChanged()`**, otherwise the badge stays stale until the next focus or 5-minute refresh
- Guest items stored as `LocalCartItem[]` with variant snapshot (title, price, color, sku)
- On login, `syncLocalCartToServer()` iterates local items and calls `POST /api/v1/cart/items` for each, then clears local storage

```
modules/cart/
├── cart.module.ts
├── cart.controller.ts
├── cart.service.ts
└── dto/
    ├── add-to-cart.dto.ts
    ├── update-cart-item.dto.ts
    └── cart-response.dto.ts
```

**DTOs:**

```typescript
class AddToCartDto {
  @IsUUID()
  variantId: string;

  @IsInt() @Min(1) @Max(10)
  quantity: number;
}

class UpdateCartItemDto {
  @IsInt() @Min(0) @Max(10)     // 0 = remove
  quantity: number;
}
```

**Cart Response (always server-calculated):**

```typescript
class CartResponse {
  items: CartItemResponse[];
  subtotalPaise: number;
  itemCount: number;              // total quantity (3 sarees = 3), same as a guest cart
}

class CartItemResponse {
  id: string;                     // cart_item ID
  variant: {
    id: string;
    sku: string;
    name: string;
    color: string;
    pricePaise: number;
    available: number;
    productId: string;              // the saree this colour belongs to (wishlist hearts are per saree)
    productTitle: string;
    productSlug: string;
    imageUrl: string;
  };
  quantity: number;
  lineTotalPaise: number;         // qty × pricePaise
  isAvailable: boolean;           // available >= quantity
  availabilityWarning?: string;   // "Only 2 left" or "Out of stock"
}
```

**Service Methods:**

| Method | Rules |
|---|---|
| `getCart(userId)` | Join cart_items → product_variants → inventory → product_media. Recalculate all prices from current variant price. Flag unavailable items. |
| `addItem(userId, dto)` | Check variant exists + active + published product. If already in cart, increment qty. Max 10 per variant. |
| `updateItem(userId, itemId, dto)` | Ownership check. Qty=0 removes item. Validate variant still active. |
| `removeItem(userId, itemId)` | Ownership check. Delete cart_item row. |
| `clearCart(userId)` | Delete all cart_items for user. Called after successful order placement. |

**Important:** Cart stores NO prices. Every read joins with current `product_variants.price_paise`. Client-side totals are for display only — server recalculates at checkout.

**Error Cases:**

| Error | HTTP | Code |
|---|---|---|
| VARIANT_NOT_FOUND | 404 | CART_001 |
| VARIANT_UNAVAILABLE | 400 | CART_002 |
| QUANTITY_EXCEEDS_LIMIT | 400 | CART_003 |
| CART_ITEM_NOT_FOUND | 404 | CART_004 |

---

### 2.8b Wishlist Module (saved items)

**Purpose:** the heart. One row per (customer, colour): `wishlist_items` (see database-design 3.9b). All routes need a customer login; a customer only ever touches their own rows (the user id comes from the token).

| Route | What it does |
|---|---|
| `GET /wishlist` | `{ items, total }`, newest first. Each item has live `pricePaise`, `compareAtPaise`, `available` (on hand - reserved - unavailable), `isListed` (the product is published and the colour is active) and `isAvailable` (listed and in stock). The product's publish status itself is not sent. |
| `POST /wishlist/items/:variantId/toggle` | What both apps call. Deletes the row when it exists (allowed even if the product is no longer sold), otherwise creates it. |
| `POST /wishlist` | Creates the row; 409 `ALREADY_IN_WISHLIST` when it exists. |
| `DELETE /wishlist/:variantId` | Deletes it; 404 `WISHLIST_ITEM_NOT_FOUND` when it was not saved. |
| `GET /wishlist/:variantId/check` | `{ wishlisted }` |

- **What can be saved:** an active variant of a published product. Anything else (unknown, retired, draft, archived) is a 404 `VARIANT_NOT_FOUND`, so an unpublished product is not revealed.
- **Two taps at once:** the service no longer reads and then writes. Removing is one `deleteMany` (its count says whether a row was there) and saving is one `create` whose unique-key failure (`P2002`) is the answer "already saved": `toggle` still returns `wishlisted: true`, `add` returns 409. Before, the second request crashed with a 500 (5 of 8 simultaneous taps).
- **A saved product that stops being sold** stays in the list with `isListed: false` (the apps show "No longer available", no Add to Bag, no link to a page that no longer exists) and can still be removed.
- **Apps:** the heart on a shop card is for the whole saree (filled when any colour is saved; tapping a filled one removes the saved colours, tapping an empty one saves the card's `firstVariantId`); the heart on a product page is for the selected colour, and the page opens on the saved colour when there is one. A guest's hearts are kept in the browser or phone (`juhar_local_wishlist`) and moved into the account at login, like the guest bag; logging out clears the list from the screen (`AUTH_CHANGED_EVENT` on web, `onAuthChanged` on mobile). The mobile app reads the saved login before deciding between guest and account (it used to decide first and show an empty list). **Staying up to date without a reload:** a tap updates the screen at once and then reads the list again from the account, so the screen always matches it. Changes made elsewhere (the other app, another tab, another device) are picked up when the customer returns to the tab or the app (web: `focus` / `visibilitychange`; mobile: the app coming to the foreground and each screen coming into view), when another tab of the site changes something (web: a `BroadcastChannel` named `juhar-wishlist`, plus the `storage` event for the guest list), and every 30 seconds while the tab or app is open and visible (`apps/web/src/lib/wishlist-refresh.ts`, `apps/mobile/src/services/wishlistRefresh.ts`). A background refresh is skipped while a tap of the same tab is still waiting for the server.

### 2.9 Checkout Module

**Purpose:** Quote generation + atomic order placement.

> **Implementation status (2026-11-22):** `POST /checkout/quote` and `POST /orders` are implemented, including the single-transaction placement, idempotency-key replay and 30 min (UPI) / 24 h (COD) reservation expiry. Differences from the design below:
> - Shipping is a flat ₹99 (9900 paise), free when the subtotal is ≥ ₹5,000 (500000 paise). The rule lives in one place, `SHIPPING` in `packages/shared/src/constants`, with `calculateShippingPaise()` beside it; the API charges with it, and publishes it at `GET /api/v1/config/shipping` (`{ flatPaise, freeAbovePaise }`, public, no login) so the web and mobile screens never type the numbers in. Each app has one helper file (`apps/web/src/lib/shipping.ts`, `apps/mobile/src/services/shipping.ts`) with `useShippingRule()`; if the rule cannot be fetched the screens show "added at checkout" instead of guessing, and the API still charges the right amount. A test in each app fails if a screen contains `9900`, `500000`, `5,000` or `₹99`. To change the rule: edit the constants, run `npm run build -w packages/shared`, restart the API; nothing else changes. Tax is always 0 (GST is included in the price). There is no PIN-based shipping, serviceability check (`PIN_NOT_SERVICEABLE`) or COD-eligibility check; the quote always returns `codAvailable: true`.
> - The web and mobile review screens do not call the quote endpoint. Each works out the shipping line from the cart subtotal with the rule fetched from `GET /api/v1/config/shipping` (same function as the API, so the figure matches the order total).
> - Order numbers come from a PostgreSQL sequence: placement runs `SELECT nextval('order_number_seq')` and passes the value to `generateOrderNumber` in `packages/shared`, giving `JUH-YYYYMMDD-XXXX` (the number part counts across all days and does not restart daily). `nextval` is safe for orders placed at the same moment; a number consumed by an order that then fails is not reused, so numbers can skip. The sequence is created by migration `20261122120000_order_number_sequence`, which starts it after the highest number already in `orders`. Orders placed before the rename may carry the old `SAJ-` prefix. (The earlier `count() + 1` approach failed 17 of 20 simultaneous orders for different products with a unique-constraint error.)
> - Errors are still thrown as plain-code exceptions in the services (`CART_EMPTY`, `VARIANT_UNAVAILABLE: <sku>`, `ADDRESS_NOT_FOUND`, `INSUFFICIENT_STOCK` from the inventory reserve), but the reply no longer sends the bare code as the message. `HttpExceptionFilter` looks the code up in `apps/api/src/common/errors/error-catalog.ts` and sends `error.code: "INSUFFICIENT_STOCK"` with a sentence as `error.message` ("Sorry, one of the sarees in your bag is not in stock in the quantity you asked for. Please check your bag and try again."). The code is the identifier itself, not the `CHK_xxx` codes below. A SKU after the colon is not shown to the customer but stays in the log line. `STOCK_MISMATCH` (admin) passes its own sentence through. A test reads the API source and fails when a service throws a plain code that has no wording, so a new code cannot reach customers bare. Errors that are already sentences ("Order not found"), already coded (`PROD_001`) or validation lists are unchanged. The web and mobile clients also replace the browser's "Failed to fetch" / "Network request failed" with "We could not reach the server. Please check your internet connection and try again." (`code: NETWORK_ERROR`).
> - The API accepts `paymentMode: "upi"` (creating a `pending` order with a 30-minute reservation) but no payment flow exists; both clients send only `cod`.

```
modules/checkout/
├── checkout.module.ts
├── checkout.controller.ts
├── checkout.service.ts
└── dto/
    ├── checkout-quote.dto.ts
    ├── place-order.dto.ts
    ├── quote-response.dto.ts
    └── order-response.dto.ts
```

**Checkout Quote DTO:**

```typescript
class CheckoutQuoteDto {
  @IsUUID()
  addressId: string;

  @IsEnum(PaymentMode)
  paymentMode: 'upi' | 'cod';
}
```

**Place Order DTO:**

```typescript
class PlaceOrderDto {
  @IsUUID()
  addressId: string;

  @IsEnum(PaymentMode)
  paymentMode: 'upi' | 'cod';

  @IsString() @MaxLength(100)
  idempotencyKey: string;          // Client-generated UUID

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;                  // Delivery instructions
}
```

**Quote Response:**

```typescript
class QuoteResponse {
  items: QuoteItem[];
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentMode: string;
  codAvailable: boolean;
  estimatedDelivery: string | null;
  warnings: string[];              // "Item X has only 2 left", etc.
}
```

**Service Methods:**

| Method | Rules |
|---|---|
| `getQuote(userId, dto)` | Fetch cart + address. Validate all items available. Calculate shipping (flat rate for pilot). Calculate tax (if applicable). Check COD eligibility by PIN code. Return server-calculated totals. Do NOT reserve stock yet. |
| `placeOrder(userId, dto)` | **Single Prisma interactive transaction:** 1) Check idempotency key uniqueness (return existing order if duplicate). 2) Fetch cart items + current prices. 3) Validate all variants active + in stock. 4) Reserve inventory for each item (FOR UPDATE). 5) Create order + order_items with price snapshots. 6) Snapshot address as JSONB. 7) Clear cart. 8) COMMIT. If any step fails → ROLLBACK (releases all locks). |

**Order Placement Transaction (pseudocode):**

```typescript
async placeOrder(userId: string, dto: PlaceOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Idempotency check
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;  // Return same order

    // 2. Fetch cart with current prices
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: { variant: { include: { product: true, inventory: true } } },
    });
    if (cartItems.length === 0) throw new BadRequestException('CART_EMPTY');

    // 3. Validate + reserve each item
    const reservations = [];
    for (const item of cartItems) {
      if (!item.variant.active || item.variant.product.publishStatus !== 'published') {
        throw new BadRequestException(`VARIANT_UNAVAILABLE: ${item.variant.sku}`);
      }
      const reservation = await this.inventoryService.reserve(
        tx, item.variantId, item.quantity,
        dto.paymentMode === 'upi'
          ? addMinutes(new Date(), 30)    // 30 min for UPI
          : addMinutes(new Date(), 1440), // 24 hours for COD
      );
      reservations.push(reservation);
    }

    // 4. Calculate totals (server-side, never trust client)
    const subtotal = cartItems.reduce(
      (sum, i) => sum + i.variant.pricePaise * i.quantity, 0
    );
    const shipping = this.calculateShipping(address.pinCode);
    const tax = this.calculateTax(subtotal);
    const total = subtotal + shipping + tax;

    // 5. Create order
    const order = await tx.order.create({
      data: {
        publicNumber: generateOrderNumber(),
        userId,
        status: 'placed',
        paymentMode: dto.paymentMode,
        paymentStatus: dto.paymentMode === 'cod' ? 'cod_pending' : 'pending',
        subtotalPaise: subtotal,
        shippingPaise: shipping,
        taxPaise: tax,
        totalPaise: total,
        addressSnapshot: address,
        idempotencyKey: dto.idempotencyKey,
        notes: dto.notes,
      },
    });

    // 6. Create order items (snapshot prices)
    await tx.orderItem.createMany({
      data: cartItems.map((item) => ({
        orderId: order.id,
        variantId: item.variantId,
        productTitle: item.variant.product.title,
        variantName: item.variant.name,
        sku: item.variant.sku,
        qty: item.quantity,
        unitPricePaise: item.variant.pricePaise,
        taxPaise: 0,  // Per-item tax if needed
        totalPaise: item.variant.pricePaise * item.quantity,
        productImageUrl: primaryImageUrl,
      })),
    });

    // 7. Link reservations to order
    await tx.inventoryReservation.updateMany({
      where: { id: { in: reservations.map(r => r.id) } },
      data: { orderId: order.id },
    });

    // 8. Clear cart
    await tx.cartItem.deleteMany({ where: { userId } });

    return order;
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 10000,  // 10s max transaction
  });
}
```

**Error Cases:**

| Error | HTTP | Code | Recovery |
|---|---|---|---|
| CART_EMPTY | 400 | CHK_001 | — |
| VARIANT_UNAVAILABLE | 400 | CHK_002 | Remove from cart |
| INSUFFICIENT_STOCK | 409 | CHK_003 | Reduce quantity |
| ADDRESS_NOT_FOUND | 404 | CHK_004 | Select different address |
| PIN_NOT_SERVICEABLE | 400 | CHK_005 | Change address |
| COD_NOT_AVAILABLE | 400 | CHK_006 | Use UPI |
| DUPLICATE_ORDER | 200 | — | Return existing order |

---

### 2.10 Orders Module

**Purpose:** Order lifecycle management for customers and admins.

> **Implementation status (2026-11-22):**
> - The state machine is in `packages/shared` (`ORDER_TRANSITIONS`, `canTransitionOrder`), not `modules/orders/order-state-machine.ts`.
> - **Shop search and filters:** `GET /products` takes `search`, `fabric`, `weaveMethod`, `color`, `minPrice` and `maxPrice` together with `sortBy`, `categoryId` and paging. `GET /products/filters` (public) returns what those can be chosen from, read from the catalog (`fabrics`, `weaveMethods`, `colors`, `minPricePaise`, `maxPricePaise`; visible products only, capital letters ignored, alphabetical), so a filter list never offers a value that matches nothing. The price range matches a product when one of its active variants is in the range (colour and price together must be the same variant); the card shows the cheapest variant, so a card can show a price below the minimum. Web and mobile (`apps/web/src/lib/shop-list.ts`, `apps/mobile/src/services/shopList.ts`) send a search only from 2 letters, wait 300 ms after typing, send price limits in paise (typed in rupees), and never send a price range whose lowest is above its highest.
> - **Admin catalog list:** `GET /admin/products` takes `publishStatus` (`draft`, `published`, `archived`), `categoryId`, `search`, `cursor` and `limit` (1 to 50). Its query is the class `AdminProductQueryDto`, so the global validation pipe checks and converts it (it used to be an inline type, which skipped validation and made any `?limit=` fail with a 500). Products and orders are sorted newest first with the id as tie-break, so rows created in the same instant keep one fixed order and paging never skips or repeats a row (tested on real Postgres). The reply carries `counts` over the whole catalog: `products`, `published`, `draft`, `archived`, `variants`, `lowStock` (active variants with 1 to `lowStockThreshold` pieces available; none left is out of stock, not low) and `lowStockThreshold` (`INVENTORY.LOW_STOCK_THRESHOLD` = 3, also used by the cart's "Only N left" warning). The dashboard's Low Stock tile shows `counts.lowStock`; the Catalog page filters by `publishStatus` on the server and shows the real totals; the Catalog and Inventory pages load 20 products at a time with a Load more button.
> - **Customer endpoints:** `GET /orders` (newest first; `status`, `cursor`, `limit`; the reply also carries `total`, the orders matching the status filter over every page, and `counts`, the customer's orders in each status, so the apps show "55 orders" and the filter numbers without loading everything; the apps load 20 at a time with a Load more button), `GET /orders/:id` (items and shipments; payments are not included) and `POST /orders/:id/cancel`. Cancel works for `placed`/`confirmed` only, releases `held`/`committed` reservations and stores `cancellation_reason`, but writes **no audit event**. Customer-side cancellation is out of scope for now (in discovery): no app calls this endpoint. `POST /orders/:id/return` is not implemented.
> - **Admin order page:** `GET /admin/orders/:id` (`OrdersService.findOneAdmin`, any admin role; 404 when missing) returns the items (with colour and SKU), `address` (the frozen `addressSnapshot`), `customer`, totals, payments, shipments, `waitingMinutes`/`overdue` and `history`. History is built from the order's own timestamps (placed, confirmed, packed, shipped, delivered, cancelled), so old orders without audit rows still show their steps; the `order.status_changed` audit rows only add *who*. **The audit `actor_id` holds the acting person's `users.id` (the login id, the same `user=<id>` as the logs), not `admin_users.id`**, because the JWT's `sub` is the user row; the admin record (name, role) is found by matching the user's phone to `admin_users.phone`. A person who is no longer an admin is still named from their login.
- **Admin endpoints:** `GET /admin/orders` (filter by `status`; `search` matches order number or phone; `overdue=true` keeps only COD orders still `placed` for more than 24 hours; no date range or payment-mode filter). Each order carries `waitingMinutes` (minutes since it was placed, only while it is `placed`, otherwise `null`) and `overdue`, and the response has `counts: { placed, overdue, today: { date, orders, gmvPaise } }` over **all** orders (not just the page or filter) for the dashboard and the filter button. `today` is the India day (UTC+5:30, midnight to midnight, worked out by `indiaDayBounds` in `apps/api/src/common/time/india-day.ts`, so it does not depend on the server's or the browser's time zone): `orders` is the number of orders placed today and `gmvPaise` the sum of their totals, with cancelled orders left out of both (an order cancelled later drops out). The dashboard's Today's Orders and GMV Today cards show these (they used to be worked out from the first page of 20 orders). The 24 hours is `INVENTORY.COD_RESERVATION_MINUTES`; an order is overdue when it is older than that (exactly 24 hours is not). The admin Orders page shows an Overdue badge, the waiting time and an Overdue (n) filter, and the dashboard shows "n overdue" under Pending, linking to `/orders?filter=overdue`. Flag only: nothing is cancelled or released automatically. The dashboard's Pending number is now `counts.placed` (it used to count only the first page of 20 orders). The admin Orders page loads 20 rows at a time with a Load more button; after confirming, shipping or cancelling it re-reads as many rows as were showing, so the list does not jump back to 20. And `PATCH /admin/orders/:id/status` (roles `owner`, `fulfillment_operator`; transition validated; audit event written).
> - **Side effects implemented:** `confirmed_at`/`packed_at`/`shipped_at`/`delivered_at`/`cancelled_at` timestamps; a shipment row on ship (only when a `trackingId` is sent); shipments marked delivered; reservations released on cancel; holds committed on confirm; stock taken off `on_hand` on ship (`409 STOCK_MISMATCH` if the shelf count is too low). **Not implemented:** refunds, customer notifications, the 7-day return-window check, restock on return, refund creation.
> - **Admin cancellation:** `PATCH /admin/orders/:id/status` with `status: "cancelled"` is allowed for `placed`/`confirmed` orders and **requires a `reason`** (`UpdateOrderStatusDto`: trimmed, non-blank, max 255, enforced both by the request validation and in `OrdersService.updateStatus`). The reason is stored as `cancellation_reason` and in the audit entry's `after_state`. The admin Orders page shows a Cancel button for placed and confirmed orders; it opens a dialog that needs a reason, shows the API's refusal inside the dialog (for example if someone else already packed the order) and releases the stock on success. Packed orders cannot be cancelled (open decision 12 in the HLD).
> - **Return/refund statuses** can be set through the admin endpoint (the state machine allows them) but the admin panel has no UI for them. The web order screens display them; the mobile order detail does not yet (it only special-cases `cancelled`).

```
modules/orders/
├── orders.module.ts
├── orders.controller.ts          # Customer endpoints
├── orders-admin.controller.ts    # Admin endpoints
├── orders.service.ts
├── order-state-machine.ts        # State transition rules
└── dto/
    ├── order-query.dto.ts
    ├── update-order-status.dto.ts
    ├── cancel-order.dto.ts
    └── order-response.dto.ts
```

**State Machine:**

```typescript
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed:           ['confirmed', 'cancelled'],
  confirmed:        ['packed', 'cancelled'],
  packed:           ['shipped'],
  shipped:          ['delivered'],
  delivered:        ['return_requested'],
  cancelled:        [],
  return_requested: ['return_approved', 'return_rejected'],
  return_approved:  ['returned'],
  return_rejected:  [],
  returned:         ['refund_pending'],
  refund_pending:   ['refunded'],
  refunded:         [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
```

**Side Effects per Transition:**

| Transition | Side Effects |
|---|---|
| placed → confirmed | For COD: mark as manually verified. For UPI: auto on payment success. |
| placed → cancelled | Release inventory reservations. If payment exists, initiate refund. |
| confirmed → cancelled | Release inventory reservations. Initiate refund if paid. |
| confirmed → packed | Record packed_at timestamp. |
| packed → shipped | Record shipped_at. Create/update shipment record. Notify customer (WhatsApp). |
| shipped → delivered | Record delivered_at. Update shipment. For COD: payment_status stays 'cod_pending' until remittance. |
| delivered → return_requested | Validate within return window (7 days). |
| return_approved → returned | Restock inventory (on_hand += qty). |
| returned → refund_pending | Trigger refund creation. |
| refund_pending → refunded | Refund processed by gateway. Update payment_status. |

**Customer Endpoints:**

| Method | Path | Rules |
|---|---|---|
| GET | /orders | Own orders only, paginated by created_at desc |
| GET | /orders/:id | Own order only, include items + shipment + payments |
| POST | /orders/:id/cancel | Only if status in [placed, confirmed]. Record reason. |
| POST | /orders/:id/return | Only if delivered and within 7 days. Specify item + reason. |

**Admin Endpoints:**

| Method | Path | Rules |
|---|---|---|
| GET | /admin/orders | Search by public_number, phone, status, date range |
| PATCH | /admin/orders/:id/status | Validate transition. Execute side effects. Audit log. |

---

### 2.11 Payments Module

**Purpose:** Payment gateway integration, webhook processing, reconciliation, refunds.

> **Implementation status (2026-11-22):** Not implemented (planned Phase 4). There is no `modules/payments`: no gateway, `/payments/initiate`, webhook, reconciliation or refund endpoints. COD orders are created with `payment_status = cod_pending` and are the only payment path the clients use.

```
modules/payments/
├── payments.module.ts
├── payments.controller.ts
├── payments.service.ts
├── webhook.controller.ts
├── reconciliation.cron.ts          # Periodic payment status check
├── gateway/
│   ├── payment-gateway.interface.ts
│   ├── razorpay.gateway.ts
│   └── mock.gateway.ts             # Dev/test
└── dto/
    ├── initiate-payment.dto.ts
    └── payment-response.dto.ts
```

**Gateway Interface:**

```typescript
interface PaymentGateway {
  // Creates a gateway order/session — returns checkout URL or SDK options
  createOrder(amount: number, currency: string, orderId: string): Promise<GatewayOrder>;

  // Verifies webhook signature — MUST be gateway-specific (Razorpay HMAC-SHA256 ≠ Cashfree)
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  // Server-side verification — query gateway API for definitive payment status
  // NEVER trust client-side success callback alone
  getPaymentStatus(providerOrderId: string): Promise<GatewayPaymentStatus>;

  // Initiate refund via gateway
  initiateRefund(providerPaymentId: string, amount: number): Promise<RefundResult>;
}

// Gateway-specific implementations (NOT a shared generic verifier)
// razorpay.gateway.ts → uses crypto.createHmac('sha256', secret)
// cashfree.gateway.ts → uses different signature scheme
```

**Key Distinction — Public vs Secret Keys:**

```typescript
// SECRET keys — backend only (env vars, never exposed)
RAZORPAY_KEY_SECRET=<secret>        // For webhook verification + API calls
RAZORPAY_WEBHOOK_SECRET=<secret>    // For webhook signature verification

// PUBLIC/PUBLISHABLE key — safe for mobile SDK
RAZORPAY_KEY_ID=<publishable>       // Passed to mobile app for checkout SDK
```

The mobile app receives only the publishable key + gateway order ID to open the checkout UI. All verification happens server-side.

**Payment Attempt Model:**

Each payment attempt is a separate row. An order can have multiple attempts (customer retries). Only one can succeed.

```typescript
// WRONG: Reuse failed payment row
payment.status = 'failed' → payment.status = 'pending'  // DON'T DO THIS

// RIGHT: Create new attempt
Payment #1: { orderId, status: 'failed', ... }
Payment #2: { orderId, status: 'pending', ... }  // New row for retry
```

**Payment State Machine (per attempt):**

```
  pending ──→ initiated ──→ authorized ──→ captured (success)
    │              │              │
    │              │              └──→ capture_failed
    │              │
    │              └──→ failed
    │
    └──→ expired

Note: "authorized" ≠ "captured" for Razorpay.
      authorized = funds held on customer's account
      captured = funds transferred to merchant
      Only transition order to confirmed on CAPTURE, not authorize.
```

**Payment Flow (Revised):**

```
Customer                    API                         Gateway
────────                    ───                         ───────
POST /payments/:orderId/initiate
                            Validate order.status = 'placed'
                            Validate payment_mode = 'upi'
                            Validate no active payment attempt (pending/initiated)
                            Create new Payment row (status: 'pending')
                            Call gateway.createOrder(total, 'INR', orderId)
                            Update payment (status: 'initiated',
                              providerOrderId: gatewayOrderId)
                       <──  { gatewayOrderId, publishableKey, checkoutOptions }

[Customer completes payment on gateway checkout UI]

[Mobile client receives success callback]
                            ⚠️ DO NOT fulfill based on this callback alone
                            Wait for server-side webhook verification

                            POST /webhooks/payments
                            ├── Verify signature (gateway-specific HMAC)
                            ├── Check webhook_events for duplicate
                            │   UNIQUE (provider, provider_event_id)
                            ├── Store webhook event (status: 'received')
                            │
                            ├── In database transaction:
                            │   ├── Lock payment row (SELECT FOR UPDATE)
                            │   ├── Verify payment not already processed
                            │   ├── Verify amount matches order.total_paise
                            │   ├── Verify gateway order ID matches
                            │   │
                            │   ├── If payment.captured:
                            │   │   ├── Update payment status = 'captured'
                            │   │   ├── Update order payment_status = 'success'
                            │   │   ├── Transition order: placed → confirmed
                            │   │   ├── Commit inventory reservations
                            │   │   └── Mark webhook event 'processed'
                            │   │
                            │   ├── If payment.authorized (not yet captured):
                            │   │   ├── Update payment status = 'authorized'
                            │   │   ├── Auto-capture if enabled, OR
                            │   │   └── Wait for capture webhook
                            │   │
                            │   └── If payment.failed:
                            │       ├── Update payment status = 'failed'
                            │       ├── DO NOT release inventory yet
                            │       │   (customer may retry with new attempt)
                            │       └── Mark webhook event 'processed'
                            │
                            └── Return { status: 'ok' }
```

**Stock Release Rules (Revised):**

```
Payment failed?
  └── DON'T release stock immediately
  └── Stock is still reserved for the ORDER, not the payment attempt
  └── Customer may retry payment

When to release stock:
  1. Order explicitly cancelled (by customer or admin)
  2. Order expired (no successful payment within reservation window)
     → Handled by reservation-expiry.cron.ts (already built)
  3. All payment attempts exhausted AND order past expiry

Key principle: Inventory is reserved at ORDER level, not PAYMENT ATTEMPT level.
```

**Webhook Security (Revised):**

```typescript
@Post('webhooks/payments')
@HttpCode(200)  // Always return 200 to prevent gateway retries on our errors
async handleWebhook(
  @Req() req: RawBodyRequest,
  @Headers('x-razorpay-signature') signature: string,
) {
  // 1. Verify signature (gateway-specific, NOT generic)
  // NestJS must be configured with rawBody: true in bootstrap
  const isValid = this.gateway.verifyWebhookSignature(
    req.rawBody.toString(), signature
  );
  if (!isValid) {
    this.logger.warn('Invalid webhook signature received');
    throw new UnauthorizedException('INVALID_SIGNATURE');
  }

  // 2. Parse and deduplicate
  const event = JSON.parse(req.rawBody.toString());
  const eventId = event.event_id || event.id;

  const existing = await this.prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: 'razorpay',
        providerEventId: eventId,
      },
    },
  });
  if (existing) return { status: 'already_processed' };

  // 3. Store webhook event BEFORE processing (crash recovery)
  await this.prisma.webhookEvent.create({
    data: {
      provider: 'razorpay',
      providerEventId: eventId,
      eventType: event.event,
      payload: event,
      status: 'received',
    },
  });

  // 4. Process in transaction (atomic order + payment + inventory update)
  try {
    await this.prisma.$transaction(async (tx) => {
      await this.processPaymentEvent(tx, event);
    });

    // 5. Mark processed
    await this.prisma.webhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: 'razorpay',
          providerEventId: eventId,
        },
      },
      data: { status: 'processed', processedAt: new Date() },
    });
  } catch (error) {
    // Mark failed but still return 200 to prevent infinite retries
    await this.prisma.webhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: 'razorpay',
          providerEventId: eventId,
        },
      },
      data: { status: 'failed' },
    });
    this.logger.error(`Webhook processing failed: ${error.message}`);
  }

  return { status: 'ok' };
}
```

**Payment Reconciliation Cron (NEW):**

Webhooks are reliable but not guaranteed. A reconciliation job catches missed events.

```typescript
@Cron('*/10 * * * *')  // Every 10 minutes
async reconcilePayments() {
  // 1. Find orders with unresolved payments
  //    (status: 'initiated' or 'authorized', created > 10 min ago)
  const unresolvedPayments = await this.prisma.payment.findMany({
    where: {
      status: { in: ['initiated', 'authorized'] },
      createdAt: { lt: subMinutes(new Date(), 10) },
    },
    include: { order: true },
  });

  for (const payment of unresolvedPayments) {
    try {
      // 2. Query gateway API for definitive status
      const gatewayStatus = await this.gateway.getPaymentStatus(
        payment.providerOrderId,
      );

      // 3. If captured → process as if webhook arrived
      if (gatewayStatus.status === 'captured') {
        await this.prisma.$transaction(async (tx) => {
          // Verify not already processed (idempotent)
          const current = await tx.payment.findUnique({
            where: { id: payment.id },
          });
          if (current.status === 'captured') return; // Already done

          // Same logic as webhook handler
          await this.confirmPayment(tx, payment, gatewayStatus);
        });
        this.logger.log(`Reconciled payment ${payment.id} → captured`);
      }

      // 4. If failed/expired → mark failed
      if (['failed', 'expired'].includes(gatewayStatus.status)) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        this.logger.log(`Reconciled payment ${payment.id} → failed`);
      }

      // 5. If still pending on gateway → skip (will check next cycle)
    } catch (error) {
      this.logger.error(`Reconciliation failed for ${payment.id}: ${error.message}`);
    }
  }
}
```

**Scenarios the reconciliation cron handles:**

| Scenario | Without Reconciliation | With Reconciliation |
|---|---|---|
| Backend down when webhook arrives | Order stuck as "pending" forever | Resolved within 10 minutes |
| Customer closes app during payment | No webhook processed | Gateway queried, order updated |
| Webhook delivery fails (network) | Gateway retries, but may give up | Cron catches it independently |
| Race condition: webhook + client callback | Possible double processing | Idempotent — safe either way |

**Payment Initiation Idempotency:**

```typescript
class InitiatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsString() @MaxLength(100)
  idempotencyKey: string;     // Client-generated, prevents duplicate initiations
}

// Service checks:
// 1. No existing ACTIVE payment attempt (pending/initiated/authorized) for this order
// 2. No existing payment with same idempotencyKey
// If duplicate key found → return existing payment (don't create new)
```

**Additional Database Constraints:**

```sql
-- Prevent duplicate webhook events per provider
CREATE UNIQUE INDEX idx_webhook_events_provider_event
  ON webhook_events (provider, provider_event_id);

-- Prevent duplicate gateway payment records
CREATE UNIQUE INDEX idx_payments_provider_payment
  ON payments (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Prevent duplicate gateway order records
CREATE UNIQUE INDEX idx_payments_provider_order
  ON payments (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

-- Ensure only one successful payment per order
CREATE UNIQUE INDEX idx_payments_order_success
  ON payments (order_id)
  WHERE status = 'captured';
```

**Order Confirmation Safety Rule:**

```
⚠️ CRITICAL: Never fulfill an order based on:
  - Mobile SDK success callback
  - Client-side redirect URL
  - Customer claiming they paid

ONLY confirm an order when:
  - Webhook with valid signature confirms payment.captured
  - OR reconciliation cron verifies captured status via gateway API
  - AND amount matches order.total_paise
  - AND gateway order ID matches our payment record
```

**Refund Flow:**

```typescript
async initiateRefund(orderId: string, adminId: string, amount?: number) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    const payment = await tx.payment.findFirst({
      where: { orderId, status: 'captured' },  // Only captured, not just 'success'
    });

    if (!payment) throw new BadRequestException('NO_SUCCESSFUL_PAYMENT');

    const refundAmount = amount ?? payment.amountPaise;

    // Check total refunds don't exceed payment
    const existingRefunds = await tx.refund.aggregate({
      where: { paymentId: payment.id, status: { not: 'failed' } },
      _sum: { amountPaise: true },
    });
    const totalRefunded = existingRefunds._sum.amountPaise ?? 0;

    if (totalRefunded + refundAmount > payment.amountPaise) {
      throw new BadRequestException('REFUND_EXCEEDS_PAYMENT');
    }

    // Call gateway
    const result = await this.gateway.initiateRefund(
      payment.providerPaymentId!, refundAmount,
    );

    // Record refund
    await tx.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        gatewayRefundId: result.refundId,
        amountPaise: refundAmount,
        status: 'processing',
        initiatedBy: adminId,
      },
    });

    // Update order payment status
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'refund_pending' },
    });

    // Audit log
    await tx.auditEvent.create({
      data: {
        action: 'refund.initiated',
        entityType: 'order',
        entityId: orderId,
        actorType: 'admin',
        actorId: adminId,
        afterState: { refundAmount, gatewayRefundId: result.refundId } as any,
      },
    });
  });
}
```

**Error Cases:**

| Error | HTTP | Code |
|---|---|---|
| ORDER_NOT_FOUND | 404 | PAY_001 |
| INVALID_ORDER_STATUS | 400 | PAY_002 |
| ACTIVE_PAYMENT_EXISTS | 409 | PAY_003 |
| INVALID_WEBHOOK_SIGNATURE | 401 | PAY_004 |
| AMOUNT_MISMATCH | 400 | PAY_005 |
| DUPLICATE_WEBHOOK | 200 | — (idempotent OK) |
| NO_SUCCESSFUL_PAYMENT | 400 | PAY_006 |
| REFUND_EXCEEDS_PAYMENT | 400 | PAY_007 |
| GATEWAY_ERROR | 502 | PAY_008 |
| DUPLICATE_PAYMENT_INITIATION | 200 | — (return existing) |
| PAYMENT_EXPIRED | 400 | PAY_009 |

---

### 2.12 Admin Module

**Purpose:** Admin authentication, RBAC, audit logging, reports.

> **Implementation status (2026-11-22):** There is no `AdminModule`; reports and admin-user management are not implemented (planned Phase 5). What exists:
> - **RBAC:** `RolesGuard` and the `@Roles()` decorator in `modules/auth/guards` and `common/decorators`. The `owner` role bypasses role checks, and a route with no roles is open to any admin. Roles are applied on catalog writes (`owner`, `catalog_editor`), inventory adjust (`owner`, `catalog_editor`) and order status changes (`owner`, `fulfillment_operator`).
> - **Audit:** there is no `AuditService`. Audit events are written inline with `prisma.auditEvent.create` in the orders service (status changes) and the inventory service (stock adjustments) only. Product and category changes are not audited.
> - **Admin accounts:** rows in `admin_users`, created by the seed script (one `owner`). An admin signs in through the normal OTP flow and receives a token with `type: "admin"`.

```
modules/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
├── audit.service.ts
├── reports.service.ts
└── dto/
    ├── create-admin.dto.ts
    ├── report-query.dto.ts
    └── audit-query.dto.ts
```

**RBAC Roles & Permissions:**

| Role | Catalog | Inventory | Orders | Reports | Admin Users |
|---|---|---|---|---|---|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| catalog_editor | ✅ | Read | Read | ❌ | ❌ |
| fulfillment_operator | Read | ✅ | ✅ | Limited | ❌ |
| support | Read | Read | Read + notes | ❌ | ❌ |

**RBAC Guard:**

```typescript
@Injectable()
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<AdminRole[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const user = context.switchToHttp().getRequest().user;
    if (user.type !== 'admin') return false;

    return requiredRoles.includes(user.role);
  }
}

// Usage:
@Roles('owner', 'catalog_editor')
@Post('admin/products')
createProduct() { ... }
```

**Audit Service:**

```typescript
async log(params: {
  actorType: 'admin' | 'system' | 'customer';
  actorId: string | null;
  action: string;           // 'product.created', 'inventory.adjusted'
  entityType: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  metadata?: any;
}) {
  await this.prisma.auditEvent.create({ data: params });
}
```

**Pilot Reports:**

| Report | Query |
|---|---|
| Orders summary | Count + GMV by status, date range |
| COD pending | Orders with payment_status = 'cod_pending' and status = 'delivered' |
| Refunds | Total refunded, pending, by date |
| Stock summary | All variants with on_hand, reserved, available, low-stock flag |
| Top products | Order items grouped by product, sorted by qty desc |

---

## 3. State Transition Diagrams

### 3.1 Order + Payment Combined State

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORDER PLACEMENT                              │
│                                                                     │
│  Cart ──> POST /orders ──> [Reserve Stock] ──> Order: PLACED       │
│                                                                     │
│  ┌── UPI Path ──────────────────┐  ┌── COD Path ─────────────────┐ │
│  │                              │  │                              │ │
│  │ POST /payments/initiate      │  │ Order: PLACED               │ │
│  │ Payment: INITIATED           │  │ Payment: COD_PENDING        │ │
│  │     │                        │  │     │                        │ │
│  │     ├── Gateway Success      │  │     │ Admin confirms         │ │
│  │     │   Payment: SUCCESS     │  │     ▼                        │ │
│  │     │   Order: CONFIRMED     │  │ Order: CONFIRMED             │ │
│  │     │   Reservation: COMMIT  │  │ Reservation: COMMITTED      │ │
│  │     │                        │  │                              │ │
│  │     └── Gateway Failed       │  │                              │ │
│  │         Payment: FAILED      │  │                              │ │
│  │         Order: CANCELLED     │  │                              │ │
│  │         Reservation: RELEASE │  │                              │ │
│  └──────────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FULFILLMENT                                  │
│                                                                     │
│  CONFIRMED ──> Admin packs ──> PACKED                               │
│       │                          │                                   │
│       │                     Admin ships (tracking ID)                │
│       │                          │                                   │
│       │                        SHIPPED ──> Courier delivers          │
│       │                                        │                     │
│       │                                    DELIVERED                  │
│       │                                        │                     │
│       ▼                                   [Within 7 days]            │
│   CANCELLED                                    │                     │
│   (release stock,                         RETURN_REQUESTED           │
│    refund if paid)                         ┌────┴────┐               │
│                                            ▼         ▼               │
│                                     RETURN_APPROVED  RETURN_REJECTED │
│                                            │                         │
│                                            ▼                         │
│                                        RETURNED                      │
│                                     (restock inventory)              │
│                                            │                         │
│                                            ▼                         │
│                                      REFUND_PENDING                  │
│                                     (gateway refund)                 │
│                                            │                         │
│                                            ▼                         │
│                                         REFUNDED                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Inventory Reservation Lifecycle

```
                    ┌───────────┐
   Checkout ──────> │   HELD    │ <── reservation created
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
         Payment OK   Payment Fail  Timer expires
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │COMMITTED │ │ RELEASED │ │ EXPIRED  │
        │          │ │          │ │          │
        │reserved  │ │reserved  │ │reserved  │
        │stays     │ │decrements│ │decrements│
        └──────────┘ └──────────┘ └──────────┘
```

---

## 4. Error Handling Strategy

### 4.1 Standard Error Response

```typescript
{
  success: false,
  error: {
    code: "INV_001",                    // Machine-readable
    message: "Insufficient stock",       // Human-readable
    details: {                           // Optional context
      variantId: "uuid",
      requested: 3,
      available: 1
    }
  },
  requestId: "req_abc123"              // For support/debugging
}
```

### 4.2 HTTP Status Usage

| Status | Usage |
|---|---|
| 200 | Success, or idempotent duplicate (return existing resource) |
| 201 | Resource created |
| 400 | Validation error, business rule violation |
| 401 | Not authenticated, invalid/expired token |
| 403 | Authenticated but not authorized (wrong role, not owner) |
| 404 | Resource not found or not owned by requester |
| 409 | Conflict (stock unavailable, duplicate SKU, invalid state transition) |
| 429 | Rate limited (OTP, API) |
| 500 | Unexpected server error (log, alert, never expose internals) |
| 502 | External service error (gateway, OTP provider) |

### 4.3 Global Exception Filter

```typescript
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.headers['x-request-id'] || uuid();

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = body.code || `HTTP_${status}`;
      message = body.message || exception.message;
      details = body.details;
    }

    // Log full error (never expose stack to client)
    this.logger.error({
      requestId,
      status,
      code,
      message,
      path: request.url,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      success: false,
      error: { code, message, details },
      requestId,
    });
  }
}
```

### 4.4 Validation Error Format

```typescript
// Input: POST /orders with missing fields
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: [
      { field: "addressId", message: "addressId must be a UUID" },
      { field: "idempotencyKey", message: "idempotencyKey should not be empty" }
    ]
  },
  requestId: "req_xyz789"
}
```

---

## 5. Cross-Cutting Concerns

### 5.1 Request Logging

> **Implementation status (2026-11-23):** Logging is implemented as plain text lines (no JSON yet; JSON logs and error reporting are a separate task) in `apps/api/src/common/logging/`, set up in `main.ts`:
>
> - **Request ID:** `requestIdMiddleware` gives every request one ID (a valid `X-Request-Id` sent by the caller is reused: 8 to 64 letters, digits, `.`, `_`, `-`; anything else is replaced by a UUID). The same ID is in every log line of the request, in the reply's `requestId` (success and error) and in the `X-Request-Id` response header (exposed to browsers through CORS). It travels through the request with `AsyncLocalStorage` (`request-context.ts`), so lines written deep in a service carry it too.
> - **Access log:** `createAccessLogMiddleware` writes one line per request when the response has been sent, so failures, rejected logins, rate-limited calls and unknown routes are logged too: `GET /api/v1/cart 200 12ms user=<id|anon>`, plus `code=<error code> "<message>"` for errors. 5xx is logged as an error, 4xx as a warning, everything else as normal output. `/health` and browser preflight (`OPTIONS`) requests are only logged at `debug`. Query strings, request bodies and headers are never logged. `user=` is `anon` for login requests because the caller is not authenticated until they succeed; the `login ok user=...` line has the ID.
> - **Errors:** `HttpExceptionFilter` logs a 5xx with its message and stack (never sent to the client); a 4xx adds no extra line (the access line has the status, code and message), only a `debug` line with the field details.
> - **Events (normal level):** `order placed <number> total=... items=... payment=... user=...` (or `returned again for the same idempotency key`), `order <number> <from> -> <to> by admin <id>` (cancellations say `(reason recorded)`, the text is not logged), `order ... cancelled by the customer`, `otp sent to +91******3210`, `login ok user=... type=... new=...`; warnings: `insufficient stock variant=... requested=... available=...`, `STOCK_MISMATCH sku=... on_hand=... needed=...`, `otp verify failed for +91******3210 (attempt n of 5)`, `Rate limit reached ...`.
> - **Privacy:** `AppLogger` masks Indian mobile numbers (`+91******3210`) and login tokens (`[token]`) in anything that is logged, as a safety net; the code also avoids logging them. The dev-only mock OTP line still prints the code.
> - **LOG_LEVEL:** `error`, `warn`, `log` (default), `debug` or `verbose`; each includes the quieter ones; an unknown value stops the API at startup. In production (or with `NO_COLOR` set) lines have no colour codes.
> - **Finding a request:** take the `requestId` from a reply (or the `X-Request-Id` header) and search the logs for `req=<id>`. The web and mobile apps show it to the customer as a small "Reference: <id>" line with a Copy button under the error message when a call fails (sign-in, add address, add to bag, place order), so a customer can read it out and you can search the logs for `req=<id>`. `ApiError` in each app's API client carries it (`requestId`, from the reply or the `X-Request-Id` header); `referenceOf(error)` returns it, or an empty text for a network failure, which has none. To go from a log line to a person, the admin Orders page shows each customer's user id (the same `user=<id>`) with a Copy button, and `GET /admin/orders` returns it as `customer.id`.

```
Example (one order, lines shortened):
LOG [HTTP] req=bf1fd942-... POST /api/v1/orders 201 23ms user=6e7e4675-...
LOG [CheckoutService] req=bf1fd942-... order placed JUH-20261123-0096 total=₹1,599 items=1 payment=cod user=6e7e4675-...
WARN [InventoryService] req=84f9f661-... insufficient stock variant=8b4c8006-... requested=5 available=2
WARN [HTTP] req=84f9f661-... POST /api/v1/orders 409 12ms user=6e7e4675-... code=INSUFFICIENT_STOCK
```

### 5.2 Response Envelope

```typescript
// Success:
{ success: true, data: { ... }, requestId: "req_abc123" }

// Paginated:
{ success: true, data: { items: [...], cursor: "abc", hasMore: true }, requestId: "req_abc123" }

// Error:
{ success: false, error: { code, message, details }, requestId: "req_abc123" }
```

### 5.3 Rate Limiting

> **Implementation status (2026-11-22):** Rate limiting is enforced by `ThrottlingModule` (`apps/api/src/common/throttling/`), which `AppModule` imports and which registers `AppThrottlerGuard` as a global guard. The limits live in `throttler.config.ts` (`THROTTLE_LIMITS`; the `RATE_LIMITS` constants in `packages/shared` are the original design values and are not used). Differences from the table below:
> - **Counting:** every endpoint allows 100 requests a minute **per logged-in user** (the user ID from the verified access token, so customers who share an IP do not block each other). Callers with no valid token (logged out, expired, forged) are counted **per IP**. There is no separate 30 per minute public limit. `GET /health` is not limited.
> - **OTP endpoints** (`@OtpThrottle()`) also have two window counters of 10 minutes each, one per phone number (taken from the request body) and one per IP: `POST /auth/otp/request` 3 per phone and 10 per IP; `POST /auth/otp/verify` 5 per phone and 20 per IP. The per-IP request limit is 10 minutes, not 1 hour. The limit applies before validation, so malformed requests count, and a correct code is refused while the phone is blocked.
> - **Blocked calls** return 429 with code `RATE_LIMITED`, the message "Too many attempts. Please wait a few minutes and try again." and a `Retry-After` header. The web and mobile login screens show that message.
> - **Client IP:** the limits read `req.ip`. Behind a proxy set `TRUST_PROXY` (number of proxies, for example `1`), otherwise every caller shares the proxy's address and the per-IP limits would block everyone together. In production the API logs a warning at startup if it is not set. `X-Forwarded-For` is ignored when it is not set, so it cannot be spoofed.
> - **Storage:** counters are in memory, so they reset on restart and are per instance. Moving them to Redis belongs with the OTP store (step 26).
> - Also enforced in `AuthService`: 5 attempts per OTP and a 30-second resend cooldown, held in memory.
> - Known trade-off: someone who knows a phone number can use up its OTP allowance and delay that person's login for up to 10 minutes.

| Endpoint | Limit | Window |
|---|---|---|
| POST /auth/otp/request | 3 per phone | 10 minutes |
| POST /auth/otp/request | 10 per IP | 1 hour |
| POST /auth/otp/verify | 5 attempts per OTP | Until expiry |
| All authenticated APIs | 100 requests | 1 minute per user |
| All public APIs | 30 requests | 1 minute per IP |

### 5.4 Idempotency

| Endpoint | Key | Behavior |
|---|---|---|
| POST /orders | `idempotencyKey` in body | Return existing order if key exists |
| POST /webhooks/payments | `provider_event_id` | Skip if already processed |
| POST /payments/initiate | One active payment per order | Return existing if pending |

### 5.5 Configuration & Environment Validation

- `apps/api/src/config/env.validation.ts` exports `validateEnv`, wired in `app.module.ts` as `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'], validate: validateEnv })`. It is a plain function with no Joi or Zod dependency.
- **Required variables:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. If any is missing or blank the API refuses to start and names each one: `Missing required environment variables: <names>. Copy apps/api/.env.example to apps/api/.env and set them.`
- **CORS:** `main.ts` reads `CORS_ORIGINS` (comma separated). When set, it **replaces** the built-in defaults, which are `http://localhost:3001` (web), `http://localhost:3002` (admin) and `http://localhost:8081` (mobile web preview). `.env.example` lists all three.
- `OTP_PROVIDER` is validated (supported values only; `mock` is refused in production, see 2.1). Other variables in `.env.example` (`PORT`, `NODE_ENV`, `PAYMENT_GATEWAY`, `S3_*`) are not validated.
- `.env` is read only at process start, so changing it requires restarting the API.

---

## 6. Module Dependency Graph

```
                    AppModule
                       │
          ┌────────────┼────────────────┐
          │            │                │
      ConfigModule  PrismaModule   CommonModule
          │            │            (guards, filters,
          │            │             interceptors)
          │            │
    ┌─────┴────────────┴─────────────────────────┐
    │                                             │
    │              Feature Modules                │
    │                                             │
    │  AuthModule ──────────> UsersModule          │
    │       │                     │               │
    │       │              AddressesModule         │
    │       │                                     │
    │  CategoriesModule                           │
    │       │                                     │
    │  ProductsModule ──────> CategoriesModule     │
    │       │                                     │
    │  MediaModule ─────────> ProductsModule       │
    │                                             │
    │  InventoryModule ─────> ProductsModule       │
    │       │                                     │
    │  CartModule ──────────> InventoryModule      │
    │       │                 ProductsModule       │
    │       │                                     │
    │  CheckoutModule ──────> CartModule           │
    │       │                 InventoryModule      │
    │       │                 AddressesModule      │
    │       │                 OrdersModule         │
    │       │                                     │
    │  OrdersModule ────────> InventoryModule      │
    │       │                 PaymentsModule       │
    │       │                                     │
    │  PaymentsModule ──────> OrdersModule         │
    │       │                 InventoryModule      │
    │       │                                     │
    │  AdminModule ─────────> All modules (read)   │
    │                         AuditService         │
    └─────────────────────────────────────────────┘
```

Note: Circular dependencies between Orders ↔ Payments resolved using `forwardRef()` or by extracting shared logic into a separate service.

---

## 7. Web App Architecture (`apps/web`)

**Technology:** Next.js 14 (App Router) + Tailwind CSS + TypeScript  
**Port:** `localhost:3001` (dev), shares same API backend as mobile app

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (ThemeProvider, CartProvider, Header, BottomNav, theme flash-prevention script)
│   │   ├── globals.css         # Tailwind + theme CSS variables (:root / .dark) + component classes
│   │   ├── page.tsx            # Home (/, hero, collections, arrivals)
│   │   ├── shop/
│   │   │   ├── page.tsx        # Product listing (search, filters, grid)
│   │   │   └── [slug]/page.tsx # Product detail (image, variants, add to bag)
│   │   ├── cart/page.tsx       # Cart (items, stepper, price summary)
│   │   ├── checkout/
│   │   │   ├── address/
│   │   │   │   ├── page.tsx    # Select address
│   │   │   │   └── new/page.tsx# Add new address
│   │   │   └── review/page.tsx # Order review
│   │   ├── order-success/page.tsx # Order confirmation
│   │   ├── orders/
│   │   │   ├── page.tsx        # Orders list (table on desktop)
│   │   │   └── [id]/page.tsx   # Order detail (timeline, tracking)
│   │   └── account/page.tsx    # Profile / Auth (split-panel login)
│   ├── components/
│   │   ├── Header.tsx          # Sticky header (brand, nav, cart badge)
│   │   └── BottomNav.tsx       # Mobile bottom nav (5 tabs, cart badge)
│   └── lib/
│       ├── api.ts              # API client (mirrors mobile api.ts)
│       ├── cart-context.tsx    # CartProvider, useCartCount()
│       └── theme-context.tsx   # ThemeProvider, useTheme() → { isDark, toggleTheme }
├── tailwind.config.ts          # Design tokens as CSS-variable colors; darkMode: 'class'
├── next.config.js
└── package.json
```

**Design token alignment:** The web app uses the same brand palette, font families (Noto Serif + DM Sans) and spacing as `apps/mobile/src/theme/`. Colors are defined once as CSS variables in `globals.css` (see 7.1) and referenced from `tailwind.config.ts`, rather than as fixed hex values.

**Responsive strategy:**
- Mobile (`<640px`): App-like layout, bottom nav, sticky CTAs, 2-col grids
- Tablet (`md: 640–1024px`): 2–3 col grids, larger inputs (h-14), more padding
- Desktop (`lg: 1024px+`): Full-width, side-by-side layouts, table views, header nav

### 7.1 Theme System (Light / Dark)

- **Tokens:** `globals.css` defines every color as an RGB triplet CSS variable, e.g. `--color-primary: 139 58 74`, under `:root` (light) and `.dark` (dark; e.g. `--color-background: 18 18 18`). `tailwind.config.ts` maps each token with a `cssVar(name)` helper to `rgb(var(--color-<name>) / <alpha-value>)`, so opacity modifiers such as `bg-primary/10` and `bg-surface/80` work in both themes. `darkMode` is `'class'`.
- **Provider:** `ThemeProvider` (`src/lib/theme-context.tsx`) wraps the app in `layout.tsx` (outside `CartProvider`). It adds or removes the `dark` class on `<html>`, saves the choice in `localStorage` under `juhar_theme` (`light` | `dark`), and updates `<meta name="theme-color">` (`#FAFAF7` light, `#121212` dark) so the mobile browser bar follows the toggle.
- **No flash on load:** an inline `<script>` in `<head>` reads `juhar_theme` and adds `dark` before first paint, and `<html>` has `suppressHydrationWarning`.
- **Default:** light. The OS appearance setting is not followed.
- **Toggle:** a Sun/Moon button in `Header` at every width (on a phone it is the only button left in the header, since the bottom bar carries the pages, so logged-out visitors can switch) and a "Dark Mode / Light Mode" switch in the Account page menu after login.
- **Admin panel:** its own, separate mechanism: CSS variables in `globals.css` overridden under `:root[data-theme='dark']`; `components/theme.ts` (`readTheme`, `applyTheme`, key `juhar_admin_theme`), `components/ThemeToggle.tsx` in the `AdminLayout` top bar, and an inline script in `layout.tsx` that sets `data-theme` before first paint. Status badges use the `--badge-*` variables; brand-coloured text uses `--maroon-text` (the plain maroon is too dark to read on a dark page).
- **Rule for new UI:** use the token classes (`bg-surface`, `text-text-primary`, `border-border`, `bg-status-*-bg`, `text-status-*-text`, `bg-toast-bg`, `text-accent-dark`). Do not hardcode hex values or `bg-white` for surfaces or overlays, because text that uses `text-text-primary` turns light in dark mode and becomes unreadable on a fixed white background (use `bg-surface/90` for badges over product images).

### 7.2 Pages that Read the URL (`useSearchParams`)

`next build` fails with "useSearchParams() should be wrapped in a suspense boundary" for any page that calls `useSearchParams()` outside `<Suspense>`. `/checkout/review` (`addressId`) and `/order-success` (`orderId`) therefore keep their logic in an inner component (`OrderReviewContent`, `OrderSuccessContent`) and export a default page component that wraps it in `<Suspense fallback={<spinner/>}>`. Use the same pattern for any new page that reads query parameters.

### 7.3 Order Status Display

- **Order detail (`orders/[id]`):** a five-step timeline (placed, confirmed, packed, shipped, delivered). `cancelled` replaces the timeline with a banner showing the cancel date and reason (matching mobile). Return and refund statuses (`return_requested`, `return_approved`, `return_rejected`, `returned`, `refund_pending`, `refunded`) show a status notice above a fully completed timeline. The payment badge reflects `paymentMode` (`COD Order` / `UPI Order`).
- **Orders list (`orders`):** `STATUS_STYLES` has a badge style and label for all twelve statuses, using token classes.

---

## 8. Mobile App Screen Architecture

**Total: 13 screens implemented** (9 deferred: No Internet, App Update, Maintenance, standalone My Addresses, Search Results, FAQs). Auth screens are inline in Profile.

> **Implementation status (2026-11-22):** The app runs on Expo SDK 58, React Native 0.88, React 19 and React Navigation 7. `apps/mobile` has its own `package.json` and `package-lock.json` and is installed separately; it is not part of the root npm workspaces. Navigation is a bottom-tab navigator with five tabs: Home, Shop (Explore stack), Cart (stack), Orders (stack) and Account (`ProfileScreen` directly, with no nested stack). The Search and standalone Addresses screens in 8.5 and 8.6 do not exist.

### 8.1 Onboarding & System States

| Screen | Component | Notes |
|---|---|---|
| Splash | `SplashScreen` | Logo + auto-transition, no user interaction |
| Welcome | `WelcomeScreen` | 2-3 swipeable pages, skip link, shown only on first launch (AsyncStorage flag) |
| No Internet | `NoInternetScreen` | Shown when network unavailable, retry button re-checks connectivity |
| App Update Required | `ForceUpdateScreen` | Non-dismissable, compare app version vs minimum from API/remote config |
| Maintenance | `MaintenanceScreen` | Shown when API returns 503, informational only |

### 8.2 Authentication

| Screen | Component | Route | Notes |
|---|---|---|---|
| Phone Input | `LoginPhoneScreen` | Profile tab (unauthenticated) | +91 prefix, validates 10-digit Indian mobile |
| OTP Verify | `LoginOtpScreen` | After phone submit | 6-digit input, 30s resend cooldown, max 5 attempts |
| Name Capture | `NameCaptureScreen` | After first OTP verify | Shown when `isNewUser=true` or `name=null`, skip option |

### 8.3 Core Shopping Flow

> **API calls (2026-11-22):** Every screen reaches the API through the shared client (`apps/mobile/src/services/api.ts`; `apps/web/src/lib/api.ts` on the web). Orders use `getOrders()`, `getOrder(id)` and `placeOrder({ addressId, paymentMode, idempotencyKey })`, which load the saved token before calling. No screen has its own `fetch` or its own copy of `API_BASE` any more, so changes such as token refresh (step 24) only need to be made in one place per app. Order payloads are still typed loosely (`any`).
>
> **Implementation status (2026-11-22):** The Cart tab works for guests (local cart, key `juhar_local_cart`, synced to the server after login) as well as for logged-in users. Order Review does not call `POST /checkout/quote`: it computes totals client-side from the cart. Placing the order is `POST /orders` from Order Review (there is no `POST /checkout/place`), and Order Success shows the returned order. Only COD is offered.

| Screen | Component | Route | Data Source |
|---|---|---|---|
| Home | `HomeScreen` | Tab: Home | `GET /products` (new arrivals), static collections |
| Explore | `ExploreScreen` | Tab: Explore | `GET /products` + `GET /categories` |
| Product Detail | `ProductDetailScreen` | Stack: Explore → Detail | `GET /products/:slug` |
| Cart | `CartScreen` | Tab: Cart | `GET /cart` (authenticated) |
| Select Address | `SelectAddressScreen` | Stack: Cart → Checkout | `GET /me/addresses` |
| Add Address | `AddAddressScreen` | Stack: Checkout → Add | `POST /me/addresses` |
| Order Review | `OrderReviewScreen` | Stack: Checkout → Review | `POST /checkout/quote` |
| Order Success | `OrderSuccessScreen` | Stack: after place order | `POST /checkout/place` response |

### 8.4 Post-Purchase

| Screen | Component | Route | Data Source |
|---|---|---|---|
| Orders List | `OrdersScreen` | Tab: Orders | `GET /orders` (authenticated) |
| Order Detail | `OrderDetailScreen` | Stack: Orders → Detail | `GET /orders/:id` |

### 8.5 Profile & Addresses

| Screen | Component | Route | Data Source |
|---|---|---|---|
| Profile | `ProfileScreen` | Tab: Profile | `GET /me` |
| My Addresses | `AddressesScreen` | Stack: Profile → Addresses | `GET /me/addresses` |
| Search Results | `SearchScreen` | Stack: Explore → Search | `GET /products?search=` |

### 8.6 Navigation Structure

> **Implementation status (2026-11-22):** The tree below is the design. Actual tab names are Home, Shop, Cart, Orders and Account. Shop contains `ExploreList` and `ProductDetail` only. Account is `ProfileScreen` with no stack, so `Search`, `Addresses` and the Profile-stack `AddAddress` do not exist; address selection and creation live in the Cart stack.

```
TabNavigator (5 tabs)
├── Home (HomeScreen)
├── Explore (ExploreStackNavigator)
│   ├── ExploreList (ExploreScreen)
│   ├── ProductDetail (ProductDetailScreen)
│   └── Search (SearchScreen)
├── Cart (CartStackNavigator)
│   ├── CartView (CartScreen)
│   ├── SelectAddress (SelectAddressScreen)
│   ├── AddAddress (AddAddressScreen)
│   ├── OrderReview (OrderReviewScreen)
│   └── OrderSuccess (OrderSuccessScreen)
├── Orders (OrdersStackNavigator)
│   ├── OrdersList (OrdersScreen)
│   └── OrderDetail (OrderDetailScreen)
└── Profile (ProfileStackNavigator)
    ├── ProfileView (ProfileScreen)
    ├── Addresses (AddressesScreen)
    └── AddAddress (AddAddressScreen)
```

### 8.7 System Screen Triggers

| Screen | Trigger |
|---|---|
| Splash | App cold start, shown for 1-2s |
| Welcome | First launch only (`@juhar/onboarded` not in AsyncStorage) |
| No Internet | `NetInfo` listener detects offline state |
| Force Update | API response header `X-Min-App-Version` > current app version |
| Maintenance | API returns HTTP 503 with `maintenance: true` |

> **Implementation status (2026-11-22):** Only Splash and Welcome exist. The first-launch flag is stored under the AsyncStorage key `juhar_onboarding_done` (set to `'true'`), not `@juhar/onboarded`. No Internet, Force Update and Maintenance are not implemented.

### 8.8 Theme System (Light / Dark)

- **Tokens:** `src/theme/colors.ts` exports `lightColors`, `darkColors` and `ColorPalette`. `ColorPalette` is the mapped type `{ [K in keyof typeof lightColors]: string }`, so dark values can differ from the light literals. `colors` (an alias of `lightColors`) remains only as a static default for code outside the provider, such as the font-loading view in `App.tsx`. `src/theme/index.ts` re-exports the palettes, `typography`, `spacing`, `borderRadius`, `elevation`, `ThemeProvider` and `useTheme`.
- **Provider:** `ThemeProvider` (`src/theme/ThemeContext.tsx`) exposes `useTheme()` returning `{ colors, isDark, toggleTheme }`. The default is light, and the choice is saved in AsyncStorage under `juhar_theme`. The OS appearance setting is not followed, even though `app.json` sets `userInterfaceStyle` to `"automatic"`. `App.tsx` nests `SafeAreaProvider > ThemeProvider > AppInner`, and `AppInner` sets the `StatusBar` style from `isDark`.
- **Screen pattern:** `const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]);` with `const createStyles = (colors: ColorPalette) => StyleSheet.create({ ... })` at the bottom of the file. Sub-components (cards, rows, badges) call `useTheme()` themselves. `TabNavigator.tsx` builds each stack's header options and the tab bar from `useTheme()`.
- **Toggle:** on `ProfileScreen`, a "Dark Mode / Light Mode" row with a `Switch` in the menu card when logged in, and a Sun/Moon icon button at the right of the "Account" header when logged out (phone-number screen only; the OTP and name-capture screens have none).
- **Rule for new UI:** use semantic tokens (`background`, `surface`, `surfaceAlt`, `textPrimary`, `statusDeliveredBg`, …) rather than hex values. Fixed colors are acceptable only on brand-coloured backgrounds, such as a white check mark on a coloured circle.
- **React Native 0.88:** `StyleSheet.absoluteFillObject` was removed; use `StyleSheet.absoluteFill`.

### 8.9 Messages and copying text

- **Do not call `Alert.alert` directly for errors.** It does nothing in the Expo web preview (`expo start --web`), so the message is silently lost. Use `showAlert(title, message)` from `src/utils/showAlert.ts`, which uses `window.alert` on web and `Alert.alert` on devices. Errors on the main flows are also shown on the screen itself (Add Address, Place Order), which works everywhere.
- **Copy buttons use `useCopyToClipboard`** (`src/utils/useCopyToClipboard.ts`, built on `expo-clipboard`): it copies the text, returns which button was copied so the label can switch to "Copied" for about 1.5 seconds, and falls back to showing the text if the clipboard is unavailable.
- The logout confirmation in `ProfileScreen` keeps its own web check (`window.confirm`) because it needs a yes/no answer.
