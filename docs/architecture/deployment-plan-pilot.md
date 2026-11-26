# Juhar — Deployment Plan (Pilot P0)

**Version:** 1.1  
**Date:** 18 November 2026  
**Status:** Planned

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CUSTOMERS                                 │
│                                                                  │
│   ┌─────────────┐  ┌──────────────┐       ┌──────────────┐     │
│   │ Android App │  │  Customer    │       │  Admin Panel  │     │
│   │ (APK/Store) │  │  Website    │       │  (Web Browser)│     │
│   └──────┬──────┘  └──────┬──────┘       └──────┬───────┘     │
│          │                │                      │              │
└──────────┼────────────────┼──────────────────────┼──────────────┘
           │ HTTPS          │ HTTPS                │ HTTPS
           │                │                      │
┌──────────▼────────────────▼──────────────────────▼──────────────┐
│                     HOSTING LAYER                                │
│                                                                  │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │  Expo EAS   │  │   Vercel     │  │   Vercel     │          │
│   │  (Build &   │  │  (Customer   │  │  (Admin      │          │
│   │   OTA)      │  │   Website)   │  │   Panel)     │          │
│   │  Free Tier  │  │  Free Tier   │  │  Free Tier   │          │
│   └─────────────┘  └──────┬───────┘  └──────┬───────┘          │
│                           │                  │                   │
│                   ┌───────▼──────────────────▼──┐               │
│                   │       Railway.app           │               │
│                   │       (NestJS API)          │               │
│                   │       $5/month Hobby        │               │
│                   └──────────┬──────────────────┘               │
│                              │                                   │
│   ┌─────────────────┐       │                                   │
│   │  Cloudflare R2  │◄──────┘                                   │
│   │  (Images + CDN) │       │                                   │
│   │  10GB Free      │       │                                   │
│   └─────────────────┘       │                                   │
│                   ┌─────────▼───────────┐                       │
│                   │     Supabase        │                        │
│                   │   (PostgreSQL 15)   │                        │
│                   │    Free Tier        │                        │
│                   │    500MB + Backups  │                        │
│                   └─────────────────────┘                        │
│                                                                  │
│   ┌─────────────┐  ┌──────────────┐                             │
│   │   MSG91     │  │  Zoho Mail   │                             │
│   │  ~₹0.20/SMS│  │  (Email)     │                             │
│   │  Pay-per-use│  │  Free Tier   │                             │
│   └─────────────┘  └──────────────┘                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Details

### 2.1 Mobile App — Expo EAS

| Item | Detail |
|------|--------|
| **Service** | Expo EAS (Expo Application Services) |
| **App SDK** | Expo SDK 58 (React Native 0.88, React 19). `apps/mobile` is not an npm workspace: install with `npm install` inside `apps/mobile` |
| **What it does** | Builds APK/AAB (Android) and IPA (iOS) in the cloud from our React Native code |
| **Plan** | Free tier — 30 builds/month |
| **Cost** | ₹0 |
| **Deployment** | Run `npx eas build`, download APK, share via WhatsApp/email |
| **OTA Updates** | Push JS-only updates without rebuilding — users get updates on next app open |
| **Store Publishing** | Not needed for pilot. Share APK directly to test users. |

**Pilot distribution strategy:**
- Build APK with EAS → share via WhatsApp to pilot users in Sambalpur
- Users install directly (allow "Install from unknown sources" once)
- No Google Play (₹2,100) or Apple Developer (₹8,300/year) needed yet

**When to move to stores:**
- After pilot validation, when going beyond friends/family/test group
- Google Play: ₹2,100 one-time fee
- Apple App Store: ₹8,300/year (defer if pilot is Android-only)

---

### 2.2 Customer Website — Vercel

