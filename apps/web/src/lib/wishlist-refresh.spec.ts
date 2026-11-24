export {}; // keeps this file a module
import {
  REFRESH_DEBOUNCE_MS, SAFETY_REFRESH_MS, announceWishlistChanged, startWishlistRefresh,
} from './wishlist-refresh';
import { GUEST_WISHLIST_KEY } from './wishlist-state';

// A tiny stand-in for window, document and the channel to other tabs.
class FakeTarget {
  listeners = new Map<string, Set<(e?: any) => void>>();
  visibilityState = 'visible';
  posted: unknown[] = [];
  addEventListener(type: string, l: (e?: any) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(l);
  }
  removeEventListener(type: string, l: (e?: any) => void) { this.listeners.get(type)?.delete(l); }
  fire(type: string, event?: any) { this.listeners.get(type)?.forEach((l) => l(event)); }
  postMessage(m: unknown) { this.posted.push(m); }
  count() { return [...this.listeners.values()].reduce((n, s) => n + s.size, 0); }
}

describe('startWishlistRefresh', () => {
  let win: FakeTarget, doc: FakeTarget, channel: FakeTarget, refresh: jest.Mock, stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    win = new FakeTarget(); doc = new FakeTarget(); channel = new FakeTarget();
    refresh = jest.fn();
    stop = startWishlistRefresh(refresh, { win, doc, channel });
  });
  afterEach(() => { stop(); jest.useRealTimers(); });

  it('does nothing by itself right away', () => {
    jest.advanceTimersByTime(SAFETY_REFRESH_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes when the customer comes back to the window', () => {
    win.fire('focus');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the tab becomes visible, but not when it is hidden', () => {
    doc.visibilityState = 'hidden'; doc.fire('visibilitychange');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();
    doc.visibilityState = 'visible'; doc.fire('visibilitychange');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when another tab saved or removed something', () => {
    channel.fire('message', { data: 'changed' });
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when another tab changed the guest list, and ignores other storage changes (cart, login)', () => {
    win.fire('storage', { key: 'juhar_local_cart' });
    win.fire('storage', { key: 'juhar_token' });
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();
    win.fire('storage', { key: GUEST_WISHLIST_KEY });
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    win.fire('storage', { key: null }); // storage was cleared
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('merges a burst of events into one refresh', () => {
    win.fire('focus'); doc.fire('visibilitychange'); channel.fire('message'); win.fire('focus');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes every 30 seconds while the tab is visible (for changes made on the phone)', () => {
    jest.advanceTimersByTime(SAFETY_REFRESH_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('does not ask the server every 30 seconds from a tab nobody is looking at', () => {
    doc.visibilityState = 'hidden';
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 4);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stops completely when asked to', () => {
    stop();
    expect(win.count() + doc.count() + channel.count()).toBe(0);
    win.fire('focus'); channel.fire('message');
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('works in a browser with no channel to other tabs', () => {
    stop();
    const refresh2 = jest.fn();
    const stop2 = startWishlistRefresh(refresh2, { win, doc, channel: null });
    win.fire('focus');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh2).toHaveBeenCalledTimes(1);
    stop2();
  });
});

describe('announceWishlistChanged', () => {
  it('tells the other tabs', () => {
    const channel = new FakeTarget();
    announceWishlistChanged(channel);
    expect(channel.posted).toEqual(['changed']);
  });

  it('does not crash without a channel or with a closed one', () => {
    expect(() => announceWishlistChanged(null)).not.toThrow();
    const closed = { addEventListener() {}, removeEventListener() {}, postMessage() { throw new Error('closed'); } };
    expect(() => announceWishlistChanged(closed)).not.toThrow();
  });
});
