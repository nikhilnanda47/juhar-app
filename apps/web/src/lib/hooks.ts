import { useEffect, useRef, type EffectCallback, type MutableRefObject } from 'react';

/**
 * Runs once, when the screen first appears, and never again: a first load of the data, or an animation that plays once.
 *
 * Written once here (with its one lint exception) instead of leaving a lint warning on every screen that does this.
 * Use it only when "once, on arrival" really is what you want. If the effect should run again when a value changes,
 * use a normal `useEffect` with that value in its list.
 */
export function useOnMount(effect: EffectCallback): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on purpose: that is the whole point of this hook
  useEffect(effect, []);
}

/**
 * A box that always holds the newest version of `value` (usually a function). Read `.current` inside an effect or a
 * callback to call the newest version without making the effect run again every time the function is recreated.
 *
 *   const reload = useLatest(loadOrders);
 *   useEffect(() => { reload.current(); }, [filter]);   // runs when the filter changes, calls the current loadOrders
 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