| Item | Detail |
|------|--------|
| **Service** | Vercel (vercel.com) |
| **What it does** | Hosts the Next.js customer-facing e-commerce website |
| **Plan** | Hobby (free) |
| **Cost** | ₹0 |
| **Bandwidth** | 100GB/month |
| **Deploy** | Auto-deploys on `git push` to `main` via GitHub integration |
| **Custom Domain** | `juhar.co.in` + `www.juhar.co.in` (free SSL included) |
| **Features** | Shop, product detail, cart, checkout, orders, account — same as mobile app |

**Setup:**
1. Create a new Vercel project, connect GitHub repo
2. Set root directory to `apps/web` and keep "Include source files outside of the Root Directory" on (`apps/web/vercel.json` sets the install and build commands for the monorepo)
3. Set env variable: `NEXT_PUBLIC_API_URL=https://api.juhar.co.in`
4. Add custom domain `juhar.co.in` and `www.juhar.co.in`
5. Every push to `main` auto-deploys

> **Build note (2026-11-22):** `next build` for this app passes in CI (it needed `<Suspense>` around pages that use `useSearchParams()`, now done). See the monorepo install note in 2.4 for how `packages/shared` is built.

---

### 2.3 Admin Panel — Vercel

| Item | Detail |
|------|--------|
| **Service** | Vercel (vercel.com) |
| **What it does** | Hosts the Next.js admin panel as a static + serverless app |
| **Plan** | Hobby (free) — same account as customer website |
| **Cost** | ₹0 |
| **Bandwidth** | 100GB/month (more than enough for admin usage) |
| **Deploy** | Auto-deploys on `git push` to `main` via GitHub integration |
| **Custom Domain** | `admin.juhar.co.in` (free SSL included) |
| **Limitations** | 1 team member on free tier, 100 deployments/day |

**Setup:**
1. Create a second Vercel project (same account), connect GitHub repo
2. Set root directory to `apps/admin` and keep "Include source files outside of the Root Directory" on (`apps/admin/vercel.json` sets the install and build commands)
3. Set env variable: `NEXT_PUBLIC_API_URL=https://api.juhar.co.in`
4. Add custom domain `admin.juhar.co.in`
5. Every push to `main` auto-deploys

> **Build note (2026-11-22):** CI typechecks and builds this app. The admin panel does not import `packages/shared` yet. See the monorepo install note in 2.4.

---

### 2.4 Backend API — Railway.app

| Item | Detail |
|------|--------|
| **Service** | Railway.app (railway.app) |
| **What it does** | Hosts the NestJS API as an always-on container |
| **Plan** | Hobby — $5/month (~₹420) |
| **Cost** | ~₹420/month |
| **Resources** | 8GB RAM, 8 vCPU (shared), 100GB bandwidth |
| **Deploy** | Auto-deploys on `git push` via GitHub integration |
| **Custom Domain** | `api.juhar.co.in` (free SSL) |
| **Cold Start** | None on Hobby plan (always-on) |
| **Logs** | Built-in log viewer + metrics |

**Why Railway over alternatives:**
- Cheapest always-on option for NestJS ($5 vs Heroku $25)
- Zero Docker knowledge needed — auto-detects Node.js
- GitHub integration — push to deploy
- Built-in env variable management
- Easy to scale (just increase plan)

**Setup** (full step-by-step in the [runbook](../operations/runbook-pilot.md)):
1. Connect the GitHub repo to Railway and **leave the root directory empty** (the repo root; setting it to `apps/api` would break the workspace install of `@juhar/shared`).
2. Nothing to type for the build: `railway.json` and `nixpacks.toml` in the repo root say how to install (with the dev tools), generate the database client, build the API, **apply the migrations before each release** (`npm run db:migrate:deploy -w apps/api`, through `DIRECT_URL`), start it, and check `/health`.
3. Set the env variables from section 5 (`DATABASE_URL` ending `?pgbouncer=true`, `DIRECT_URL`, two JWT secrets of at least 32 characters, `CORS_ORIGINS`, `TRUST_PROXY=1`, the closed pilot list).
4. Turn on **Wait for CI**, so a deploy only goes ahead when the GitHub checks pass.

