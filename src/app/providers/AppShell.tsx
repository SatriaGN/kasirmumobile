import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * Applies the left/right safe-area insets to the whole app so content (and the
 * tab bar) is never hidden under a notch or the system navigation bar in
 * landscape. Top/bottom insets are handled per-screen. The black backdrop fills
 * the thin bars left at the notch side.
 */
function SafeAreaShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingLeft: insets.left, paddingRight: insets.right }}>
      {children}
    </View>
  );
}

/**
 * App "chrome" providers that are not domain state: gesture handling, safe-area
 * insets, and the status bar. Domain state lives in `@app/store/AppProviders`;
 * navigation lives in `@app/navigation`.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaShell>{children}</SafeAreaShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
