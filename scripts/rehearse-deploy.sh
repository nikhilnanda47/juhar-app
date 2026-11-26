#!/usr/bin/env bash
# A dry run of what Railway and Vercel do, on this computer, from a clean copy of the repo.
# It catches "works on my machine" before a deploy does: a missing file, a build that needs a dev tool,
# a migration that fails on an empty database, or an API that will not start with live settings.
#
#   REHEARSAL_DATABASE_URL="postgresql://user:pass@localhost:5432/juhar_rehearsal" npm run rehearse:deploy
#
# The database must be EMPTY and disposable (create it with: createdb juhar_rehearsal). Nothing else is touched.
# Takes a few minutes (a clean install and three builds). Add SKIP_FRONTENDS=1 to rehearse only the API.
set -euo pipefail

: "${REHEARSAL_DATABASE_URL:?Set REHEARSAL_DATABASE_URL to an empty, disposable database (see the top of this script)}"
PORT="${REHEARSAL_PORT:-3999}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
API_PID=""
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
ok()   { printf '   ok: %s\n' "$1"; }
fail() {
  printf '\n\033[31mFAILED: %s\033[0m\n' "$1" >&2
  if [ -f "$WORK/api.log" ]; then echo "--- last API log lines:" >&2; tail -15 "$WORK/api.log" >&2; fi
  exit 1
}
cleanup() {
  if [ -n "$API_PID" ]; then kill "$API_PID" 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

step "1. A clean copy (committed and new files, no node_modules or build output)"
cd "$ROOT"
git ls-files -z --cached --others --exclude-standard | xargs -0 -I{} cp --parents {} "$WORK"
cd "$WORK"
ok "copied to $WORK"

step "2. Install, the way Railway does (with NODE_ENV=production set, dev tools still included)"
NODE_ENV=production npm ci --include=dev >"$WORK/install.log" 2>&1 || { tail -20 "$WORK/install.log"; fail "npm ci"; }
ok "dependencies installed, shared package built"

step "3. Build the API"
npm run db:generate -w apps/api >"$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; fail "prisma generate"; }
npm run build -w apps/api >>"$WORK/build.log" 2>&1 || { tail -20 "$WORK/build.log"; fail "API build"; }
[ -f apps/api/dist/main.js ] || fail "apps/api/dist/main.js was not produced"
ok "apps/api/dist/main.js built"

step "4. Apply the migrations to the empty database (the pre-deploy step)"
export DATABASE_URL="$REHEARSAL_DATABASE_URL"
npm run db:migrate:deploy -w apps/api >"$WORK/migrate.log" 2>&1 || { tail -20 "$WORK/migrate.log"; fail "migrations"; }
grep -qiE "successfully applied|have been applied" "$WORK/migrate.log" || { tail -10 "$WORK/migrate.log"; fail "migrations did not report success"; }
ok "migrations applied"
if npm run db:migrate:deploy -w apps/api 2>&1 | grep -qiE "No pending migrations|already in sync"; then
  ok "running them again does nothing (safe to repeat on every release)"
else
  fail "a second migration run was not a no-op"
fi

step "5. Start the API with live settings (NODE_ENV=production, closed pilot login)"
export NODE_ENV=production PORT="$PORT" TRUST_PROXY=1 OTP_PROVIDER=mock
JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
JWT_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
export JWT_SECRET JWT_REFRESH_SECRET
export MOCK_OTP_ALLOWED_PHONES="+919000012345"
export CORS_ORIGINS="https://shop.example.com,https://admin.example.com"
npm run start:prod -w apps/api >"$WORK/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 40); do
  curl -fs "http://localhost:$PORT/health" >/dev/null 2>&1 && break
  kill -0 "$API_PID" 2>/dev/null || fail "the API stopped while starting"
  sleep 1
done
HEALTH="$(curl -fs "http://localhost:$PORT/health")" || fail "the health check never answered"
echo "$HEALTH" | grep -q '"database":"connected"' || fail "health says the database is not connected: $HEALTH"
ok "health check answers, database connected"

step "6. Behaviour of a live API"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/docs")"
if [ "$CODE" = "404" ]; then ok "the Swagger page is off (404)"; else fail "the Swagger page answers $CODE on a live API"; fi
OUT="$(curl -s -X POST "http://localhost:$PORT/api/v1/auth/otp/request" -H 'content-type: application/json' -d '{"phone":"+919123456789"}')"
if echo "$OUT" | grep -q LOGIN_NOT_OPEN; then ok "a number not on the pilot list is refused"; else fail "an outsider was not refused: $OUT"; fi
OUT="$(curl -s -X POST "http://localhost:$PORT/api/v1/auth/otp/request" -H 'content-type: application/json' -d '{"phone":"+919000012345"}')"
if echo "$OUT" | grep -q '"success":true'; then ok "a listed number can ask for a code"; else fail "a listed number was refused: $OUT"; fi
if grep -q "Uploading product photos is refused" "$WORK/api.log"; then ok "with no photo storage set, a live API starts and says photo uploads are refused (nothing is lost to a wiped disk)"; else fail "the API did not report the missing photo storage"; fi
CORS="$(curl -s -D - -o /dev/null -H 'Origin: https://shop.example.com' "http://localhost:$PORT/health" | tr -d '\r' | grep -i '^access-control-allow-origin' || true)"
if echo "$CORS" | grep -q "https://shop.example.com"; then ok "the website's address is allowed by CORS"; else fail "CORS did not allow the website address"; fi
CORS="$(curl -s -D - -o /dev/null -H 'Origin: https://evil.example.com' "http://localhost:$PORT/health" | tr -d '\r' | grep -i '^access-control-allow-origin' || true)"
if [ -z "$CORS" ]; then ok "another website's address is not allowed"; else fail "CORS allowed an address that is not on the list: $CORS"; fi

step "7. Create the first admin with the script"
(cd apps/api && npx ts-node prisma/create-admin.ts --phone +919000012345 --name "Rehearsal Owner" 2>&1 | head -1 | sed 's/^/   /') || fail "create-admin"
kill "$API_PID" 2>/dev/null || true
API_PID=""

if [ "${SKIP_FRONTENDS:-0}" != "1" ]; then
  step "8. Build the website and the admin panel, the way Vercel does"
  export NEXT_PUBLIC_API_URL="https://api.example.com"
  npm run build -w apps/web >"$WORK/web.log" 2>&1 || { tail -20 "$WORK/web.log"; fail "website build"; }
  ok "website built"
  npm run build -w apps/admin >"$WORK/admin.log" 2>&1 || { tail -20 "$WORK/admin.log"; fail "admin build"; }
  ok "admin panel built"
fi

printf '\n\033[32mRehearsal passed.\033[0m The same steps are what Railway and Vercel will run.\n'