> **Deploy-prep note:** `npm run rehearse:deploy` rehearses these steps on your own computer from a clean copy (install, build, migrate an empty database twice, start with live settings, health, closed login, CORS, create admin, build the website and the admin). A live API refuses to start with weak secrets or a pooler address without `pgbouncer=true`, and its Swagger page is off unless `ENABLE_API_DOCS=true`.

> **Monorepo install note (2026-11-22):** The API imports `@juhar/shared`, which resolves to `packages/shared/dist/`. The repo root `package.json` has a `postinstall` script (`npm run build -w packages/shared`), so any install run from the **repository root** (`npm ci`) builds the shared package automatically and no separate build step is needed for it. If a host installs only inside `apps/api`, the workspace link and `dist/` will be missing, so keep the install at the repo root. CI also runs `npx prisma generate` in `apps/api` before typechecking and building; the production build should do the same, since no install hook generates the Prisma client. The same root-install rule applies to the Vercel projects for `apps/web` and `apps/admin`.

---

### 2.5 Database — Supabase PostgreSQL

| Item | Detail |
|------|--------|
| **Service** | Supabase (supabase.com) |
| **What it does** | Managed PostgreSQL 15 database |
| **Plan** | Free tier |
| **Cost** | ₹0 |
| **Storage** | 500MB (pilot data ≈ 50MB — well within limit) |
| **Backups** | Daily automated backups |
| **Connections** | Direct + connection pooling (Supavisor) |
| **Region** | Mumbai (ap-south-1) for lowest latency |
| **Limitations** | Paused after 1 week inactivity on free tier, 2 projects max |

**Pilot data estimate:**
- 18 tables, ~30 products, ~200 customers, ~500 orders = ~50MB
- 500MB free tier is 10× what we need

**When to upgrade:**
- Supabase Pro ($25/month) when: >500MB data, need point-in-time recovery, or >60 connections
- Expected timeline: 3-6 months after pilot

**Setup:**
1. Create project on supabase.com (select Mumbai region)
2. Copy two connection strings from Settings → Database: the **transaction pooler** (port 6543) and the **direct** one (port 5432)
3. Set the pooler string, with `?pgbouncer=true` on the end, as `DATABASE_URL` in Railway, and the direct string as `DIRECT_URL` (if Railway cannot reach the direct host because it is IPv6-only, use the session pooler address, port 5432). The API refuses to start with the pooler address and no `pgbouncer=true`.
4. Migrations are applied by Railway before every release (they go through `DIRECT_URL`); there is nothing to run by hand
5. Create the first admin from your computer: `DATABASE_URL="<direct string>" npm run db:create-admin -w apps/api -- --phone +91… --name "…"`. Do not run the sample seeds on this database: they refuse to run against a database that is not on your computer.

---

### 2.6 Media Storage — Cloudflare R2

| Item | Detail |
|------|--------|
| **Service** | Cloudflare R2 (cloudflare.com/r2) |
| **What it does** | Object storage for product images, served via global CDN |
| **Plan** | Free tier |
| **Cost** | ₹0 |
| **Storage** | 10GB free (1000 images ≈ 500MB) |
| **Egress** | **Zero egress fees** (unlike AWS S3) |
| **CDN** | Built-in — images served from nearest Cloudflare edge |
| **API** | S3-compatible (same SDK, different endpoint URL) |
| **Custom Domain** | `images.juhar.co.in` |

**Why R2 over S3:**
- S3 charges for every image download (egress). With 1000 customers viewing 10 images each = 10,000 downloads/day → S3 egress adds up fast
- R2 has **zero egress fees** — unlimited downloads for free
- Same S3 SDK — just change the endpoint URL in code

**Image strategy:**
- Upload original + generate thumbnail on API side
- Store as: `products/{productId}/{variantId}_{sortOrder}.webp`
- Serve via: `https://images.juhar.co.in/products/...`

