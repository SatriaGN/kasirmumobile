import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AppShell from './providers/AppShell';
import { AppProviders } from './store/AppProviders';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <AppShell>
      <AppProviders>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppProviders>
    </AppShell>
  );
}
