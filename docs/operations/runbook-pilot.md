# Juhar pilot environment: runbook

This is the one place that says **where everything lives, how to deploy, how to undo a deploy, and what to do when
something breaks.** It is written for a person doing it for the first time.

> **Status:** the repo is ready to deploy (tracker item 72). Nothing is deployed yet: that is item 55, after the
> accounts exist (item 50). Steps that talk to Railway, Vercel, Supabase or Expo were written from their documentation
> and have **not been tried against real accounts**; the first deploy will confirm them, and this file should be
> corrected where reality differs. The parts that run in this repo were tried (see "Dry run on your computer").

## 1. The setup in one picture

We run **one environment** until launch (the "pilot environment"). The team tests on it; the public cannot sign in.

| Piece | Runs on | Built from | Settings live in |
|---|---|---|---|
| Database | Supabase (Postgres, Mumbai) | the migrations in `apps/api/prisma/migrations` | Supabase dashboard |
| API | Railway | repo root, `railway.json` + `nixpacks.toml` | Railway > service > Variables |
| Website | Vercel project 1 | `apps/web`, `apps/web/vercel.json` | Vercel > project > Settings |
| Admin panel | Vercel project 2 | `apps/admin`, `apps/admin/vercel.json` | Vercel > project > Settings |
| Android app | Expo EAS (later) | `apps/mobile`, `apps/mobile/eas.json` | `eas.json` profile `pilot` |

Everything updates from the `main` branch. A change reaches the pilot environment only by being merged into `main`.

## 2. The settings, one table per service

Never paste secrets into chat, issues or the repo. They go only into the dashboards below.

### API (Railway > service > Variables)

| Name | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Supabase **Transaction pooler** string, port **6543**, ending `?pgbouncer=true` | Without `pgbouncer=true` the API refuses to start. |
| `DIRECT_URL` | Supabase **direct** string (port 5432), or the **Session pooler** string (port 5432 on the pooler host) | Only the migration step uses it. If Railway cannot reach the direct host (it is IPv6-only on some plans), use the session pooler address. |
| `JWT_SECRET` | 48 random bytes, hex | Make one with the command below. |
| `JWT_REFRESH_SECRET` | another one, different | At least 32 characters each; the API refuses weaker ones. |
| `OTP_PROVIDER` | `mock` (until real SMS) | |
| `MOCK_OTP_ALLOWED_PHONES` | `+919876543210,+919123456789` | The team's numbers, **including the admin's**. Everyone else is refused. Remove when real SMS is on. |
| `CORS_ORIGINS` | `https://<website address>,https://<admin address>` | Exact addresses, `https`, no trailing slash. Replaces the built-in local list. |
| `TRUST_PROXY` | `1` | So the rate limits see each caller's real address. |
| `NIXPACKS_NODE_VERSION` | `22` | Makes sure Railway builds with Node 22. |
| `LOG_LEVEL` | optional, `log` | |
| `ENABLE_API_DOCS` | leave unset | The Swagger page is off on a live API. |
| `R2_ACCOUNT_ID` | Cloudflare dashboard > R2 > Account ID | Product photos (section 3, step 3). **Set all five or none**: a half-filled set stops the API from starting. |
| `R2_ACCESS_KEY_ID` | from the R2 API token | |
| `R2_SECRET_ACCESS_KEY` | from the R2 API token (shown only once) | |
| `R2_BUCKET` | the bucket's name, for example `juhar-photos` | |
| `MEDIA_PUBLIC_URL` | where the bucket is public, `https`, no trailing slash, for example `https://photos.juhar.co.in` | This is the address people's browsers load photos from. |

**With none of the five set, the API still starts but refuses photo uploads** ("Photo storage is not set up on this server yet"): a live server's own disk is wiped on every deploy, so a photo kept there would vanish. Everything else works.

Make a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`PORT` is set by Railway itself.

### Website and admin (Vercel > project > Settings > Environment Variables)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | the API's public address, for example `https://<api>.up.railway.app` |

The value is baked into the build. **After changing it, redeploy.**

Project settings for each Vercel project: **Root Directory** = `apps/web` (or `apps/admin`), and keep
**Include source files outside of the Root Directory** switched on (the monorepo needs `packages/shared` and the root
install). The install and build commands come from the project's `vercel.json`.

### Android app (`apps/mobile/eas.json`, profile `pilot`)

Put the API's address in `EXPO_PUBLIC_API_URL` of the `pilot` profile. The Share button builds its links from `EXPO_PUBLIC_WEB_URL` (the website's address; `https://juhar.co.in` when unset), so set it in the profile while the website lives on another address. A build with a missing, placeholder or
non-`https` address refuses to run. See tracker item 56.

## 3. First deploy, step by step

Do these in order. The accounts come from tracker item 50.

1. **Supabase.** New project, region Mumbai, a strong database password (keep it in a password manager). In
   Project Settings > Database > Connection string, copy the **Transaction pooler** string (port 6543) and the
   **Direct** string (port 5432). Put `?pgbouncer=true` on the end of the first.
