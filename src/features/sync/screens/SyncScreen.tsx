import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, type ListRenderItem } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { ScreenHeader } from '@shared';
import type { IconName } from '@shared/types/icon';
import { formatDateTime } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSync } from '@features/sync/store/sync.store';
import type { OutboxItem, OutboxStatus, SyncColor } from '@features/sync/types/sync.type';
import { useTransactions } from '@features/transactions/store/transactions.store';

const STATUS_META: Record<OutboxStatus, { icon: IconName; color: string; label: string }> = {
  pending: { icon: 'time-outline', color: Colors.warning, label: 'Menunggu' },
  sending: { icon: 'sync-outline', color: Colors.info, label: 'Mengirim' },
  synced: { icon: 'checkmark-circle', color: Colors.success, label: 'Tersinkron' },
  needs_review: { icon: 'warning', color: Colors.error, label: 'Perlu Tinjauan' },
};

interface SyncScreenProps {
  navigation: { goBack: () => void };
}

export default function SyncScreen({ navigation }: SyncScreenProps) {
  const { online, toggleOnline, outbox, syncOutbox, syncStatus } = useSync();
  const { transactions } = useTransactions();
  const insets = useSafeAreaInsets();
  const unsyncedTx = transactions.filter((t) => t.synced === false);

  const items: OutboxItem[] = outbox.length
    ? outbox
    : unsyncedTx.map((t) => ({
        id: t.clientTxnId || t.id,
        type: 'transaction',
        status: 'pending',
        label: `Transaksi ${t.code}`,
        message: 'Belum tersinkron',
        createdAt: t.createdAt,
      }));

  const renderItem: ListRenderItem<OutboxItem> = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.pending;
    return (
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: meta.color + '22' }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Text style={styles.rowMsg}>
            {item.message} · {formatDateTime(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.color + '22' }]}>
          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Status Sinkronisasi" subtitle={syncStatus.label} onBack={() => navigation.goBack()} />

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, { backgroundColor: online ? Colors.success : Colors.error }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{online ? 'Terhubung (Online)' : 'Mode Offline'}</Text>
          <Text style={styles.statusDesc}>{items.length} item dalam antrian outbox</Text>
        </View>
        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: online ? Colors.errorLight : Colors.successLight }]} onPress={toggleOnline}>
          <Ionicons name={online ? 'cloud-offline-outline' : 'cloud-outline'} size={16} color={online ? Colors.error : Colors.success} />
          <Text style={[styles.toggleText, { color: online ? Colors.error : Colors.success }]}>{online ? 'Simulasi Offline' : 'Kembali Online'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <Legend color="green" label="Tersinkron" />
        <Legend color="yellow" label="Menunggu" />
        <Legend color="red" label="Offline" />
        <Legend color="amber" label="Perlu tinjauan" />
      </View>

      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-done-outline" size={56} color={Colors.success} />
            <Text style={styles.emptyText}>Semua tersinkron</Text>
            <Text style={styles.emptySub}>Tidak ada item di antrian</Text>
          </View>
        }
      />

      {items.length > 0 && online && (
        <View style={[styles.footer, { paddingBottom: Spacing.base + insets.bottom }]}>
          <TouchableOpacity style={styles.syncBtn} onPress={syncOutbox} activeOpacity={0.88}>
            <LinearGradient colors={['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.syncGrad}>
              <Ionicons name="sync" size={20} color={Colors.white} />
              <Text style={styles.syncText}>Sinkronkan Sekarang</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: SyncColor; label: string }) {
  const dot: Record<SyncColor, string> = { green: '#2E7D32', yellow: '#F57F17', red: '#C62828', amber: '#FFB300' };
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: dot[color] }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, margin: Spacing.base, marginBottom: 0, padding: Spacing.md, borderRadius: Radius.lg, ...Shadow.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  statusDesc: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.full },
  toggleText: { fontSize: 10, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: Spacing.base },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.base },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, ...Shadow.sm },
  rowIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  rowMsg: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md },
  emptySub: { fontSize: Fonts.sizes.sm, color: Colors.textLight, marginTop: 4 },
  footer: { padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  syncBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  syncGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  syncText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
