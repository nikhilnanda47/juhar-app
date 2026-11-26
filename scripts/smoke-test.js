#!/usr/bin/env node
// A smoke test for a deployed environment: a few quick checks that say, in about a minute, whether the live
// API, website and admin panel are working after a deploy. It only READS (plus asking for a sign-in code);
// it creates no orders and changes no data.
//
//   npm run smoke -- --api https://<api> --web https://<website> --admin https://<admin> \
//                    --login-phone +919876543210 --outsider-phone +919000000000
//
//   --api            the API address (required)
//   --web, --admin   the website and admin panel addresses (each optional)
//   --login-phone    a number on the pilot list: asks for a code, signs in with the fixed code, reads the profile
//                    (and the order list, when that number is an admin). Only works while the mock login is on.
//   --outsider-phone a number that is NOT on the list: it must be refused ("not open yet"). Only in the closed pilot.
//   --otp            the fixed code (default 123456)
//
// Exit code 0 when every check passes, 1 when any fails. Warnings (things worth a look) do not fail the run.
// The sign-in checks ask the API for codes, and the API limits that to a few requests per ten minutes per address.

const TIMEOUT_MS = 15_000;

// ── command line ──
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    out[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true;
  }
  return out;
}

function normalise(label, raw) {
  if (!raw || raw === true) return null;
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new Error(`--${label} "${raw}" is not a web address (write it like https://example.com).`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`--${label} must start with https:// or http://`);
  return url.origin;
}

// ── tiny test runner ──
const results = [];
function record(status, name, detail = '') {
  results.push({ status, name, detail });
  const mark = status === 'pass' ? '\x1b[32mok  \x1b[0m' : status === 'warn' ? '\x1b[33mwarn\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${mark} ${name}${detail ? `  (${detail})` : ''}`);
}
async function check(name, work) {
  try {
    const detail = await work();
    record('pass', name, typeof detail === 'string' ? detail : '');
  } catch (err) {
    record(err && err.warn ? 'warn' : 'fail', name, err instanceof Error ? err.message : String(err));
  }
}
const warning = (message) => Object.assign(new Error(message), { warn: true });

