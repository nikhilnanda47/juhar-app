# Juhar

**Digital-first Sambalpuri fashion brand — Western Odisha to India.**

Juhar is an own-brand, direct-to-consumer (D2C) Sambalpuri fashion e-commerce platform. Local manufacturing and weaving partners supply products; Juhar owns customer experience, merchandising, quality, digital commerce, order support and brand identity.

## Pilot Scope (P0)

- **Catalog**: Browse, search, filter sarees by fabric/weave/price/color
- **Cart & Checkout**: Server-calculated pricing, address capture, delivery check (all of India for the pilot; checkout and address forms hold to the same rule as the product page)
- **Payments**: Cash on Delivery (COD); UPI planned for Phase 4
- **Inventory**: Atomic stock reservations with row-level locking, expiry cron
- **Orders**: Full lifecycle — placed → confirmed → packed → shipped → delivered + cancellation
- **Admin**: Catalog CRUD, inventory view, order management with state machine, dashboard
- **Audience**: Sambalpur & Western Odisha, ~20–30 designs, 5–6 pieces each

## Current Status

> Status as of 2026-11-22. Open bugs and technical debt are listed under [Known Issues](#known-issues--technical-debt).

### Customer App (Mobile) — 25 features working

| # | Feature | Status |
|---|---------|--------|
| 1 | Splash screen with branded animation | ✅ |
| 2 | Welcome onboarding (3-slide carousel, first launch only) | ✅ |
| 3 | Home screen — hero, collections grid, new arrivals from API | ✅ |
| 4 | Explore catalog — category chips, 2-column product grid | ✅ |
| 5 | Filter products by category | ✅ |
| 6 | Product detail — price, variants, delivery PIN check (real: all over India, 5–7 days, COD), Share (the phone's share sheet with a link to the saree), specs, delivery info | ✅ |
| 7 | Variant selection (color) | ✅ |
| 8 | Login via phone OTP | ✅ |
| 9 | Name capture for new users | ✅ |
| 10 | Guest cart — add to bag without login (local storage) | ✅ |
| 11 | Cart badge count on tab icon | ✅ |
| 12 | Cart — qty stepper, price breakdown, availability warnings | ✅ |
| 13 | Update quantity / remove cart items (minus to 0 removes) | ✅ |
| 14 | Guest cart sync to server on login | ✅ |
| 15 | Checkout — select delivery address | ✅ |
| 16 | Add new address (PIN code validation) | ✅ |
| 17 | Order review — address, items, COD, total | ✅ |
| 18 | Place order (COD) — atomic stock reservation | ✅ |
| 19 | Order success with order number | ✅ |
| 20 | Order history with status badges | ✅ |
| 21 | Order detail with status timeline | ✅ |
| 22 | Pull-to-refresh + refresh button on all screens | ✅ |
| 23 | Fade-in animations across screens | ✅ |
| 24 | Light / dark mode — Switch on Profile when logged in, Sun/Moon button on Account when logged out; choice is remembered | ✅ |
| 25 | My Addresses — see, edit, delete and choose the default address (Account > Addresses, and the pencil on the checkout list) | ✅ |

### Customer Website (Web) — 13 pages + dark mode

| # | Feature | Status |
|---|---------|--------|
| 1 | Home — hero banner, collections, new arrivals | ✅ |
| 2 | Shop — search, category filters, product grid (responsive 2–5 cols) | ✅ |
| 3 | Product detail — variants, delivery PIN check (real, same rule as checkout), Share (share sheet on a phone, copies the link on a desktop), add to bag, related products | ✅ |
| 4 | Guest cart — add items without login (localStorage) | ✅ |
| 5 | Cart — stepper, price breakdown, checkout redirect | ✅ |
| 6 | Cart badge count on header + bottom nav | ✅ |
| 7 | Select address — 2-col grid, delivery estimate, sticky sidebar | ✅ |
| 8 | Add address — numbered sections, live preview, label cards | ✅ |
| 9 | Order review — place order (COD) | ✅ |
| 10 | Orders — table layout (desktop), card layout (mobile), filter chips; order detail handles cancelled, return and refund states | ✅ |
| 11 | Account — split-panel login, profile with sidebar (desktop) | ✅ |
| 12 | Light / dark mode — toggle in the header (desktop and phone width, so logged-out visitors can switch) and the Account menu; choice is remembered, no flash on load | ✅ |
| 13 | My Addresses (`/account/addresses`) — edit, delete, make default; the pencil on the checkout list opens the same edit page | ✅ |

### Admin Panel (Web) — 18 features working

| # | Feature | Status |
|---|---------|--------|
| 1 | OTP login | ✅ |
| 2 | Dashboard — live stats (orders, pending, low stock, GMV) | ✅ |
| 3 | Dashboard — recent orders table | ✅ |
| 4 | View all categories | ✅ |
| 5 | Create new category | ✅ |
| 6 | Activate/deactivate category | ✅ |
| 7 | Product catalog — table with price, stock, status | ✅ |
| 8 | Create product with variants and fabric metadata | ✅ |
| 9 | Publish/unpublish products | ✅ |
| 10 | Inventory — all variants with on-hand/reserved/available | ✅ |
| 11 | Orders — filter by status, search by order#/phone | ✅ |
| 12 | Confirm → Pack → Ship → Deliver order status flow | ✅ |
| 13 | Ship with tracking ID and courier name | ✅ |
| 14 | Logout | ✅ |
| 15 | Cancel a placed or confirmed order with a required reason (releases the reserved stock) | ✅ |
| 16 | Order page (`/orders/[id]`): items to pack with SKU, delivery address and phone (copy buttons), customer, cash to collect, payment, shipment and tracking, history with who did each step; the same Confirm / Pack / Ship / Deliver / Cancel buttons; the orders list links to it and shows what is in each order | ✅ |
| 17 | Adjust stock (Inventory > Adjust): add pieces, remove pieces, or type the counted number; shows what the stock will be, refuses to go below what orders have reserved, requires a reason, and lists the recent changes with who made them | ✅ |
| 18 | Edit product (Catalog > Edit): change title, description, fabric details, category and visibility (draft, published, archived); per colour change name, colour, price and compare price, hide it from the shop, adjust its stock, or add a new colour (the SKU is fixed). Only real changes are saved and each is recorded (old and new value, who). A published product keeps its shop address when the title changes | ✅ |

### Not Yet Built

| Feature | Planned Phase |
|---------|--------------|
| Real OTP/SMS provider (login currently uses a mock that accepts `123456`) | Before launch |
| Follow the device's light/dark setting on first launch (web and mobile) | Post-pilot |
| Real product images (using placeholders) | Phase 5 |
| UPI/online payment | Phase 4 |
| Text search | Phase 5 |
| Customer lookup (admin) | Phase 5 |
| Reports (GMV, top products, stock) | Phase 5 |
| Admin user management / roles | Phase 5 |
| Refund initiation | Phase 4 |
| Wishlist (saved items: heart on cards and product pages, Wishlist page, "Save to Wishlist" from the bag, guest hearts kept until login) | ✅ |
| Push notifications / SMS updates | Phase 5 |
| WhatsApp support integration | Phase 5 |
| "You're offline" / "Something went wrong" screens with Try again (app), our own 404 and error pages (website) | ✅ |
| Force update screen | Phase 5 |

## Known Issues & Technical Debt

Open items as of 2026-11-22, grouped by urgency. The team tracker holds owners and deadlines; this list is the code-level summary.

### Security and reliability — fix before real users
- **Mock login.** OTP login uses a mock provider that always accepts `123456`, so anyone can sign in as any phone number, including the seeded admin. The `OTP_PROVIDER` setting is read (only `mock` is supported until a real SMS provider is built), and the API **refuses to start with `NODE_ENV=production`** while it is `mock` or unset, so the mock cannot reach customers by accident. **Closed pilot:** with `OTP_PROVIDER=mock` the API does start in production when `MOCK_OTP_ALLOWED_PHONES` lists the team's numbers (`+919876543210,+919123456789`); only those numbers can request a code, verify, or refresh a session, and every other number gets "Juhar is not open to the public yet" (403 `LOGIN_NOT_OPEN`). A badly written number stops the start. With a real SMS provider the list is ignored, and clearing it is how the site opens. OTP codes are kept in server memory (lost on restart, not shared across instances).

### Orders and catalog
- **Cash-on-delivery stock holds do not expire.** A COD order reserves its units until an admin confirms, ships or cancels it, so an order nobody acts on keeps that stock locked. The admin panel flags these: a COD order still `placed` after 24 hours gets an **Overdue** badge and its waiting time on the Orders page, an **Overdue (n)** filter, and an "n overdue" link under the dashboard's Pending count. Nothing is cancelled automatically. Unpaid UPI holds still expire after 30 minutes, but that does not cancel the order (payments are Phase 4).
- **Order numbers can skip.** They come from a database sequence (`order_number_seq`), so a number used by an order that then fails is not reused. Orders placed before the `JUH-` rename keep their old `SAJ-` numbers.
- **Cancellations.** Customer-side order cancellation is out of scope for now (in discovery). An API endpoint for it exists but no app uses it, and it writes no audit entry (admin cancellations do).
- **Support number.** The "Need help?" link on the web order page uses a placeholder WhatsApp number (WhatsApp integration is pending).

### Dark mode follow-ups
- Web and mobile always start in light mode and ignore the device setting (tracker step 30, left for later).
- The admin panel has dark mode: a sun/moon button in the top bar (the choice is kept in this browser under `juhar_admin_theme`; the login page follows it but has no button of its own).

### Engineering hygiene
- Test coverage is early: the order state machine, stock (reserve, release, commit, ship, adjust, expiry job), admin order status changes, checkout (quote, order placement, shipping and totals) and rate limiting have tests (`npm test -w apps/api`). The automatic token refresh in the admin, web and mobile API clients is also tested (`npm test -w apps/admin`, `npm test -w apps/web`, and `npm test` inside `apps/mobile`). Auth, cart, the orders service, products and the web and mobile screens are not covered yet. Most of these tests use a fake database, so they cannot prove real concurrent locking or real SQL. The one exception is the test of the database `CHECK` constraints (`apps/api/src/database/check-constraints.spec.ts`), which runs against a real migrated Postgres only when you set `DB_TESTS=1` (CI does): `cd apps/api && npx prisma migrate deploy && DB_TESTS=1 npm test -- check-constraints`.
- Lint: one ESLint setup (`eslint.config.mjs`) covers the API, web, admin, mobile and shared code. Run `npm run lint` from the repo root (`npm run lint:fix` fixes what is safe to fix); CI runs it as the **Lint** job and a failure blocks the merge. It checks unused code, hooks used wrongly or with a stale list of values (`react-hooks/exhaustive-deps`), the `any` type, and (API only) promises that are not awaited. **Zero warnings are allowed** (`--max-warnings 0`): fix a warning or, if it really is intended, say why in the code. For a screen that should load its data **once when it opens**, or an animation that should play once, use `useOnMount` (`apps/mobile/src/utils/hooks.ts`, `apps/web/src/lib/hooks.ts`, `apps/admin/src/lib/hooks.ts`); for an effect that should run when ONE value changes but call the newest version of a function, use `useLatest` from the same file. **`any`** is an error in every file except tests and the files listed in `eslint.any-allowlist.mjs` (old code, 48 files). That list can only shrink: when you give a file real types, delete its line there.
- The mobile tab bar and its screens are type-checked (`apps/mobile/src/navigation/types.ts` lists every screen and what it needs, so a wrong screen name fails the build). One loose spot: the order passed to the success screen is typed `any` because `placeOrder` returns `any`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native 0.88 + Expo SDK 58 + React 19 + TypeScript |
| Customer Website | Next.js 14 (App Router) + Tailwind CSS + TypeScript |
| Theming | Light/dark mode on mobile and web (shared token names; see [Theming](#theming-light--dark-mode)) |
| Backend API | NestJS + TypeScript (modular monolith) |
| Database | PostgreSQL 16 + Prisma ORM |
| Admin Panel | Next.js 14 (App Router) + TypeScript |
| Auth | Phone OTP → JWT (15min access + 7d refresh) |
| Payments | COD (pilot); Razorpay/Cashfree planned |
| Shipping | Manual entry (pilot); no courier API |
| Monorepo | npm workspaces |
| CI/CD | GitHub Actions — API, Web, Admin and Mobile jobs (see [Continuous Integration](#continuous-integration)) |

## Project Structure

```
juhar-app/
├── apps/
│   ├── mobile/              # React Native + Expo (customer mobile app)
│   │   └── src/
│   │       ├── screens/     # 15 screens (Splash, Welcome, Home, Explore,
│   │       │                #   ProductDetail, Cart, SelectAddress, AddAddress (add or edit),
│   │       │                #   ManageAddresses, OrderReview, OrderSuccess, Orders, OrderDetail,
│   │       │                #   Profile, Wishlist)
│   │       ├── navigation/  # Tab (5 tabs) + Stack navigators + types.ts (screen names and params)
│   │       ├── services/    # API client, local guest cart
│   │       ├── components/  # AnimatedUI, RefreshButton
│   │       └── theme/       # Design tokens + dark mode (light/dark colors,
│   │                        #   ThemeContext, typography, spacing)
│   ├── web/                 # Next.js customer website (responsive)
│   │   └── src/
│   │       ├── app/         # 13 pages (/, /shop, /shop/[slug], /cart,
│   │       │                #   /checkout/address, /checkout/address/new,
│   │       │                #   /account/addresses, /account/addresses/[id],
│   │       │                #   /checkout/review, /order-success,
│   │       │                #   /orders, /orders/[id], /account)
│   │       ├── components/  # Header, BottomNav
│   │       └── lib/         # API client, cart context, theme context
│   ├── api/                 # NestJS backend
│   │   ├── src/modules/     # 9 active modules (see below)
│   │   ├── src/config/      # Startup environment validation
│   │   ├── prisma/          # Schema + migrations (18 tables) + seed data
│   │   └── test/
│   └── admin/               # Next.js admin panel
│       └── src/
│           ├── app/         # Dashboard, Catalog, Categories, Inventory, Orders
│           ├── components/  # Sidebar
│           └── services/    # API client
├── packages/
│   └── shared/              # Enums, constants (state machine), types, utils
│                            #   (built into dist/ by `npm install`)
├── docs/
│   ├── architecture/
│   │   ├── HLD.md           # High-Level Design
│   │   ├── LLD.md           # Low-Level Design (modules, DTOs, state machines)
│   │   ├── database-design.md  # 18 tables, ER diagram, constraints
│   │   └── deployment-plan-pilot.md  # Hosting, costs, environment variables
│   └── operations/
│       └── runbook-pilot.md      # Deploy, undo, change the database, troubleshoot (the one pilot environment)
│   ├── design/
│   │   └── ui-specification.md  # Design system, components, screens, theming
│   └── api/
│       └── openapi.yaml     # OpenAPI 3.0 spec (implemented + planned endpoints)
├── .github/workflows/ci.yml # CI: API, Web, Admin, Mobile jobs
├── docker-compose.yml       # Local PostgreSQL
├── package.json             # Workspace root
└── tsconfig.base.json
```

## Architecture

### Backend Modules

| Module | Status | Responsibility |
|--------|--------|---------------|
| Auth | ✅ Active | OTP send/verify, JWT sessions, mock OTP provider |
| Users | ✅ Active | Customer profile (GET/PATCH /me) |
| Addresses | ✅ Active | Delivery address CRUD, default management, max 10 |
| Categories | ✅ Active | Product category listing + admin CRUD |
| Products | ✅ Active | Catalog with search/filter/sort + admin CRUD |
| Inventory | ✅ Active | Stock tracking, atomic `SELECT FOR UPDATE` reservations, expiry cron |
| Cart | ✅ Active | Server-side cart, live pricing, availability warnings |
| Wishlist | ✅ Active | Saved items per colour; the shop hearts are per saree; unpublished items are flagged, not listed as buyable |
| Checkout | ✅ Active | Quote calculation, atomic order placement transaction |
| Orders | ✅ Active | 12-state machine, customer/admin views, cancellation |
| Media | ✅ Active | Product photos: upload through the API, checked and shrunk (Sharp, WebP), kept in Cloudflare R2 (a local folder in development), gallery on the website and in the app |
| Payments | 🔲 Phase 4 | Gateway integration, webhook verification, refunds |
| Admin | 🔲 Phase 5 | Extended RBAC, reports |

### Database (18 tables)

`users` · `addresses` · `categories` · `products` · `product_variants` · `product_media` · `inventory` · `inventory_reservations` · `cart_items` · `orders` · `order_items` · `payments` · `shipments` · `returns` · `refunds` · `admin_users` · `audit_events` · `webhook_events`

### API (51 implemented endpoints, 10 more planned)

Public (catalog, auth, delivery check) · Customer (cart, checkout, orders, addresses, wishlist, profile) · Admin (catalog CRUD, product photos, inventory, orders). Planned: payments and webhooks (Phase 4), reports and admin users (Phase 5).

Full spec: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)

## Design Patterns

- **Modular monolith** — single deployable API with clear module boundaries
- **Thin controllers, fat services** — business logic in services, not controllers
- **DTO validation at boundary** — `class-validator` on every request
- **Integer paise** — all money as integers (100 paise = ₹1), no floats
- **Server authority** — prices, totals, shipping calculated server-side
- **Atomic inventory** — `SELECT FOR UPDATE` + Prisma interactive transactions
- **Snapshot pattern** — order items freeze price/title/address at purchase time
- **Idempotent order placement** — deduplicated by client-generated idempotency key
- **State machine enforcement** — server validates every order status transition
- **Audit trail** — every admin mutation logged with actor + before/after state
- **RBAC guards** — owner bypasses all, role-specific access for others
- **Stock lifecycle** — placing an order reserves units; confirming commits the hold; shipping takes the units off `on_hand` and releases the hold; cancelling (while placed or confirmed) gives the units back. A cron job expires only non-COD holds, every minute

## Theming (Light / Dark Mode)

Both apps start in light mode; the user's choice is remembered under the key `juhar_theme` (AsyncStorage on mobile, `localStorage` on web).

- **Admin** — plain CSS variables in `globals.css`; `:root[data-theme='dark']` swaps their values. A button in the top bar (`components/ThemeToggle.tsx`) switches it, `components/theme.ts` reads and saves the choice under `juhar_admin_theme`, and a small script in `layout.tsx` applies it before the first paint. New admin CSS should use the variables (`--bg-card`, `--text-primary`, `--maroon-text` for brand-coloured text, the `--badge-*` pairs for status colours), never a literal hex.
- **Mobile** — `src/theme/colors.ts` defines `lightColors` and `darkColors` with identical keys. Components call `const { colors, isDark, toggleTheme } = useTheme()` and build styles with `createStyles(colors)` inside `useMemo`, so styles update when the theme changes.
- **Web** — colours are CSS variables holding RGB channels (for example `--color-surface: 30 30 30`) defined in `globals.css` under `:root` and `.dark`. `tailwind.config.ts` maps each name to `rgb(var(--color-…) / <alpha-value>)`, so opacity classes such as `bg-surface/80` work in both themes. `ThemeProvider` (`src/lib/theme-context.tsx`) toggles the `dark` class on `<html>`, an inline script in `layout.tsx` applies the saved theme before first paint, and the browser's `theme-color` follows the toggle.
- **Rule of thumb** — for anything that holds text, use semantic tokens (`bg-surface`, `text-text-primary`), not `bg-white` or hard-coded hex values. A fixed white is only safe on coloured fills, such as text on `bg-primary`.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs four jobs in parallel on Node 22:

| Job | What it checks |
|-----|----------------|
| API | Install, Prisma generate, apply migrations and check the schema matches them (against a Postgres service), typecheck (shared + API), tests, build |
| Web | Typecheck, tests and `next build` |
| Admin | Typecheck, tests and `next build` |
| Mobile | `npm ci` inside `apps/mobile` (it is not an npm workspace), then typecheck and tests |

It runs on pushes to `main` and `develop-*`, on pull requests into `main`, and manually from the Actions tab. A newer push cancels the older run on the same branch. A fifth job named `build` is a gate that depends on the other four and fails unless they all pass.

`main` is protected by a repository ruleset (`main-protection`): changes must come through a pull request with 1 approving review and a passing `build` check, and `main` cannot be deleted or force-pushed. The gate job exists because the ruleset requires a check with exactly that name; if you rename or remove it, pull requests can no longer be merged until the ruleset is updated.

To run the same checks locally:

```bash
npm run typecheck -w apps/web && npm test -w apps/web && npm run build -w apps/web
npm run typecheck -w apps/admin && npm test -w apps/admin && npm run build -w apps/admin
npm run typecheck -w apps/api
(cd apps/mobile && npm run typecheck && npm test)
```

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 0 — Design | HLD, DB design, LLD, OpenAPI spec | ✅ Complete |
| 1 — Foundations | Monorepo, NestJS skeleton, Prisma schema, Expo shell, CI | ✅ Complete |
| 2 — Catalog | Auth, categories, products, admin + mobile screens | ✅ Complete |
| 3 — Cart & Checkout | Addresses, inventory, cart, checkout, orders, mobile + admin UI | ✅ Complete |
| 3.5 — Hardening | Fix the [Known Issues](#known-issues--technical-debt): stock settlement, token refresh, rate limiting, order numbers, tests | 🔶 In progress |
| 4 — Payments | Gateway integration, webhooks, refunds, UPI flow | 🔲 After 3.5 |
| 5 — Launch Prep | Images, reports, notifications, real data, deploy | 🔲 Planned |

## Getting Started

### Prerequisites

<details>
<summary><strong>macOS</strong></summary>

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 22.x | `brew install node@22` |
| PostgreSQL | 16.x | `brew install postgresql@16 && brew services start postgresql@16` |
| Docker (optional) | Latest | `brew install --cask docker` |

</details>

<details>
<summary><strong>Windows</strong></summary>

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 22.x | Download from [nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS.LTS` |
| PostgreSQL | 16.x | Download from [postgresql.org](https://www.postgresql.org/download/windows/) (includes pgAdmin) |
| Docker (optional) | Latest | Download [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Git | Latest | Download from [git-scm.com](https://git-scm.com/download/win) or `winget install Git.Git` |

**Windows notes:**
- Use **PowerShell 7+** or **Git Bash** (not Command Prompt) for all commands below
- PowerShell 7+: Install via `winget install Microsoft.PowerShell`
- Git Bash: Included with Git for Windows
- All `npm`, `npx`, `node` commands work the same on Windows
- If using PowerShell 5.x (default), replace `&&` with `;` in chained commands

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 22.x | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash - && sudo apt install -y nodejs` |
| PostgreSQL | 16.x | `sudo apt install postgresql-16` |
| Docker (optional) | Latest | [docs.docker.com/engine/install](https://docs.docker.com/engine/install/ubuntu/) |

</details>

### 1. Clone the repo

```bash
git clone git@github.com:nikhilnanda47/juhar-app.git
cd juhar-app
```

> **Windows SSH note:** If SSH is not set up, use HTTPS instead:
> ```bash
> git clone https://github.com/nikhilnanda47/juhar-app.git
> ```

### 2. Set up the database

**Option A — Local PostgreSQL (recommended):**

<details>
<summary><strong>macOS / Linux</strong></summary>

```bash
psql postgres -c "CREATE USER juhar WITH PASSWORD 'juhar_dev_password' CREATEDB;"
psql postgres -c "CREATE DATABASE juhar_dev OWNER juhar;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE juhar_dev TO juhar;"
```

**Linux (apt):** `psql postgres` fails for your normal user ("role ... does not exist"). Run the same three commands as the `postgres` user instead, for example:

```bash
sudo -u postgres psql -c "CREATE USER juhar WITH PASSWORD 'juhar_dev_password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE juhar_dev OWNER juhar;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE juhar_dev TO juhar;"
```

</details>

<details>
<summary><strong>Windows</strong></summary>

Open **pgAdmin** (installed with PostgreSQL) or **psql** from Start Menu:

```sql
-- In psql (connect as postgres user):
psql -U postgres

-- Then run:
CREATE USER juhar WITH PASSWORD 'juhar_dev_password' CREATEDB;
CREATE DATABASE juhar_dev OWNER juhar;
GRANT ALL PRIVILEGES ON DATABASE juhar_dev TO juhar;
\q
```

Or use **pgAdmin GUI:**
1. Open pgAdmin → right-click "Login/Group Roles" → Create → Login/Group Role
2. Name: `juhar`, Password: `juhar_dev_password`, Privileges: Can login + Create databases
3. Right-click "Databases" → Create → Database, Name: `juhar_dev`, Owner: `juhar`

</details>

**Option B — Docker (all platforms):**

```bash
docker compose up -d
```

This starts only PostgreSQL (same user, password and database name as Option A). The apps themselves still run with `npm`, as in step 7.

### 3. Install dependencies

```bash
# Root workspace (API, web, admin, shared).
# Also builds packages/shared into dist/ automatically (postinstall).
npm install

# Mobile app (separate — Expo requires isolated node_modules)
cd apps/mobile
npm install
cd ../..
```

> **Windows PowerShell 5.x:** Use `cd apps\mobile` then `npm install` then `cd ..\..` (separate commands)

### 4. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Defaults work for local dev
```

The API checks its environment at startup and refuses to start, naming the variable, if `DATABASE_URL`, `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing. **Product photos** need no setup locally: uploads are kept in `apps/api/uploads` (git-ignored) and the API serves them at `http://localhost:3000/media`. After pulling the photo feature run `npm install` once (it adds `sharp`, the image library, and the Cloudflare R2 client). If the API runs behind a proxy (Railway, nginx), set `TRUST_PROXY` to the number of proxies in front of it (for example `1`); otherwise the rate limits see every customer as the proxy's address. Leave it unset for local development. If you set `CORS_ORIGINS`, it **replaces** the built-in list, so include every app that calls the API: web (`http://localhost:3001`), admin (`http://localhost:3002`) and the mobile web preview (`http://localhost:8081`).

> **Windows (if `cp` not available):**
> ```powershell
> Copy-Item apps\api\.env.example apps\api\.env
> ```

### 5. Run database migrations + seed

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts    # Seeds 4 categories, 8 products, 11 variants, 1 admin
cd ../..
```

**Optional: more demo data for testing.** The normal seed has only 8 products, which is too few to see "Load more", sorting, the Low Stock count or the Overdue flag. On a local or test database you can add more:

```bash
npm run db:seed:demo                           # 60 sarees (weaves, colours, 1 to 3 variants each)
npm run db:seed:demo -- --products 120         # a different number
npm run db:seed:demo -- --orders 55            # also a demo customer (+919000000099) with 55 orders
npm run db:seed:demo -- --clean                # remove everything this script added
```

It is safe to run again (it skips what exists) and it refuses to run with `NODE_ENV=production`. The sarees mix every case on purpose: about 1 in 6 is a draft and 1 in 20 archived, stock cycles through none, 1 to 3 (low stock), ordinary and plenty, some variants are retired, and prices run from about ₹1,200 to ₹18,000 so some carts pass the free-shipping amount. The demo orders have 1 to 3 items in every status (some placed more than a day ago, so they show as overdue; a few are from today). To see those orders as the customer, log in with phone `9000000099` and OTP `123456`. The orders are plain records: stock is not deducted for them.

> **If `prisma migrate deploy` fails with a message starting "Cannot add the CHECK constraints":** some rows already in your database break a rule (for example stock reserved beyond what is on hand). The message lists each problem and the `SELECT` that finds the rows; nothing was changed. Fix or delete those rows, then run `npx prisma migrate resolve --rolled-back 20261122150000_check_constraints` (Prisma refuses to continue after a failed migration until you do) and `npx prisma migrate deploy` again. If you do not need the data, `npx prisma migrate reset` rebuilds the local database from scratch (it deletes everything, so then run the seed again).

> **If `prisma migrate dev` fails with `P3014` ("could not create the shadow database"):** your database user is not allowed to create databases, and `migrate dev` needs that to compare migrations against a temporary database. To apply existing migrations, use `npx prisma migrate deploy` instead (it needs no extra permission). To create new migrations yourself, grant the permission once: `psql postgres -c "ALTER USER juhar CREATEDB;"` (run as your Postgres superuser).

### 6. The shared package

`npm install` (step 3) already builds `packages/shared` into `packages/shared/dist/`, which the API reads. After you edit anything under `packages/shared/src`, rebuild it and restart the API:

```bash
npm run build -w packages/shared      # one-off
npm run dev -w packages/shared        # or keep rebuilding on change
```

### 7. Start development servers

Open **5 terminals** (or terminal tabs) to run everything:

```bash
# Terminal 1 — API Backend (localhost:3000)
cd apps/api
npm run dev

# Terminal 2 — Customer Website (localhost:3001)
cd apps/web
npm run dev

# Terminal 3 — Admin Panel (localhost:3002)
cd apps/admin
npm run dev

# Terminal 4 — Mobile App (localhost:8081)
cd apps/mobile
npx expo start --web

# Terminal 5 — Prisma Studio (localhost:5555)
cd apps/api
npx prisma studio
```

**Quick start (from project root):**

```bash
# Start API
npm run dev:api

# Start Website
npm run dev:web

# Start Admin
npm run dev:admin

# Start Mobile App
cd apps/mobile && npx expo start --web

# Start Prisma Studio
cd apps/api && npx prisma studio
```

The API, website and admin panel are covered by the root `npm install` in step 3; the mobile app needs its own (`apps/mobile`).

> **Mobile app:** it runs in the browser preview at `localhost:8081`. A phone or Expo Go cannot reach `localhost` on your computer, and the API address is a setting of the build, `EXPO_PUBLIC_API_URL` (see `apps/mobile/.env.example`): unset in development means `http://localhost:3000`, and a release build (the `pilot` and `production` profiles in `apps/mobile/eas.json`) refuses to run without a real `https://` address. To try the preview against another server, start it with `EXPO_PUBLIC_API_URL=https://your-api npx expo start --web`.

### 8. Test login

- **Website**: `localhost:3001/account` → `+919876543210` → OTP `123456`
- **Mobile App**: Account tab → `+919876543210` → OTP `123456`
- **Admin Panel**: `localhost:3002` → same phone/OTP
- Dev mode always accepts OTP `123456`
- The seeded admin is `+919876543210`. Any other Indian mobile number (`+91` then 10 digits starting 6 to 9) signs in as a new customer.
- OTP login is rate limited: 3 OTP requests and 5 verify attempts per phone number per 10 minutes. If you see "Too many attempts. Please wait a few minutes and try again", wait, or restart the API (the counters are in its memory).

### Reading the API logs

Every request gets one ID. It is in the `requestId` of the reply, in the `X-Request-Id` response header, and at the start of every log line for that request as `req=<id>`. To follow one request, search the API's terminal (or the Railway logs) for that ID:

```
LOG  [HTTP] req=bf1fd942-... POST /api/v1/orders 201 23ms user=6e7e4675-...
LOG  [CheckoutService] req=bf1fd942-... order placed JUH-20261123-0096 total=₹1,599 items=1 payment=cod user=6e7e4675-...
WARN [HTTP] req=84f9f661-... POST /api/v1/orders 409 12ms user=6e7e4675-... code=INSUFFICIENT_STOCK
```

**From a customer to the log.** When something fails in the web or mobile app (sign-in, saving an address, adding to the bag, placing an order), the error message has a small `Reference: <id>` line with a Copy button. Ask the customer for it and search the logs for `req=<id>`. To find out who a log line's `user=<id>` is, open the admin Orders page: each order shows the customer's user id (first 8 characters, with a Copy button that copies the whole id).

Successful requests are normal lines, client mistakes (wrong OTP, bad input, unknown page) are warnings without a stack trace, and real failures (500) are errors with the stack. Phone numbers are masked (`+91******3210`) and tokens, request bodies, addresses and query strings are never logged. Set `LOG_LEVEL` in `apps/api/.env` to `error`, `warn`, `log` (default), `debug` or `verbose` to change how much is written; in production the lines have no colour codes. The apps do not show the request ID to customers yet.

### After you `git pull`

Check what changed (`git diff HEAD@{1} --stat`), then use this table. Dev servers can stay running unless the first row applies.

| If the pull changed… | Do this | Restart |
|----------------------|---------|---------|
| Dependencies (`package.json`, `package-lock.json`) | Stop the dev servers, run `npm install` at the root (and in `apps/mobile` if its `package.json` changed) | Everything you stopped |
| `packages/shared/src` | `npm run build -w packages/shared` | API |
| `apps/api/prisma/schema.prisma` or a new migration | `cd apps/api && npx prisma migrate deploy && npx prisma generate` (applies the new migrations; safe to run when nothing is pending) | API and Prisma Studio |
| `apps/api/.env.example` (new variables) | Copy the new variables into your own `apps/api/.env` | API |
| `tsconfig.json`, `next.config.js`, `tailwind.config.ts` or `layout.tsx` in `apps/web` / `apps/admin` | — | That app's dev server |
| Source files only in `apps/web`, `apps/admin`, `apps/mobile` | — | Nothing (hot reload) |
| Docs or CI files only | — | Nothing |

### Working on a change

`main` is protected: nobody pushes to it directly. Work on your own branch and open a pull request.

1. Create a branch named `develop-<yourname>` (CI runs on every push to `main` and `develop-*`): `git checkout -b develop-<yourname>`
2. Push it with `git push -u origin develop-<yourname>` and open a pull request into `main`.
3. The pull request needs **1 approving review** and a passing `build` check (the CI gate job). History on `main` must stay linear, so merge with **Squash and merge** or **Rebase and merge**, not a plain merge commit.
4. After a squash merge, bring `main` back into your branch so your next pull request only shows new work: `git checkout develop-<yourname> && git pull origin main`, then `git push`.

### Useful commands

| Command | Where to run | Description |
|---------|-------------|-------------|
| `npm run dev:api` | Root | Start API backend |
| `npm run dev:web` | Root | Start customer website |
| `npm run dev:admin` | Root | Start admin panel |
| `cd apps/mobile && npx expo start --web` | Root | Start mobile app (web preview) |
| `cd apps/api && npx prisma studio` | Root | Visual database browser |
| `cd apps/api && npx prisma migrate deploy` | Root | Apply migrations that already exist (use this after `git pull`; no extra database permission needed) |
| `cd apps/api && npx prisma migrate dev --name <name>` | Root | Create a new migration (needs the database user to be allowed to create databases, see the `P3014` note in step 5) |
| `cd apps/api && npx prisma generate` | Root | Regenerate Prisma client |
| `cd apps/api && npx ts-node prisma/seed.ts` | Root | Re-seed database (refuses unless the database is on this computer) |
| `npm run db:create-admin -w apps/api -- --phone +91… --name "…"` | Root | Create or update an admin account (the way to make the first admin on a live database) |
| `npm run db:migrate:deploy -w apps/api` | Root | What a release runs: apply migrations through `DIRECT_URL` when it is set |
| `npm run rehearse:deploy` | Root | Dry run of the Railway and Vercel steps from a clean copy (see the runbook) |
| `npm run smoke -- --api https://… --web https://… --admin https://…` | Root | After-deploy check of a live environment: health, database, shop, closed login, pages, API address and CORS (reads only; see the runbook) |
| `npm run db:seed:demo -- --products 60 --orders 55` | Root | Add demo sarees and orders for testing long lists (`-- --clean` removes them) |
| `psql -U juhar -d juhar_dev` | Anywhere | Connect to database CLI |
| `cd apps/mobile && npx expo start --web --clear` | Root | Mobile with cleared cache |
| `npm run build -w packages/shared` | Root | Rebuild the shared package after editing it |
| `npm run typecheck -w apps/web` (or `apps/admin`, `apps/api`) | Root | Typecheck one app |
| `npm test -w apps/api` | Root | Run the API unit tests (Jest, no database needed) |
| `npm test -w apps/admin` | Root | Run the admin unit tests (Jest) |
| `npm test -w apps/web` | Root | Run the website unit tests (Jest) |
| `cd apps/mobile && npm test` | Root | Run the mobile unit tests (Jest) |
| `npm test` | Root | Run the API, admin and website tests together (mobile has its own, above) |
| `cd apps/api && DB_TESTS=1 npm test -- check-constraints` | Root | Also run the database tests against your migrated local database (they roll back and leave no data). With `DB_TESTS=1` the test files run one at a time, because several count rows over the whole table and would disturb each other in parallel |
| `npm run build:web` | Root | Production build of the website (catches errors dev mode hides) |

### Service ports

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| API Backend | 3000 | http://localhost:3000 | NestJS REST API |
| Swagger Docs | 3000 | http://localhost:3000/api/docs | Interactive API documentation (off when `NODE_ENV=production`) |
| Customer Website | 3001 | http://localhost:3001 | Next.js storefront |
| Admin Panel | 3002 | http://localhost:3002 | Next.js admin dashboard |
| Mobile App (Web) | 8081 | http://localhost:8081 | Expo web preview |
| Prisma Studio | 5555 | http://localhost:5555 | Visual database browser |
| PostgreSQL | 5432 | — | Database |

## Documentation

| Document | Description |
|----------|-------------|
| [HLD](docs/architecture/HLD.md) | System architecture, 13 mobile screens + 11 web pages, tech decisions |
| [Database Design](docs/architecture/database-design.md) | 18 tables, ER diagram, constraints, indexes |
| [LLD](docs/architecture/LLD.md) | Module designs, DTOs, state machines, navigation tree |
| [Deployment Plan](docs/architecture/deployment-plan-pilot.md) | Hosting choices, costs, production environment variables |
| [Pilot Runbook](docs/operations/runbook-pilot.md) | Where everything lives, first deploy step by step, every release, undoing a deploy, safe database changes, troubleshooting |
| [UI Specification](docs/design/ui-specification.md) | Design system, components, screen designs, light/dark theming |
| [OpenAPI Spec](docs/api/openapi.yaml) | 51 implemented + 10 planned REST operations with full schemas (planned ones are marked `x-status: planned`) |
| [UI/UX Designs](https://drive.google.com/drive/folders/1VGF8a_wP-hkXg4s66_ixaiOxPvS10jpX?usp=sharing) | Mobile app screen designs |

## Guiding Principles

> Trust before novelty. Accurate inventory before growth. Real product evidence before marketing claims. Server authority over client inputs. Explicit policy over invented behavior. Measured customer demand before expensive infrastructure.

## License

Proprietary — All rights reserved.
