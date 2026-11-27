// The gap above a screen's title. The screens used a fixed 48 or 56, which suits the browser (no status bar) but puts
// titles under the clock on a phone with a notch or Dynamic Island. This keeps the old gap where it is already enough
// (browser, Android) and grows it on a phone whose status bar is taller.
const BREATHING_ROOM = 10;

export function topPadding(base: number, safeAreaTop: number): number {
  return Math.max(base, safeAreaTop + BREATHING_ROOM);
}
