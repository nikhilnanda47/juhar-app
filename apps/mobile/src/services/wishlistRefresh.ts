// When the saved items refresh by themselves. Taps on this phone update the screen at once; this is for
// changes made somewhere else (the website, another device) so the list and the count never need a restart:
//  - the app comes back to the foreground
//  - every 30 seconds while the app is open
// (Screens also refresh when they come into view.) Bursts of events are merged into one refresh.
// This file has no React Native imports so it can be tested on its own.

export const REFRESH_DEBOUNCE_MS = 250;
export const SAFETY_REFRESH_MS = 30_000;

export interface WishlistRefreshOptions {
  refresh: () => void;
  /** Calls the listener whenever the app comes back to the foreground; returns how to stop listening */
  onForeground: (listener: () => void) => () => void;
  /** Is the app in the foreground right now? */
  isActive: () => boolean;
  debounceMs?: number;
  safetyMs?: number;
}

/** Starts refreshing; returns a function that stops it. */
export function startWishlistRefresh(options: WishlistRefreshOptions): () => void {
  const { refresh, onForeground, isActive, debounceMs = REFRESH_DEBOUNCE_MS, safetyMs = SAFETY_REFRESH_MS } = options;
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
  const stopForeground = onForeground(schedule);

  return () => {
    if (timer) clearTimeout(timer);
    clearInterval(safety);
    stopForeground();
  };
}
