export {}; // keeps this file a module
import { REFRESH_DEBOUNCE_MS, SAFETY_REFRESH_MS, startWishlistRefresh } from './wishlistRefresh';

describe('startWishlistRefresh', () => {
  let refresh: jest.Mock;
  let foreground: () => void;
  let active: boolean;
  let stopForeground: jest.Mock;
  let stop: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    refresh = jest.fn();
    active = true;
    foreground = () => {};
    stopForeground = jest.fn();
    stop = startWishlistRefresh({
      refresh,
      onForeground: (listener) => { foreground = listener; return stopForeground; },
      isActive: () => active,
    });
  });
  afterEach(() => { stop(); jest.useRealTimers(); });

  it('does nothing by itself right away', () => {
    jest.advanceTimersByTime(SAFETY_REFRESH_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes when the app comes back to the foreground, once for a burst', () => {
    foreground(); foreground(); foreground();
    jest.advanceTimersByTime(REFRESH_DEBOUNCE_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes every 30 seconds while the app is open (for changes made on the website)', () => {
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 3);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('does not ask the server every 30 seconds while the app is in the background', () => {
    active = false;
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 4);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stops completely when asked to', () => {
    stop();
    expect(stopForeground).toHaveBeenCalledTimes(1); // it stopped listening for the foreground
    jest.advanceTimersByTime(SAFETY_REFRESH_MS * 2); // and the 30-second timer is gone
    expect(refresh).not.toHaveBeenCalled();
  });
});