---

### 2.7 SMS/OTP — MSG91

| Item | Detail |
|------|--------|
| **Service** | MSG91 (msg91.com) |
| **What it does** | Sends OTP SMS to Indian mobile numbers |
| **Plan** | Pay-per-use |
| **Cost** | ~₹0.20 per SMS |
| **Pilot estimate** | ~1000 OTPs/month = ~₹200/month |
| **DLT Registration** | Required for Indian SMS (one-time setup) |
| **Alternatives** | Twilio (~₹0.50/SMS, more expensive), AWS SNS |

**Implementation:**
- Already architected — implement `OtpProvider` interface with MSG91 SDK
- Swap `OTP_PROVIDER=mock` → `OTP_PROVIDER=msg91` in env
- Zero code changes in auth module

---

### 2.8 Email — Zoho Mail

| Item | Detail |
|------|--------|
| **Service** | Zoho Mail (zoho.com/mail) |
| **What it does** | Business email for the juhar.co.in domain |
| **Plan** | Free tier (up to 5 users) |
| **Cost** | ₹0 |
| **Email** | e.g. `hello@juhar.co.in`, `support@juhar.co.in` |
| **Status** | ✅ Already configured — MX records set, sending/receiving works |

**Future use:**
- Order confirmation emails to customers
- Shipping notification emails
- Password reset / account emails (if added)
- Can integrate via Zoho SMTP or Zoho API for transactional emails

---

## 3. Cost Summary

### Pilot Phase (0-3 months)

| Service | Monthly Cost |
|---------|-------------|
| Expo EAS (mobile builds) | ₹0 |
| Vercel (customer website) | ₹0 |
| Vercel (admin panel) | ₹0 |
| Railway.app (API) | ₹420 |
| Supabase (database) | ₹0 |
| Cloudflare R2 (images) | ₹0 |
| MSG91 (OTP SMS) | ₹200 |
| Zoho Mail (email) | ₹0 |
| Domain (juhar.co.in) | ₹42 (₹500/year) |
| **Total** | **~₹660/month** |

### Growth Phase (3-12 months, ~2000 customers)

| Service | Monthly Cost |
|---------|-------------|
| Expo EAS | ₹0 |
| Vercel (website + admin) | ₹0 |
| Railway.app (Pro) | ₹1,700 ($20) |
| Supabase (Pro) | ₹2,100 ($25) |
| Cloudflare R2 | ₹0 |
| MSG91 | ₹600 |
| Google Play (one-time) | ₹175 (₹2,100/year amortized) |
| **Total** | **~₹4,575/month** |

### Scale Phase (1-2 years, ~10,000+ customers)

| Service | Monthly Cost |
|---------|-------------|
| Railway or AWS ECS | ₹4,000–8,000 |
| Supabase Pro or AWS RDS | ₹4,000–6,000 |
| Cloudflare R2 | ₹500 |
| MSG91 | ₹2,000 |
| Apple Developer | ₹690 (₹8,300/year) |
| **Total** | **₹11,000–17,000/month** |

---

## 4. Domain & DNS Setup

| Domain | Points To | Purpose |
|--------|-----------|---------|
| `juhar.co.in` / `www` | Vercel | Customer website |
| `api.juhar.co.in` | Railway.app | Backend API |
| `admin.juhar.co.in` | Vercel | Admin panel |
| `images.juhar.co.in` | Cloudflare R2 | Product images CDN |
| MX records | Zoho Mail | Business email (already configured) |

**Registrar:** GoDaddy (already registered)  
**DNS:** GoDaddy (current) — consider moving to Cloudflare (free) for R2 custom domain + DDoS protection

---

## 5. Environment Variables (Production)

