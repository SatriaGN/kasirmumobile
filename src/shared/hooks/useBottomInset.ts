import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom safe-area inset plus an optional extra pad. Most list/footer screens
 * compute `base + insets.bottom`; this centralizes that small pattern.
 */
export function useBottomInset(extra = 0): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}
