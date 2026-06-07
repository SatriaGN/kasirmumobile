import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Alert,
  type ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import type { Outlet } from '@features/outlet/types/outlet.type';

export default function SelectOutletScreen() {
  const { outlets, selectOutlet } = useOutlet();
  const { user, logout } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Kasir only sees assigned outlets
  const visibleOutlets = outlets.filter((o) => user?.outletIds?.includes(o.id));

  const handleContinue = () => {
    if (!selectedId) {
      Alert.alert('Perhatian', 'Pilih outlet terlebih dahulu');
      return;
    }
    const outlet = visibleOutlets.find((o) => o.id === selectedId);
    if (outlet) selectOutlet(outlet);
  };

  const renderItem: ListRenderItem<Outlet> = ({ item }) => {
    const isOn = selectedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.outletCard, isOn && styles.outletCardOn]}
        onPress={() => setSelectedId(item.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.outletIcon, isOn && styles.outletIconOn]}>
          <Ionicons name="storefront" size={26} color={isOn ? Colors.white : Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.outletName}>{item.name}</Text>
          <View style={styles.outletMeta}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.outletAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Aktif</Text>
          </View>
        </View>
        <View style={[styles.radio, isOn && styles.radioOn]}>
          {isOn && <Ionicons name="checkmark" size={16} color={Colors.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerTop}>
          <View style={styles.userPill}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInit}>{user?.name?.[0]}</Text>
            </View>
            <Text style={styles.userPillName} numberOfLines={1}>
              {user?.name}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Pilih Outlet</Text>
        <Text style={styles.sub}>Tentukan outlet tempat Anda bertugas hari ini</Text>
      </LinearGradient>

      <FlatList
        data={visibleOutlets}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.footer, { paddingBottom: Spacing.base + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.continueBtn, !selectedId && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selectedId}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={selectedId ? ['#FF8A65', '#FFAB91'] : [Colors.border, Colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueGrad}
          >
            <Text style={styles.continueText}>Lanjut</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 220,
  },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  userInit: { color: Colors.primary, fontWeight: '800', fontSize: 12 },
  userPillName: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '600', maxWidth: 150 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.white, fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: Fonts.sizes.sm, marginTop: 4 },

  list: { padding: Spacing.base, gap: Spacing.md },
  outletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  outletCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  outletIcon: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  outletIconOn: { backgroundColor: Colors.primary },
  outletName: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.textPrimary },
  outletMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  outletAddress: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  footer: { padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  continueBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  continueBtnDisabled: { opacity: 0.6 },
  continueGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  continueText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