```env
# ── Database ──
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres   # REQUIRED

# ── Auth ──
JWT_SECRET=<random-64-char-string>                    # REQUIRED
JWT_REFRESH_SECRET=<different-random-64-char-string>  # REQUIRED
OTP_PROVIDER=mock                                     # until real SMS is built: "mock" is allowed in production ONLY as a closed pilot (the list below); then OTP_PROVIDER=msg91
MOCK_OTP_ALLOWED_PHONES=+919876543210,+919123456789   # the team's numbers, comma separated; include the admin's. Everyone else is refused. Remove it when real SMS is on
MSG91_AUTH_KEY=<msg91-auth-key>                       # not read by the code yet
MSG91_TEMPLATE_ID=<msg91-template-id>                 # not read by the code yet

# ── Server ──
PORT=3000
NODE_ENV=production
LOG_LEVEL=log                                         # error, warn, log, debug or verbose (optional; log is the default)
TRUST_PROXY=1                                         # proxies in front of the API; needed so rate limits see each caller's real IP (see the security checklist)
CORS_ORIGINS=https://juhar.co.in,https://www.juhar.co.in,https://admin.juhar.co.in   # replaces the built-in local origins

# ── Storage ──   (planned: no code reads these yet)
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY=<r2-access-key>
R2_SECRET_KEY=<r2-secret-key>
R2_BUCKET=juhar-media
R2_PUBLIC_URL=https://images.juhar.co.in

# ── Payments (Phase 4) ──   (planned: no code reads these yet)
PAYMENT_GATEWAY=mock
# RAZORPAY_KEY_ID=<key>
# RAZORPAY_KEY_SECRET=<secret>
```

> **Implementation status (2026-11-22):** The API reads only `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS` and `PORT`.
> - **Required at startup:** `DATABASE_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET` are checked when the API boots (`apps/api/src/config/env.validation.ts`). If any is missing or blank, the process exits and the error names the missing variables. A missing refresh secret used to be silently replaced by `JWT_SECRET`; that is no longer possible.
> - **CORS:** when `CORS_ORIGINS` is set, it **replaces** the built-in list of local origins (`localhost:3001`, `3002` and `8081`), it does not add to it. Production must therefore list every browser origin that calls the API (customer website, `www`, admin panel, and any others).
> - **OTP:** `OTP_PROVIDER` is read at startup but only `mock` (fixed code `123456`) is supported yet; the `MSG91_*` values have no effect. With `NODE_ENV=production` the API refuses to start while the provider is `mock` or unset, **unless `MOCK_OTP_ALLOWED_PHONES` lists the closed pilot's numbers** (only those can sign in). So the one pilot environment can be live and tested by the team before launch; opening it to customers needs a real provider (see HLD section 9).
> - **Storage and payments:** the `R2_*`, `PAYMENT_GATEWAY` and `RAZORPAY_*` values belong to modules that are not built yet.
> - **Web and admin:** `NEXT_PUBLIC_API_URL` (set in the Vercel projects, see 2.2 and 2.3) is the only variable these apps read.

---

## 6. Deployment Checklist

### One-Time Setup

- [x] Register `juhar.co.in` domain (GoDaddy)
- [x] Set up Zoho Mail (MX records configured, email working)
- [ ] Create Cloudflare account, add domain, update nameservers (optional — needed for R2 custom domain)
- [ ] Create Supabase project (Mumbai region)
- [ ] Create Railway.app project, connect GitHub repo
- [ ] Create Vercel project for customer website (`apps/web`), connect GitHub repo
- [ ] Create Vercel project for admin panel (`apps/admin`), connect GitHub repo
- [ ] Create Cloudflare R2 bucket
- [ ] Create MSG91 account, register DLT template
- [ ] Create Expo EAS project (`eas init`)
- [ ] Generate production JWT secrets
- [ ] Migrations run by themselves before each Railway release (`railway.json`); check the first deploy log
- [ ] Create the first admin with `npm run db:create-admin` (not the sample seed)
- [ ] Configure CORS origins for production domains

