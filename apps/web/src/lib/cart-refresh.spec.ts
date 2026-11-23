export {}; // keeps this file a module
import { CART_CHANGED_EVENT } from './cart-events';
import { REFRESH_DEBOUNCE_MS, SAFETY_REFRESH_MS, startCartRefresh } from './cart-refresh';

// A tiny stand-in for window/document that lets the test fire events.
class FakeTarget {
  listeners = new Map<string, Set<() => void>>();
  visibilityState = 'visible';
  addEventListener(type: string, l: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(l);
  }
  removeEventListener(type: string, l: () => void) {
    this.listeners.get(type)?.delete(l);
  }
  fire(type: string) {
    this.listeners.get(type)?.forEach((l) => l());
  }
  count() {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
}

describe('startCartRefresh', () => {
  let win: FakeTarget, doc: FakeTarget, refresh: jest.Mock, stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    win = new FakeTarget();
    doc = new FakeTarget();
    refresh = jest.fn();
    stop = startCartRefresh(refresh, { win, doc });
  });
  afterEach(() => {
    stop();
    jest.useRealTimers();
  });

  it('does not refresh by itself when nothing happens (no 2-second polling)', () => {
    jest.advanceTimersByTime(4 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes shortly after the cart changes', () => {
    win.fire(CART_CHANGED_EVENT);
    expect(refresh).not.toHaveBeenCalled(); // waits a moment to merge bursts
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('merges a burst of changes into one refresh (like syncing a guest cart with many items)', () => {
    for (let i = 0; i < 8; i++) {
      win.fire(CART_CHANGED_EVENT);
      jest.advanceTimersByTime(50);
    }
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each(['storage', 'focus'])('refreshes on the window "%s" event (other tab changed it, or you came back)', (type) => {
    win.fire(type);
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the tab becomes visible again, but not when it is hidden', () => {
    doc.visibilityState = 'hidden';
    doc.fire('visibilitychange');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();

    doc.visibilityState = 'visible';
    doc.fire('visibilitychange');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('coming back to the tab fires focus and visibilitychange together but refreshes once', () => {
    win.fire('focus');
    doc.fire('visibilitychange');
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  describe('safety refresh', () => {
    it('refreshes every 5 minutes while the tab is visible', () => {
      jest.advanceTimersByTime(SAFETY_REFRESH_MS);
      expect(refresh).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(SAFETY_REFRESH_MS);
      expect(refresh).toHaveBeenCalledTimes(2);
    });

    it('skips it while the tab is hidden', () => {
      doc.visibilityState = 'hidden';
      jest.advanceTimersByTime(3 * SAFETY_REFRESH_MS);
      expect(refresh).not.toHaveBeenCalled();
    });

    it('is 5 minutes', () => {
      expect(SAFETY_REFRESH_MS).toBe(300_000);
    });
  });

  it('stopping removes every listener and timer', () => {
    stop();
    expect(win.count() + doc.count()).toBe(0);
    win.fire(CART_CHANGED_EVENT);
    jest.advanceTimersByTime(2 * SAFETY_REFRESH_MS);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stopping cancels a refresh that was about to run', () => {
    win.fire(CART_CHANGED_EVENT);
    stop();
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();
  });
});
