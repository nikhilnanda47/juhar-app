// When the saved items refresh by themselves. Taps in this tab update the screen at once; this is for
// changes made somewhere else (another tab, the phone app) so the list and the count never need a reload:
//  - the customer comes back to the tab or window (focus / visibilitychange)
//  - another tab of this site saved or removed something (BroadcastChannel), or changed the guest list (storage event)
//  - every 30 seconds while the tab is visible (for example something was saved in the phone app)
// Bursts of events are merged into one refresh.

import { GUEST_WISHLIST_KEY } from './wishlist-state';

export const WISHLIST_CHANNEL = 'juhar-wishlist';
export const REFRESH_DEBOUNCE_MS = 250;
export const SAFETY_REFRESH_MS = 30_000;

type Listener = (event?: any) => void;

interface Target {
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
}

export interface WishlistRefreshEnv {
  win: Target;
  doc: Target & { readonly visibilityState: string };
  /** a channel to the other tabs of this site, when the browser has one */
  channel?: (Target & { postMessage(message: unknown): void }) | null;
  debounceMs?: number;
  safetyMs?: number;
}

// One channel per tab, used for sending and receiving (a channel does not hear its own messages)
let sharedChannel: (Target & { postMessage(message: unknown): void }) | null | undefined;

function browserChannel() {
  if (sharedChannel === undefined) {
    sharedChannel = typeof BroadcastChannel !== 'undefined' ? (new BroadcastChannel(WISHLIST_CHANNEL) as any) : null;
  }
  return sharedChannel;
}

/** Tell the other tabs that the saved items changed here. */
export function announceWishlistChanged(channel = browserChannel()): void {
  try {
    channel?.postMessage('changed');
  } catch {
    // a closed channel: the other tabs still refresh when the customer returns to them
  }
}

/** Starts refreshing; returns a function that stops it. */
export function startWishlistRefresh(
  refresh: () => void,
  env: Partial<WishlistRefreshEnv> = {},
): () => void {
  const win = env.win ?? window;
  const doc = env.doc ?? document;
  const channel = env.channel === undefined ? browserChannel() : env.channel;
  const debounceMs = env.debounceMs ?? REFRESH_DEBOUNCE_MS;
  const safetyMs = env.safetyMs ?? SAFETY_REFRESH_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      refresh();
    }, debounceMs);
  };
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') schedule();
  };
  // the browser's storage event also fires for the cart and the login; only the guest list matters here
  const onStorage: Listener = (event) => {
    if (!event || event.key === GUEST_WISHLIST_KEY || event.key === null) schedule();
  };
  const safety = setInterval(() => {
    if (doc.visibilityState === 'visible') refresh();
  }, safetyMs);

  win.addEventListener('focus', schedule);
  win.addEventListener('storage', onStorage);
  doc.addEventListener('visibilitychange', onVisibility);
  channel?.addEventListener('message', schedule);

  return () => {
    if (timer) clearTimeout(timer);
    clearInterval(safety);
    win.removeEventListener('focus', schedule);
    win.removeEventListener('storage', onStorage);
    doc.removeEventListener('visibilitychange', onVisibility);
    channel?.removeEventListener('message', schedule);
  };
}
