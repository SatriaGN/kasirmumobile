import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@shared/theme';
import type { IconName } from '@shared/types/icon';

import POSScreen from '@features/pos/screens/POSScreen';
import HoldScreen from '@features/pos/screens/HoldScreen';
import RiwayatScreen from '@features/transactions/screens/RiwayatScreen';
import CloseShiftScreen from '@features/shift/screens/CloseShiftScreen';
import KasirProfileScreen from '@features/auth/screens/KasirProfileScreen';
import MembersScreen from '@features/members/screens/MembersScreen';
import DebtorScreen from '@features/debt/screens/DebtorScreen';
import SyncScreen from '@features/sync/screens/SyncScreen';
import type { KasirStackParamList, KasirTabParamList } from './types';

const Tab = createBottomTabNavigator<KasirTabParamList>();
const Stack = createStackNavigator<KasirStackParamList>();

interface TabMeta {
  name: keyof KasirTabParamList;
  icon: IconName;
  label: string;
}

const TAB_META: TabMeta[] = [
  { name: 'Kasir', icon: 'storefront', label: 'Kasir' },
  { name: 'Hold', icon: 'pause-circle', label: 'Tersimpan' },
  { name: 'Riwayat', icon: 'time', label: 'Riwayat' },
  { name: 'Profil', icon: 'person', label: 'Profil' },
];

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TAB_META.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: 8 + insets.bottom }],
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarIcon: ({ focused, color }) => {
            const iconName = (focused ? tab?.icon : `${tab?.icon}-outline`) as IconName;
            return (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name={iconName} size={focused ? 22 : 20} color={color} />
              </View>
            );
          },
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>{tab?.label}</Text>,
        };
      }}
    >
      <Tab.Screen name="Kasir" component={POSScreen} />
      <Tab.Screen name="Hold" component={HoldScreen} />
      <Tab.Screen name="Riwayat" component={RiwayatScreen} />
      <Tab.Screen name="Profil" component={KasirProfileScreen} />
    </Tab.Navigator>
  );
}

export default function KasirNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="CloseShift" component={CloseShiftScreen} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="Debtor" component={DebtorScreen} />
      <Stack.Screen name="Sync" component={SyncScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 4,
    elevation: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tabIconWrap: { width: 36, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabIconActive: { backgroundColor: Colors.primarySoft },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
});
