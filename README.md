# Sajani

**Digital-first Sambalpuri fashion brand — Western Odisha to India.**

Sajani is an own-brand, direct-to-consumer (D2C) Sambalpuri fashion e-commerce platform. Local manufacturing and weaving partners supply products; Sajani owns customer experience, merchandising, quality, digital commerce, order support and brand identity.

## Pilot Scope (P0)

- **Catalog**: Browse, search, filter sarees by fabric/weave/price/color
- **Cart & Checkout**: Server-calculated pricing, address capture, serviceability check
- **Payments**: Cash on Delivery (COD); UPI planned for Phase 4
- **Inventory**: Atomic stock reservations with row-level locking, expiry cron
- **Orders**: Full lifecycle — placed → confirmed → packed → shipped → delivered + cancellation
- **Admin**: Catalog CRUD, inventory view, order management with state machine, dashboard
- **Audience**: Sambalpur & Western Odisha, ~20–30 designs, 5–6 pieces each

## Current Status

### Customer App (Mobile) — 23 features working

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

### Customer Website (Web) — 11 pages working

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
| 10 | Orders — table layout (desktop), card layout (mobile), filter chips | ✅ |
| 11 | Account — split-panel login, profile with sidebar (desktop) | ✅ |

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo SDK 52 + TypeScript |
| Customer Website | Next.js 14 (App Router) + Tailwind CSS + TypeScript |
| Backend API | NestJS + TypeScript (modular monolith) |
| Database | PostgreSQL 16 + Prisma ORM |
| Admin Panel | Next.js 14 (App Router) + TypeScript |
| Auth | Phone OTP → JWT (15min access + 7d refresh) |
| Payments | COD (pilot); Razorpay/Cashfree planned |
| Shipping | Manual entry (pilot); no courier API |
| Monorepo | npm workspaces |
| CI/CD | GitHub Actions |

## Project Structure

```
sajani-app/
├── apps/
│   ├── mobile/              # React Native + Expo (customer mobile app)
│   │   └── src/
│   │       ├── screens/     # 13 screens (Splash, Welcome, Home, Explore,
│   │       │                #   ProductDetail, Cart, SelectAddress, AddAddress,
│   │       │                #   OrderReview, OrderSuccess, Orders, OrderDetail, Profile)
│   │       ├── navigation/  # Tab (5 tabs) + Stack navigators
│   │       ├── services/    # API client, local guest cart
│   │       ├── components/  # AnimatedUI, RefreshButton
│   │       └── theme/       # Design tokens (colors, typography, spacing)
│   ├── web/                 # Next.js customer website (responsive)
│   │   └── src/
│   │       ├── app/         # 11 pages (/, /shop, /shop/[slug], /cart,
│   │       │                #   /checkout/address, /checkout/address/new,
│   │       │                #   /checkout/review, /order-success,
│   │       │                #   /orders, /orders/[id], /account)
│   │       ├── components/  # Header, BottomNav
│   │       └── lib/         # API client, cart context
│   ├── api/                 # NestJS backend
│   │   ├── src/modules/     # 10 active modules (see below)
│   │   ├── prisma/          # Schema + migrations (18 tables) + seed data
│   │   └── test/
│   └── admin/               # Next.js admin panel
│       └── src/
│           ├── app/         # Dashboard, Catalog, Categories, Inventory, Orders
│           ├── components/  # Sidebar
│           └── services/    # API client
├── packages/
│   └── shared/              # Enums, constants (state machine), types, utils
├── docs/
│   ├── architecture/
│   │   ├── HLD.md           # High-Level Design (21 mobile screens)
│   │   ├── LLD.md           # Low-Level Design (modules, DTOs, state machines)
│   │   └── database-design.md  # 18 tables, ER diagram, constraints
│   └── api/
│       └── openapi.yaml     # OpenAPI 3.0 spec (38 endpoints)
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

### API (38 endpoints)

Public (catalog, auth) · Customer (cart, checkout, orders, addresses, profile) · Admin (catalog CRUD, inventory, orders) · Webhooks (payments)

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

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 0 — Design | HLD, DB design, LLD, OpenAPI spec | ✅ Complete |
| 1 — Foundations | Monorepo, NestJS skeleton, Prisma schema, Expo shell, CI | ✅ Complete |
| 2 — Catalog | Auth, categories, products, admin + mobile screens | ✅ Complete |
| 3 — Cart & Checkout | Addresses, inventory, cart, checkout, orders, mobile + admin UI | ✅ Complete |
| 4 — Payments | Gateway integration, webhooks, refunds, UPI flow | 🔲 Next |
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
git clone git@github.com:nikhilnanda47/sajani-app.git
cd sajani-app
```

> **Windows SSH note:** If SSH is not set up, use HTTPS instead:
> ```bash
> git clone https://github.com/nikhilnanda47/sajani-app.git
> ```

### 2. Set up the database

**Option A — Local PostgreSQL (recommended):**

<details>
<summary><strong>macOS / Linux</strong></summary>

```bash
psql postgres -c "CREATE USER sajani WITH PASSWORD 'sajani_dev_password' CREATEDB;"
psql postgres -c "CREATE DATABASE sajani_dev OWNER sajani;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE sajani_dev TO sajani;"
```

</details>

<details>
<summary><strong>Windows</strong></summary>

Open **pgAdmin** (installed with PostgreSQL) or **psql** from Start Menu:

```sql
-- In psql (connect as postgres user):
psql -U postgres

-- Then run:
CREATE USER sajani WITH PASSWORD 'sajani_dev_password' CREATEDB;
CREATE DATABASE sajani_dev OWNER sajani;
GRANT ALL PRIVILEGES ON DATABASE sajani_dev TO sajani;
\q
```

Or use **pgAdmin GUI:**
1. Open pgAdmin → right-click "Login/Group Roles" → Create → Login/Group Role
2. Name: `sajani`, Password: `sajani_dev_password`, Privileges: Can login + Create databases
3. Right-click "Databases" → Create → Database, Name: `sajani_dev`, Owner: `sajani`

</details>

**Option B — Docker (all platforms):**

```bash
docker compose up -d
```

### 3. Install dependencies

```bash
# Root workspace (API, admin, shared)
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

### 6. Build the shared package

```bash
cd packages/shared
npx tsc
cd ../..
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
| `psql -U sajani -d sajani_dev` | Anywhere | Connect to database CLI |
| `cd apps/mobile && npx expo start --web --clear` | Root | Mobile with cleared cache |

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
| [OpenAPI Spec](docs/api/openapi.yaml) | 38 REST endpoints with full schemas |
| [UI/UX Designs](https://drive.google.com/drive/folders/1VGF8a_wP-hkXg4s66_ixaiOxPvS10jpX?usp=sharing) | Mobile app screen designs |

## Guiding Principles

> Trust before novelty. Accurate inventory before growth. Real product evidence before marketing claims. Server authority over client inputs. Explicit policy over invented behavior. Measured customer demand before expensive infrastructure.

## License

Proprietary — All rights reserved.
