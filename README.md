# Juhar

**Digital-first Sambalpuri fashion brand — Western Odisha to India.**

Juhar is an own-brand, direct-to-consumer (D2C) Sambalpuri fashion e-commerce platform. Local manufacturing and weaving partners supply products; Juhar owns customer experience, merchandising, quality, digital commerce, order support and brand identity.

## Pilot Scope (P0)

- **Catalog**: Browse, search, filter sarees by fabric/weave/price/color
- **Cart & Checkout**: Server-calculated pricing, address capture, serviceability check
- **Payments**: Cash on Delivery (COD); UPI planned for Phase 4
- **Inventory**: Atomic stock reservations with row-level locking, expiry cron
- **Orders**: Full lifecycle — placed → confirmed → packed → shipped → delivered + cancellation
- **Admin**: Catalog CRUD, inventory view, order management with state machine, dashboard
- **Audience**: Sambalpur & Western Odisha, ~20–30 designs, 5–6 pieces each

## Current Status

> Status as of 2026-11-22. Open bugs and technical debt are listed under [Known Issues](#known-issues--technical-debt).

### Customer App (Mobile) — 24 features working

| # | Feature | Status |
|---|---------|--------|
| 1 | Splash screen with branded animation | ✅ |
| 2 | Welcome onboarding (3-slide carousel, first launch only) | ✅ |
| 3 | Home screen — hero, collections grid, new arrivals from API | ✅ |
| 4 | Explore catalog — category chips, 2-column product grid | ✅ |
| 5 | Filter products by category | ✅ |
| 6 | Product detail — price, variants, PIN check, specs, delivery info | ✅ |
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

### Customer Website (Web) — 11 pages + dark mode

| # | Feature | Status |
|---|---------|--------|
| 1 | Home — hero banner, collections, new arrivals | ✅ |
| 2 | Shop — search, category filters, product grid (responsive 2–5 cols) | ✅ |
| 3 | Product detail — variants, PIN check, add to bag, related products | ✅ |
| 4 | Guest cart — add items without login (localStorage) | ✅ |
| 5 | Cart — stepper, price breakdown, checkout redirect | ✅ |
| 6 | Cart badge count on header + bottom nav | ✅ |
| 7 | Select address — 2-col grid, delivery estimate, sticky sidebar | ✅ |
| 8 | Add address — numbered sections, live preview, label cards | ✅ |
| 9 | Order review — place order (COD) | ✅ |
| 10 | Orders — table layout (desktop), card layout (mobile), filter chips; order detail handles cancelled, return and refund states | ✅ |
| 11 | Account — split-panel login, profile with sidebar (desktop) | ✅ |
| 12 | Light / dark mode — toggle in the desktop header and the Account menu; choice is remembered, no flash on load | ✅ |

### Admin Panel (Web) — 14 features working

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

### Not Yet Built

| Feature | Planned Phase |
|---------|--------------|
| Real OTP/SMS provider (login currently uses a mock that accepts `123456`) | Before launch |
| Admin: cancel an order (UI + cancellation reason) | Phase 3.5 |
| Dark mode for the admin panel; follow the device's light/dark setting | Post-pilot |
| Real product images (using placeholders) | Phase 5 |
| UPI/online payment | Phase 4 |
| Text search | Phase 5 |
| Product edit page (admin) | Phase 5 |
| Manual stock adjustment UI (admin) | Phase 5 |
| Admin order detail page | Phase 5 |
| Customer lookup (admin) | Phase 5 |
| Reports (GMV, top products, stock) | Phase 5 |
| Admin user management / roles | Phase 5 |
| Refund initiation | Phase 4 |
| Wishlist | Post-pilot |
| Push notifications / SMS updates | Phase 5 |
| WhatsApp support integration | Phase 5 |
| No internet / force update screens | Phase 5 |

## Known Issues & Technical Debt

Open items as of 2026-11-22, grouped by urgency. The team tracker holds owners and deadlines; this list is the code-level summary.

### Security and reliability — fix before real users
- **Mock login.** OTP login uses a mock provider that always accepts `123456`, so anyone can sign in as any phone number, including the seeded admin. The `OTP_PROVIDER` environment variable is not read yet, and OTP codes are kept in server memory (lost on restart, not shared across instances).
- **Rate limiting is not enforced.** The throttler is configured, and the OTP endpoint is annotated, but no throttler guard is registered.
- **Sessions end after 15 minutes.** Web, mobile and admin store the refresh token but never call `/auth/refresh`.
- **Stock does not settle.** Reservations are never committed and `on_hand` is not decremented when an order ships, while the expiry job releases held reservations (24 hours for COD) even for live orders. This risks overselling.

### Orders and catalog
- **Order numbers.** Generated from `count() + 1`, which can collide under concurrent orders, and still use the prefix `SAJ-` (the design specifies `JUH-`).
- **Price sorting** (`price_asc` / `price_desc`) only sorts within each page of results.
- **Cancellations.** Customer cancellations write no audit event. Admins cannot cancel from the admin panel, and the API stores no cancellation reason for admin cancels.
- **Support number.** The "Need help?" link on the web order page uses a placeholder WhatsApp number (WhatsApp integration is pending).
- **Database `CHECK` constraints** described in `docs/architecture/database-design.md` (non-negative stock, positive quantities) are not in the migration; they are enforced in application code only.

### Dark mode follow-ups
- Web: visitors who are logged out on a phone-width screen have no theme toggle (the header toggle is desktop-only and the Account menu only appears after login).
- Both apps always start in light mode and ignore the device setting; the admin panel has no dark mode.
- A few mobile screens (product detail, welcome) use fixed colours that need a visual check in dark mode.

### Engineering hygiene
- Test coverage is just starting: the order state machine and stock reservation (reserve, release, adjust, expiry job) have tests (`npm test -w apps/api`). Checkout totals and the rest of the API are not covered yet. The reservation tests use a fake database, so they cannot prove real concurrent locking; that needs a test against Postgres.
- No ESLint configuration, so the `lint` scripts do not run.
- Some mobile and web screens call the API with raw `fetch` and their own copy of `API_BASE` instead of the shared API client.
- The cart badge polls the server every 2–3 seconds.
- The shipping rate and free-shipping threshold are duplicated between the API and the mobile cart screen.
- `apps/mobile/src/navigation/TabNavigator.tsx` has `@ts-nocheck`.

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
│   │       ├── screens/     # 13 screens (Splash, Welcome, Home, Explore,
│   │       │                #   ProductDetail, Cart, SelectAddress, AddAddress,
│   │       │                #   OrderReview, OrderSuccess, Orders, OrderDetail, Profile)
│   │       ├── navigation/  # Tab (5 tabs) + Stack navigators
│   │       ├── services/    # API client, local guest cart
│   │       ├── components/  # AnimatedUI, RefreshButton
│   │       └── theme/       # Design tokens + dark mode (light/dark colors,
│   │                        #   ThemeContext, typography, spacing)
│   ├── web/                 # Next.js customer website (responsive)
│   │   └── src/
│   │       ├── app/         # 11 pages (/, /shop, /shop/[slug], /cart,
│   │       │                #   /checkout/address, /checkout/address/new,
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
| Checkout | ✅ Active | Quote calculation, atomic order placement transaction |
| Orders | ✅ Active | 12-state machine, customer/admin views, cancellation |
| Media | 🔲 Phase 5 | S3 signed uploads, thumbnail generation |
| Payments | 🔲 Phase 4 | Gateway integration, webhook verification, refunds |
| Admin | 🔲 Phase 5 | Extended RBAC, reports |

### Database (18 tables)

`users` · `addresses` · `categories` · `products` · `product_variants` · `product_media` · `inventory` · `inventory_reservations` · `cart_items` · `orders` · `order_items` · `payments` · `shipments` · `returns` · `refunds` · `admin_users` · `audit_events` · `webhook_events`

### API (35 implemented endpoints, 14 more planned)

Public (catalog, auth) · Customer (cart, checkout, orders, addresses, profile) · Admin (catalog CRUD, inventory, orders). Planned: payments and webhooks (Phase 4), media uploads, reports and admin users (Phase 5).

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
- **Reservation expiry** — cron releases held stock every minute

## Theming (Light / Dark Mode)

Both apps start in light mode; the user's choice is remembered under the key `juhar_theme` (AsyncStorage on mobile, `localStorage` on web).

- **Mobile** — `src/theme/colors.ts` defines `lightColors` and `darkColors` with identical keys. Components call `const { colors, isDark, toggleTheme } = useTheme()` and build styles with `createStyles(colors)` inside `useMemo`, so styles update when the theme changes.
- **Web** — colours are CSS variables holding RGB channels (for example `--color-surface: 30 30 30`) defined in `globals.css` under `:root` and `.dark`. `tailwind.config.ts` maps each name to `rgb(var(--color-…) / <alpha-value>)`, so opacity classes such as `bg-surface/80` work in both themes. `ThemeProvider` (`src/lib/theme-context.tsx`) toggles the `dark` class on `<html>`, an inline script in `layout.tsx` applies the saved theme before first paint, and the browser's `theme-color` follows the toggle.
- **Rule of thumb** — for anything that holds text, use semantic tokens (`bg-surface`, `text-text-primary`), not `bg-white` or hard-coded hex values. A fixed white is only safe on coloured fills, such as text on `bg-primary`.

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs four jobs in parallel on Node 22:

| Job | What it checks |
|-----|----------------|
| API | Install, Prisma generate, typecheck (shared + API), tests, build — with a Postgres service |
| Web | Typecheck and `next build` |
| Admin | Typecheck and `next build` |
| Mobile | `npm ci` inside `apps/mobile` (it is not an npm workspace), then typecheck |

It runs on pushes to `main` and `develop-*`, on pull requests into `main`, and manually from the Actions tab. A newer push cancels the older run on the same branch. A fifth job named `build` is a gate that depends on the other four and fails unless they all pass.

`main` is protected by a repository ruleset (`main-protection`): changes must come through a pull request with 1 approving review and a passing `build` check, and `main` cannot be deleted or force-pushed. The gate job exists because the ruleset requires a check with exactly that name; if you rename or remove it, pull requests can no longer be merged until the ruleset is updated.

To run the same checks locally:

```bash
npm run typecheck -w apps/web && npm run build -w apps/web
npm run typecheck -w apps/admin && npm run build -w apps/admin
npm run typecheck -w apps/api
(cd apps/mobile && npm run typecheck)
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

The API checks its environment at startup and refuses to start, naming the variable, if `DATABASE_URL`, `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing. If you set `CORS_ORIGINS`, it **replaces** the built-in list, so include every app that calls the API: web (`http://localhost:3001`), admin (`http://localhost:3002`) and the mobile web preview (`http://localhost:8081`).

> **Windows (if `cp` not available):**
> ```powershell
> Copy-Item apps\api\.env.example apps\api\.env
> ```

### 5. Run database migrations + seed

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npx ts-node prisma/seed.ts    # Seeds 4 categories, 8 products, 11 variants, 1 admin
cd ../..
```

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
npm install        # first time only
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

### 8. Test login

- **Website**: `localhost:3001/account` → `+919876543210` → OTP `123456`
- **Mobile App**: Account tab → `+919876543210` → OTP `123456`
- **Admin Panel**: `localhost:3002` → same phone/OTP
- Dev mode always accepts OTP `123456`

### After you `git pull`

Check what changed (`git diff HEAD@{1} --stat`), then use this table. Dev servers can stay running unless the first row applies.

| If the pull changed… | Do this | Restart |
|----------------------|---------|---------|
| Dependencies (`package.json`, `package-lock.json`) | Stop the dev servers, run `npm install` at the root (and in `apps/mobile` if its `package.json` changed) | Everything you stopped |
| `packages/shared/src` | `npm run build -w packages/shared` | API |
| `apps/api/prisma/schema.prisma` or a new migration | `cd apps/api && npx prisma migrate dev && npx prisma generate` | API and Prisma Studio |
| `apps/api/.env.example` (new variables) | Copy the new variables into your own `apps/api/.env` | API |
| `tsconfig.json`, `next.config.js`, `tailwind.config.ts` or `layout.tsx` in `apps/web` / `apps/admin` | — | That app's dev server |
| Source files only in `apps/web`, `apps/admin`, `apps/mobile` | — | Nothing (hot reload) |
| Docs or CI files only | — | Nothing |

### Useful commands

| Command | Where to run | Description |
|---------|-------------|-------------|
| `npm run dev:api` | Root | Start API backend |
| `npm run dev:web` | Root | Start customer website |
| `npm run dev:admin` | Root | Start admin panel |
| `cd apps/mobile && npx expo start --web` | Root | Start mobile app (web preview) |
| `cd apps/api && npx prisma studio` | Root | Visual database browser |
| `cd apps/api && npx prisma migrate dev --name <name>` | Root | Create new migration |
| `cd apps/api && npx prisma generate` | Root | Regenerate Prisma client |
| `cd apps/api && npx ts-node prisma/seed.ts` | Root | Re-seed database |
| `psql -U juhar -d juhar_dev` | Anywhere | Connect to database CLI |
| `cd apps/mobile && npx expo start --web --clear` | Root | Mobile with cleared cache |
| `npm run build -w packages/shared` | Root | Rebuild the shared package after editing it |
| `npm run typecheck -w apps/web` (or `apps/admin`, `apps/api`) | Root | Typecheck one app |
| `npm test -w apps/api` | Root | Run the API unit tests (Jest, no database needed) |
| `npm run build:web` | Root | Production build of the website (catches errors dev mode hides) |

### Service ports

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| API Backend | 3000 | http://localhost:3000 | NestJS REST API |
| Swagger Docs | 3000 | http://localhost:3000/api/docs | Interactive API documentation |
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
| [UI Specification](docs/design/ui-specification.md) | Design system, components, screen designs, light/dark theming |
| [OpenAPI Spec](docs/api/openapi.yaml) | 35 implemented + 14 planned REST operations with full schemas (planned ones are marked `x-status: planned`) |
| [UI/UX Designs](https://drive.google.com/drive/folders/1VGF8a_wP-hkXg4s66_ixaiOxPvS10jpX?usp=sharing) | Mobile app screen designs |

## Guiding Principles

> Trust before novelty. Accurate inventory before growth. Real product evidence before marketing claims. Server authority over client inputs. Explicit policy over invented behavior. Measured customer demand before expensive infrastructure.

## License

Proprietary — All rights reserved.
