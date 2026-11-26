// Sharing a saree from the app: the phone's own share sheet (WhatsApp, Messages, ...) with the saree's title and
// the link to its page on the website. The website address is a build setting (EXPO_PUBLIC_WEB_URL); when it is
// not set, the public address is used.

export const DEFAULT_WEB_URL = 'https://juhar.co.in';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** The website's address for share links. Unset means the default; a set but unusable value is an error. */
export function resolveWebBase(raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return DEFAULT_WEB_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`EXPO_PUBLIC_WEB_URL "${value}" is not a web address. Write it like https://juhar.co.in.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`EXPO_PUBLIC_WEB_URL "${value}" must start with https://`);
  if (/replace/i.test(value)) throw new Error(`EXPO_PUBLIC_WEB_URL "${value}" is still a placeholder.`);
  return value.replace(/\/+$/, '');
}

export function productShareUrl(slug: string, base: string = DEFAULT_WEB_URL): string {
  return `${base.replace(/\/+$/, '')}/shop/${encodeURIComponent(slug)}`;
}

export interface ShareDeps {
  /** React Native's Share.share */
  share: (content: { message: string; url?: string; title?: string }) => Promise<{ action: string }>;
  copy: (text: string) => Promise<void>;
  webBase: string;
}

export async function shareProduct(
  product: { title: string; slug: string },
  deps: ShareDeps,
): Promise<{ outcome: ShareOutcome; url: string }> {
  const url = productShareUrl(product.slug, deps.webBase);
  try {
    const result = await deps.share({ title: product.title, message: `${product.title} on Juhar\n${url}`, url });
    // on iOS, closing the sheet is reported as "dismissedAction"; it is not a failure
    return { outcome: result?.action === 'dismissedAction' ? 'cancelled' : 'shared', url };
  } catch {
    // no share sheet here (the browser preview, an old phone): copy the link instead
    try {
      await deps.copy(url);
      return { outcome: 'copied', url };
    } catch {
      return { outcome: 'failed', url };
    }
  }
}
