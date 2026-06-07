import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
        {children}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