2. **Make the two JWT secrets** with the command above.
3. **Cloudflare R2, for product photos** (can wait until just before the first photos are uploaded; nothing else needs it).
   Cloudflare dashboard > R2 > **Create bucket** (for example `juhar-photos`). Make it public: Bucket > Settings > Public access,
   best by **connecting a custom domain** such as `photos.juhar.co.in` (the domain must be on Cloudflare); the free
   `r2.dev` address also works for testing but is rate-limited. That address, without a trailing slash, is `MEDIA_PUBLIC_URL`.
   Then R2 > **Manage API tokens** > create a token with **Object Read & Write** for this bucket and copy the Access Key ID
   and Secret Access Key (the secret is shown once). The Account ID is on the R2 overview page. Put all five values into
   Railway (section 2). Photos load in `<img>` tags, so no CORS setting is needed on the bucket.
4. **Railway.** New Project > Deploy from GitHub repo > this repository. Leave the service's root directory empty
   (the repo root). Railway reads `railway.json` and `nixpacks.toml` on its own. Add the variables from section 2 (leave
   `CORS_ORIGINS` for step 7 if you do not have the website address yet). In the service's Settings, turn on
   **Wait for CI** (so a deploy only goes ahead when the GitHub checks pass), choose the branch `main`, and
   generate a public domain. The first deploy applies the migrations itself (the pre-deploy step), then starts the API.
5. **Check the API.** Open `https://<api address>/health`. It should show `"status":"ok"` and `"database":"connected"`.
6. **Create the first admin** from your computer (after `npm install`), pointing at the **direct** database address,
   with the admin's real number:

   ```bash
   DATABASE_URL="<the DIRECT_URL value>" npm run db:create-admin -w apps/api -- --phone +919876543210 --name "Owner Name" --role owner
   ```

   Do **not** run `npm run db:seed` or `db:seed:demo` on this database: they refuse to run against a database that is not on
   your computer, because they add made-up sarees and a known admin number.
7. **Vercel, twice** (website, then admin): Add New Project > import the repository > set the Root Directory, add
   `NEXT_PUBLIC_API_URL`, deploy. Then go back to Railway and put the two Vercel addresses into `CORS_ORIGINS`
   (the API restarts by itself).
8. **Try it:** open the website, sign in with a listed number and the code `123456`, upload a photo for a saree in the admin (section 3, step 3 must be done) and check it shows in the shop, place a cash-on-delivery order, then sign in to the
   admin with the admin number and walk the order from Confirm to Delivered. A number that is not on the list should be refused.
9. **Run the smoke test** (section 4) and keep it for every release.
10. **Later:** the Android build (tracker item 56).

## 4. Every release (the daily loop)

1. Work in small steps on `develop-nikhil`; push; wait for CI (API, Web, Admin, Mobile, Lint, `build`).
2. Open a pull request into `main` and get it approved. Vercel adds a **preview link** to the PR for the website and the
   admin. Previews use the same live API and database, so look at them but do not run destructive tests.
3. Merge. Railway and Vercel deploy `main` by themselves.
4. **Run the smoke test** (about a minute, reads only, creates no orders):

   ```bash
   npm run smoke -- --api https://<api> --web https://<website> --admin https://<admin> \
                    --login-phone +919876543210 --outsider-phone +919000000000
   ```

   `--login-phone` is a number on the pilot list (it signs in with the fixed code, reads the profile and, for an admin, the order list);
   `--outsider-phone` is a number that is **not** on the list (it must be refused). Leave both out to check only the public pages.
   It checks the API's health and database, the shipping settings, categories, the shop list, the Swagger page being off,
   the closed login, that the website and the admin load, that each was **built with this API's address**, and that **CORS** lets each
   talk to the API. Every line says `ok`, `warn` or `FAIL`; any FAIL makes the command exit with an error, and the cause is
   usually in section 9. The sign-in checks ask the API for two codes, and it allows only about ten per ten minutes per address,
   so do not run it more than a few times in a row. Then try the flow you changed by hand.
5. Test orders use a clearly named test account and are cancelled afterwards, so they do not mix with real ones.

## 5. Undoing a deploy

- **API:** Railway > the service > Deployments > pick the last good deployment > **Redeploy** (or the rollback option).
- **Website or admin:** Vercel > Deployments > the last good one > **Promote to Production** (instant rollback).
- **Database:** migrations only go forward. That is why section 6 matters: a migration must never break the previous
  version of the code. If data was damaged, restore from the Supabase backup (check that backups are on: tracker item 68).

## 6. Changing the database safely

Migrations run **before** the new code starts, and the old code keeps running until the new one is healthy. So:

1. **Add, do not remove or rename, in one release.** New table, new nullable column, new index: fine.
2. To rename or remove something: release 1 adds the new thing and writes to both; release 2 reads the new thing; release 3 removes the old one.
3. **Never edit a migration that has already been applied** (anywhere). Add a new one.
4. Run `npm run rehearse:deploy` (section 8) before merging a migration.
5. Before a risky migration, take a Supabase backup or snapshot first.

## 7. Opening the site to customers

Only when all of these are true:

