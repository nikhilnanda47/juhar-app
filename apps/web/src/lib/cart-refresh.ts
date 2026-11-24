// When the cart badge refreshes. It used to ask the server every 2 seconds; now it refreshes only when:
//  - something changes the cart (notifyCartChanged), here or in another tab (storage event)
//  - the customer comes back to the tab or window (focus / visibilitychange)
//  - every 5 minutes as a safety net while the tab is visible (for example the cart changed on a phone)
// Bursts of events are merged into one refresh.

import { CART_CHANGED_EVENT } from './cart-events';

export const REFRESH_DEBOUNCE_MS = 250;
export const SAFETY_REFRESH_MS = 5 * 60_000;

interface Target {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface CartRefreshEnv {
  win: Target;
  doc: Target & { readonly visibilityState: string };
  debounceMs?: number;
  safetyMs?: number;
}

/** Starts refreshing; returns a function that stops it. */
export function startCartRefresh(
  refresh: () => void,
  env: CartRefreshEnv = { win: window, doc: document },
): () => void {
  const { win, doc, debounceMs = REFRESH_DEBOUNCE_MS, safetyMs = SAFETY_REFRESH_MS } = env;
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
  const safety = setInterval(() => {
    if (doc.visibilityState === 'visible') refresh();
  }, safetyMs);

  win.addEventListener(CART_CHANGED_EVENT, schedule);
  win.addEventListener('storage', schedule);
  win.addEventListener('focus', schedule);
  doc.addEventListener('visibilitychange', onVisibility);

  return () => {
    if (timer) clearTimeout(timer);
    clearInterval(safety);
    win.removeEventListener(CART_CHANGED_EVENT, schedule);
    win.removeEventListener('storage', schedule);
    win.removeEventListener('focus', schedule);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}
