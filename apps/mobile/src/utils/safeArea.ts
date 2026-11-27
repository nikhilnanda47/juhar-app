import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { topPadding } from './topPadding';

/** The gap above a screen's title, never less than `base` (see topPadding.ts). */
export function useTopPadding(base: number): number {
  return topPadding(base, useSafeAreaInsets().top);
}
