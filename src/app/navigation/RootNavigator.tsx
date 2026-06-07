import React from 'react';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useShift } from '@features/shift/store/shift.store';
import LoginScreen from '@features/auth/screens/LoginScreen';
import SelectOutletScreen from '@features/outlet/screens/SelectOutletScreen';
import OpenShiftScreen from '@features/shift/screens/OpenShiftScreen';
import KasirNavigator from './KasirNavigator';

/**
 * Top-level flow router (kasir-only app).
 *  kasir → select outlet → open shift → POS tabs
 */
export default function RootNavigator() {
  const { isLoggedIn, user } = useAuth();
  const { activeOutlet } = useOutlet();
  const { activeShift } = useShift();

  if (!isLoggedIn || !user) return <LoginScreen />;

  if (!activeOutlet) return <SelectOutletScreen />;
  if (!activeShift) return <OpenShiftScreen />;
  return <KasirNavigator />;
}
