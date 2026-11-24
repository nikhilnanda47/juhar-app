export {}; // keeps this file a module
import { REFRESH_DEBOUNCE_MS, SAFETY_REFRESH_MS, startCartRefresh } from './cartRefresh';

describe('startCartRefresh', () => {
  let refresh: jest.Mock;
  let changed: () => void;
  let foreground: () => void;
  let active: boolean;
  let stopChanges: jest.Mock, stopForeground: jest.Mock;
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    refresh = jest.fn();
    active = true;
    changed = () => {};
    foreground = () => {};
    stopChanges = jest.fn();
    stopForeground = jest.fn();
    stop = startCartRefresh({
      refresh,
      subscribe: (l) => { changed = l; return stopChanges; },
      onForeground: (l) => { foreground = l; return stopForeground; },
      isActive: () => active,
    });
  });
  afterEach(() => {
    stop();
    jest.useRealTimers();
  });

  it('does not refresh by itself when nothing happens (no 3-second polling)', () => {
    jest.advanceTimersByTime(4 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes shortly after the cart changes', () => {
    changed();
    expect(refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('merges a burst of changes into one refresh (like syncing a guest cart with many items)', () => {
    for (let i = 0; i < 8; i++) {
      changed();
      jest.advanceTimersByTime(50);
    }
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the app comes back to the foreground', () => {
    foreground();
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  describe('safety refresh', () => {
    it('refreshes every 5 minutes while the app is open', () => {
      jest.advanceTimersByTime(SAFETY_REFRESH_MS);
      expect(refresh).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(SAFETY_REFRESH_MS);
      expect(refresh).toHaveBeenCalledTimes(2);
    });

    it('skips it while the app is in the background', () => {
      active = false;
      jest.advanceTimersByTime(3 * SAFETY_REFRESH_MS);
      expect(refresh).not.toHaveBeenCalled();
    });

    it('is 5 minutes', () => {
      expect(SAFETY_REFRESH_MS).toBe(300_000);
    });
  });

  it('stopping stops listening and cancels the timers', () => {
    stop();
    expect(stopChanges).toHaveBeenCalledTimes(1);
    expect(stopForeground).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2 * SAFETY_REFRESH_MS);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stopping cancels a refresh that was about to run', () => {
    changed();
    stop();
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).not.toHaveBeenCalled();
  });
});