- Real SMS is working (tracker item 27): `OTP_PROVIDER` is the real provider and **`MOCK_OTP_ALLOWED_PHONES` is removed**.
- Database backups are on and a restore has been tried (item 68).
- Terms, Privacy and returns pages are live (item 57); the real support number is set (item 11).
- The final pre-launch check is done (item 60) and the friendly-user dry run (item 59).

## 8. Dry run on your computer

`npm run rehearse:deploy` does what Railway and Vercel do, from a clean copy of the repo: install with the dev tools,
build the API, apply the migrations to an **empty** database (twice, to prove it is safe to repeat), start the API with
live settings, check the health endpoint, the closed pilot login, the Swagger page being off and CORS, create an admin,
and build the website and the admin panel.

```bash
createdb juhar_rehearsal
REHEARSAL_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/juhar_rehearsal" npm run rehearse:deploy
```

It needs an empty, disposable database and takes a few minutes. Add `SKIP_FRONTENDS=1` to rehearse only the API.

## 9. When something breaks

| What you see | Why | What to do |
|---|---|---|
| API will not start: "Refusing to start: ... mock ..." | The mock login is on with no pilot list | Set `MOCK_OTP_ALLOWED_PHONES`, or a real provider |
| "JWT_SECRET is too short" / "the same" | Weak or equal secrets | Make two new secrets (section 2) |
| "DATABASE_URL points at the connection pooler ... pgbouncer=true" | Missing `?pgbouncer=true` | Add it to the end of `DATABASE_URL` |
| Random database errors "prepared statement already exists" | Same cause | Same fix |
| Migration step says "Cannot run the migrations" or cannot reach the database | `DIRECT_URL` missing, or Railway cannot reach the direct (IPv6) host | Set `DIRECT_URL`; try the Session pooler address (port 5432) |
| The browser console shows a CORS error | The site's address is not in `CORS_ORIGINS` | Add the exact address (`https`, no slash), let the API restart |
| Sign-in says "Juhar is not open to the public yet" | The number is not on `MOCK_OTP_ALLOWED_PHONES` | Add it as `+91` and ten digits, with commas between numbers |
| The website still calls the old API address | `NEXT_PUBLIC_API_URL` changed but was not redeployed | Redeploy the Vercel project |
| `/health` shows `"database":"disconnected"` | Wrong `DATABASE_URL`, or Supabase paused the free project after a week unused | Check the address; resume the project in Supabase |
| Railway deploy fails at the health check | The API crashed at start | Read the deployment logs: the first error line says what to fix |
| A migration stops with "Cannot add the status CHECK constraints ... existing rows have values outside the allowed lists" | A row has a status, role or payment mode that is not one of the allowed ones (the message lists each column and the query that finds the rows) | Fix those rows, then `npx prisma migrate resolve --rolled-back 20261126130000_status_check_constraints` and `npx prisma migrate deploy` again. Nothing was changed by the failed run |
| "Invalid photo storage settings: ... only partly set" at start | Some of the five R2 settings are missing | Set the ones the message names, or remove all five |
| Admin says "Photo storage is not set up on this server yet" | None of the R2 settings are set on the live API | Do section 3, step 3, then add the five settings in Railway |
| Photos upload fine but show as grey boxes in the shop | `MEDIA_PUBLIC_URL` is wrong, or the bucket is not public | Open one photo's address from the admin in a new tab: it must load. Fix the address or the bucket's public access |
| A photo is refused as "too small" or "not a photo we can use" | It is under 600 px on the short side, or not JPG/PNG/WebP (an iPhone HEIC for example) | Export it as JPG and try again |
| A customer reports a problem | | Ask for the `Reference:` code shown with the error and search the API logs for `req=<code>` |

## 10. What is in the repo for this

| File | What it does |
|---|---|
| `railway.json`, `nixpacks.toml` | How Railway builds and starts the API, runs the migrations first, and checks `/health` |
| `apps/web/vercel.json`, `apps/admin/vercel.json` | How Vercel installs and builds the website and the admin |
| `apps/api/scripts/migrate-deploy.js` | Applies migrations through `DIRECT_URL` (never through the pooler) |
| `apps/api/prisma/create-admin.ts` | Creates or updates one admin: their login and their staff record, linked; safe to repeat (run it again to correct a name or role) |
| `apps/api/src/config/production-checks.ts` | Stops a live API that has weak secrets or a pooler address without `pgbouncer=true` |
| `apps/api/src/common/local-database-guard.ts` | Makes the sample seeds refuse to touch a database that is not on your computer |
| `apps/api/src/config/media-config.ts`, `apps/api/src/modules/media/` | Where product photos are kept (R2, a local folder in development, or nowhere on a live API with nothing set), and the upload, shrink and storage code |
| `scripts/rehearse-deploy.sh` | The dry run in section 8 |
| `scripts/smoke-test.js` (`npm run smoke`) | The after-deploy check in section 4 |
| `.env.example` in `apps/api`, `apps/web`, `apps/admin`, `apps/mobile` | Every setting, explained |
| `.nvmrc` | Node version 22 |