async function http(url, options = {}) {
  const started = Date.now();
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  return { res, ms: Date.now() - started };
}
async function json(url, options) {
  const { res, ms } = await http(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  return { res, body, ms };
}

// ── API checks ──
async function apiChecks(api, args) {
  console.log(`\nAPI  ${api}`);

  // If the API cannot even be reached, say so once instead of failing every check below
  try {
    await http(`${api}/health`);
  } catch (err) {
    record('fail', 'the API can be reached', `${err?.cause?.code || err?.name || 'no answer'}: nothing answered at ${api}. Is the address right, and is the API running?`);
    return false;
  }

  await check('health: answers, database connected', async () => {
    const { res, body, ms } = await json(`${api}/health`);
    if (res.status !== 200) throw new Error(`answered ${res.status}`);
    const health = body?.data ?? body; // the API wraps its answers as { success, data }
    if (health?.status !== 'ok') throw new Error(`status is "${health?.status}"`);
    if (health?.database !== 'connected') throw new Error(`database is "${health?.database}"`);
    return `${ms} ms`;
  });

  await check('shipping settings load', async () => {
    const { res, body } = await json(`${api}/api/v1/config/shipping`);
    const rule = body?.data;
    if (res.status !== 200 || !rule) throw new Error(`answered ${res.status}`);
    if (!Number.isInteger(rule.flatPaise) || !Number.isInteger(rule.freeAbovePaise)) throw new Error('the rule has no amounts');
    return `₹${rule.flatPaise / 100} flat, free above ₹${rule.freeAbovePaise / 100}`;
  });

  await check('the delivery check answers (768001 is served)', async () => {
    const { res, body } = await json(`${api}/api/v1/delivery/check?pin=768001`);
    if (res.status !== 200 || !body?.data) throw new Error(`answered ${res.status}`);
    if (!body.data.serviceable) throw new Error(`it says 768001 is not served: ${body.data.message}`);
    return `${body.data.days.min}\u2013${body.data.days.max} days`;
  });

  await check('categories load', async () => {
    const { res, body } = await json(`${api}/api/v1/categories`);
    if (res.status !== 200 || !Array.isArray(body?.data)) throw new Error(`answered ${res.status}`);
    if (body.data.length === 0) throw warning('no categories yet (create them in the admin)');
    return `${body.data.length} categories`;
  });

  await check('shop list loads', async () => {
    const { res, body } = await json(`${api}/api/v1/products?limit=5`);
    if (res.status !== 200 || !Array.isArray(body?.data?.items)) throw new Error(`answered ${res.status}`);
    if (body.data.total === 0) throw warning('the shop has no published products yet');
    return `${body.data.total} products`;
  });

  await check('shop filters load', async () => {
    const { res } = await json(`${api}/api/v1/products/filters`);
    if (res.status !== 200) throw new Error(`answered ${res.status}`);
  });

  await check('the Swagger page is off (a live API should not show it)', async () => {
    const { res } = await http(`${api}/api/docs`);
    if (res.status === 404) return;
    throw warning(`/api/docs answers ${res.status}; set NODE_ENV=production and leave ENABLE_API_DOCS unset`);
  });

  if (args['outsider-phone']) {
    await check('a number that is not on the pilot list is refused', async () => {
      const { res, body } = await json(`${api}/api/v1/auth/otp/request`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: args['outsider-phone'] }),
      });
      if (res.status === 403 && body?.error?.code === 'LOGIN_NOT_OPEN') return;
      throw new Error(`expected a refusal (403 LOGIN_NOT_OPEN) but got ${res.status}: the site may be open to everyone`);
    });
  }

  if (args['login-phone']) {
    let token = null;
    await check('a listed number can ask for a code', async () => {
      const { res, body } = await json(`${api}/api/v1/auth/otp/request`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: args['login-phone'] }),
      });
      if (res.status !== 200 || !body?.success) throw new Error(`answered ${res.status}: ${body?.error?.message || ''}`);
    });
    await check('it can sign in with the fixed code', async () => {
      const { res, body } = await json(`${api}/api/v1/auth/otp/verify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: args['login-phone'], otp: String(args.otp || '123456') }),
      });
      token = body?.data?.accessToken || null;
      if (res.status !== 200 || !token) throw new Error(`answered ${res.status}: ${body?.error?.message || ''}`);
    });
    if (token) {
      let isAdmin = false;
      await check('the signed-in profile loads', async () => {
        const { res, body } = await json(`${api}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } });
        if (res.status !== 200 || !body?.data?.id) throw new Error(`answered ${res.status}`);
      });
      await check('the sign-in knows whether this is an admin', async () => {
        const { res, body } = await json(`${api}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
        if (res.status !== 200) throw new Error(`answered ${res.status}`);
        isAdmin = body?.data?.type === 'admin';
        return isAdmin ? 'an admin' : 'a customer';
      });
      if (isAdmin) {
        await check('the admin order list loads', async () => {
          const { res, body } = await json(`${api}/api/v1/admin/orders?limit=1`, { headers: { authorization: `Bearer ${token}` } });
          if (res.status !== 200 || !Array.isArray(body?.data?.items)) throw new Error(`answered ${res.status}`);
          return `${body.data.counts?.placed ?? 0} placed`;
        });
      }
    }
  }
  return true;
}

// ── CORS: the browser only talks to the API when the API names the site's address ──
async function corsCheck(api, label, origin) {
  await check(`CORS lets the ${label} (${origin}) talk to the API`, async () => {
    const { res } = await http(`${api}/health`, { headers: { Origin: origin } });
    const allowed = res.headers.get('access-control-allow-origin');
    if (allowed !== origin) {
      throw new Error(`the API did not allow this address (it said ${allowed ? `"${allowed}"` : 'nothing'}); add it to CORS_ORIGINS exactly as written, with https and no slash at the end`);
    }
  });
}

// ── website and admin checks ──
// A Next.js site has its API address written into its scripts when it is built. If that was wrong when it was built,
// the pages load fine and then every request fails, so look for the real API address inside the scripts.
async function builtWithApi(pageUrl, api) {
  const { res, ms } = await http(pageUrl);
  if (res.status !== 200) throw new Error(`answered ${res.status}`);
  const html = await res.text();
  const base = new URL(pageUrl);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map((m) => new URL(m[1], base).href);
  const unique = [...new Set(scripts)].slice(0, 25);
  const apiHost = new URL(api).origin;
  for (const src of unique) {
    try {
      const { res: r } = await http(src);
      if (r.ok && (await r.text()).includes(apiHost)) return { ms, found: true };
    } catch {
      /* try the next script */
    }
  }
  return { ms, found: false, scripts: unique.length };
}

async function siteChecks(label, site, api, { pages, mustSay, apiReachable }) {
  console.log(`\n${label.toUpperCase()}  ${site}`);
  for (const [path, name] of pages) {
    await check(`${name} loads`, async () => {
      const { res, ms } = await http(site + path);
      if (res.status !== 200) throw new Error(`answered ${res.status}`);
      const text = await res.text();
      if (mustSay && !text.toLowerCase().includes(mustSay.toLowerCase())) throw new Error(`the page does not mention "${mustSay}"; it may be an error page`);
      return `${ms} ms`;
    });
  }
  await check(`${label} was built with this API address`, async () => {
    const result = await builtWithApi(site + pages[0][0], api);
    if (!result.found) {
      throw new Error(`${new URL(api).origin} was not found in the page scripts (${result.scripts} checked). Set NEXT_PUBLIC_API_URL in Vercel to the API address and redeploy`);
    }
  });
  if (apiReachable) await corsCheck(api, label, new URL(site).origin);
}

// ── main ──
async function main() {
  const args = parseArgs(process.argv.slice(2));
  let api, web, admin;
  try {
    api = normalise('api', args.api);
    web = normalise('web', args.web);
    admin = normalise('admin', args.admin);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (!api) {
    console.error('Usage: npm run smoke -- --api https://<api> [--web https://<website>] [--admin https://<admin>] [--login-phone +91…] [--outsider-phone +91…]');
    process.exit(2);
  }

  console.log('Smoke test (reads only; no orders or data are created)');
  const apiReachable = await apiChecks(api, args);
  if (web) {
    await siteChecks('website', web, api, { pages: [['/', 'the home page'], ['/shop', 'the shop page']], mustSay: 'juhar', apiReachable });
  }
  if (admin) {
    await siteChecks('admin', admin, api, { pages: [['/login', 'the admin sign-in page']], mustSay: 'juhar', apiReachable });
  }

  const failed = results.filter((r) => r.status === 'fail');
  const warned = results.filter((r) => r.status === 'warn');
  const passed = results.filter((r) => r.status === 'pass');
  console.log(`\n${passed.length} passed, ${warned.length} warnings, ${failed.length} failed`);
  if (failed.length) {
    console.log('\nWhat failed:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    console.log('\nThe runbook (docs/operations/runbook-pilot.md, section 9) lists the usual causes.');
    process.exit(1);
  }
  console.log('The deploy looks healthy.');
}

main().catch((err) => {
  console.error('The smoke test itself broke:', err instanceof Error ? err.message : err);
  process.exit(2);
});
