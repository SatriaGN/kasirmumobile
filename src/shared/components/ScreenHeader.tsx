import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Fonts } from '@shared/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Gradient stops; defaults to the Mint Breeze primary gradient. */
  colors?: readonly [string, string, ...string[]];
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  colors = ['#1DAA8B', '#4FD1B5'],
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={colors} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors[0]} />
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: Spacing.lg, paddingHorizontal: Spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: Fonts.sizes.xs, marginTop: 2 },
});
