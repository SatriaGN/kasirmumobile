import type { NavigatorScreenParams } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ─── Kasir ────────────────────────────────────────────────────────────────────
export type KasirTabParamList = {
  Kasir: { openPayment?: boolean; openCart?: boolean } | undefined;
  Hold: undefined;
  Riwayat: undefined;
  Profil: undefined;
};

export type KasirStackParamList = {
  Main: NavigatorScreenParams<KasirTabParamList>;
  CloseShift: undefined;
  Members: undefined;
  Debtor: undefined;
  Sync: undefined;
};

// ─── Per-screen prop helpers ────────────────────────────────────────────────────
export type KasirStackScreenProps<T extends keyof KasirStackParamList> = StackScreenProps<
  KasirStackParamList,
  T
>;
export type KasirTabScreenProps<T extends keyof KasirTabParamList> = BottomTabScreenProps<
  KasirTabParamList,
  T
>;
