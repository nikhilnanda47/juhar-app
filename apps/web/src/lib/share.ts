// Sharing a saree: the browser's own share sheet when there is one (phones), otherwise the link is copied.
// The link is this website's own address plus the saree's page, so it works on whichever domain the site is on.

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareEnv {
  /** the website's address, like https://juhar.co.in (no path) */
  origin: string;
  /** navigator.share, when the browser has it */
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  writeClipboard?: (text: string) => Promise<void>;
}

export function productUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, '')}/shop/${encodeURIComponent(slug)}`;
}

/** What this browser can do, read from the window (kept out of shareProduct so it can be tested). */
export function browserShareEnv(): ShareEnv {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    origin: window.location.origin,
    share: nav && typeof nav.share === 'function' ? (data) => nav.share(data) : undefined,
    writeClipboard: nav?.clipboard ? (text) => nav.clipboard.writeText(text) : undefined,
  };
}

/** The old way of copying, for a page the browser will not let use the clipboard (plain http, old browsers). */
function copyTheOldWay(text: string): boolean {
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(box);
    return ok;
  } catch {
    return false;
  }
}

export async function shareProduct(
  product: { title: string; slug: string },
  env: ShareEnv = browserShareEnv(),
): Promise<{ outcome: ShareOutcome; url: string }> {
  const url = productUrl(env.origin, product.slug);

  if (env.share) {
    try {
      await env.share({ title: product.title, text: `${product.title} on Juhar`, url });
      return { outcome: 'shared', url };
    } catch (err) {
      // closing the share sheet is not a failure, and nothing more is done
      if ((err as { name?: string })?.name === 'AbortError') return { outcome: 'cancelled', url };
      // any other trouble with the share sheet: fall back to copying the link
    }
  }

  try {
    if (env.writeClipboard) {
      await env.writeClipboard(url);
      return { outcome: 'copied', url };
    }
  } catch {
    // fall through to the old way
  }
  return { outcome: copyTheOldWay(url) ? 'copied' : 'failed', url };
}