> **CI note (2026-11-22):** GitHub Actions already typechecks and builds the API, web, admin and mobile apps on every push to `main` or `develop-*` and on pull requests into `main`. It does not deploy. The `build` gate job is a required check on `main` through the `main-protection` ruleset (which also requires a pull request with 1 approving review). See HLD section 8 for the job details. Before each release, confirm the latest CI run on the commit is green.

### Per-Release Deployment

- [ ] Push code to `main` branch
- [ ] Railway auto-deploys API (verify health check)
- [ ] Vercel auto-deploys customer website
- [ ] Vercel auto-deploys admin panel
- [ ] For mobile changes: `npx eas build --platform android`
- [ ] Download APK, share to pilot users
- [ ] For JS-only updates: `npx eas update` (OTA, no rebuild needed)

### Monitoring (Free)

- [ ] Railway built-in logs and metrics. The API logs one line per request with `req=<request id>` (the same ID is in every reply as `requestId` and in the `X-Request-Id` header), so a customer's reported ID finds the whole story by searching the logs. Set `LOG_LEVEL` (default `log`; `warn` is quieter). Production lines have no colour codes
- [ ] Supabase dashboard (DB stats, connections, storage)
- [ ] Vercel analytics (customer website + admin panel)
- [ ] Cloudflare analytics (image requests, bandwidth)
- [ ] Optional: Better Stack (betterstack.com) free tier for uptime monitoring

---

## 7. Security Checklist

- [ ] All services use HTTPS (enforced by default)
- [ ] Database not publicly accessible (only Railway can connect via pooler)
- [ ] JWT secrets are strong random strings (64+ characters)
- [ ] R2 bucket is private (images served via public URL prefix, not direct bucket access)
- [ ] CORS restricted to production domains only
- [x] Rate limiting enabled on OTP endpoints (done in code 2026-11-22). After the first deploy, check it counts each customer separately: set `TRUST_PROXY=1`, ask for OTPs for 11 different numbers from one network (the 11th must be blocked), then try from a different network such as mobile data (must NOT be blocked). If the second network is blocked too, the API is seeing the proxy's address and `TRUST_PROXY` has the wrong value
- [ ] No secrets in code — all in environment variables
- [ ] Admin panel behind OTP auth (no password-based login)
- [ ] Webhook signatures verified (when payments added)

> **Implementation status (2026-11-22):** Two items above are **not yet true in the code** and block a real launch (rate limiting is now enforced):
> - **OTP login:** the mock provider accepts the fixed code `123456` for any phone number, including admin numbers. The API refuses to start in production with it unless `MOCK_OTP_ALLOWED_PHONES` limits sign-in to the team's numbers (closed pilot), so the mock cannot be deployed open by accident. No real provider exists yet, so the site must stay closed until one does.
> - **Sessions:** the admin, web and mobile apps all renew their login automatically with the refresh token, so sessions last up to 7 days. After that, or if the refresh token is rejected, the user signs in again.
>
> Required secrets are now enforced at startup: the API will not boot without `DATABASE_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET` (the 64+ character guidance above is still advice only; length is not checked).

---

## 8. Scaling Path

```
Pilot (now)          Growth (6 months)       Scale (1-2 years)
─────────────        ─────────────────       ──────────────────
Railway Free/Hobby → Railway Pro ($20)     → AWS ECS / Fly.io
Supabase Free      → Supabase Pro ($25)    → AWS RDS / Supabase Team
Cloudflare R2 Free → R2 Free (still!)      → R2 (still cheap)
Expo EAS Free      → EAS + Store listings  → EAS + CI/CD pipeline
Vercel Free        → Vercel Free (still!)  → Vercel Pro if needed
APK sharing        → Google Play Store     → Play Store + App Store
Mock OTP           → MSG91                 → MSG91 / AWS SNS
No monitoring      → Better Stack free     → Datadog / Grafana
```

**Key principle:** Start free, upgrade only when you hit a limit — never pre-optimize.
