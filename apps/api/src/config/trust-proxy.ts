/**
 * Reads the TRUST_PROXY setting for Express.
 * Behind a proxy (Railway, nginx) the API only sees the proxy's address unless
 * it is told how many proxies to trust, and then every customer would share
 * one IP address in the rate limits.
 *
 *   unset / empty   -> undefined (do not trust X-Forwarded-For)
 *   "1", "2", ...   -> number of proxy hops to trust (recommended)
 *   "true"/"false"  -> trust every hop / none (true can be spoofed by clients)
 *   anything else   -> passed to Express as is (for example "loopback")
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}
