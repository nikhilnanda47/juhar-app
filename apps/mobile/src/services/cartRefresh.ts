// When the cart badge refreshes. It used to ask the server every 3 seconds, even with the app in the
// background; now it refreshes only when:
//  - something changes the cart (see cartEvents)
//  - the app comes back to the foreground
//  - every 5 minutes as a safety net while the app is open (for example the cart changed on another device)
// Bursts of changes are merged into one refresh.
// This file has no React Native imports so it can be tested on its own.

export const REFRESH_DEBOUNCE_MS = 250;
export const SAFETY_REFRESH_MS = 5 * 60_000;

export interface CartRefreshOptions {
  refresh: () => void;
  /** Calls the listener whenever the cart changes; returns how to stop listening */
  subscribe: (listener: () => void) => () => void;
  /** Calls the listener whenever the app comes back to the foreground; returns how to stop listening */
  onForeground: (listener: () => void) => () => void;
  /** Is the app in the foreground right now? */
  isActive: () => boolean;
  debounceMs?: number;
  safetyMs?: number;
}

/** Starts refreshing; returns a function that stops it. */
export function startCartRefresh(options: CartRefreshOptions): () => void {
  const { refresh, subscribe, onForeground, isActive, debounceMs = REFRESH_DEBOUNCE_MS, safetyMs = SAFETY_REFRESH_MS } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      refresh();
    }, debounceMs);
  };
  const safety = setInterval(() => {
    if (isActive()) refresh();
  }, safetyMs);

  const stopChanges = subscribe(schedule);
  const stopForeground = onForeground(schedule);

  return () => {
    if (timer) clearTimeout(timer);
    clearInterval(safety);
    stopChanges();
    stopForeground();
  };
}
