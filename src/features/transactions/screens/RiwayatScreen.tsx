import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  type ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { ScreenHeader } from '@shared';
import { formatCurrency, formatDateTime } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/store/auth.store';
import { useShift } from '@features/shift/store/shift.store';
import { useTransactions } from '@features/transactions/store/transactions.store';
import type { Transaction, TransactionStatus } from '@features/transactions/types/transactions.type';

type FilterKey = 'all' | TransactionStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'completed', label: 'Selesai' },
  { key: 'void_requested', label: 'Menunggu Void' },
  { key: 'voided', label: 'Void' },
];

const STATUS_BADGE: Record<TransactionStatus, { bg: string; color: string; label: string }> = {
  completed: { bg: Colors.successLight, color: Colors.success, label: 'Selesai' },
  voided: { bg: Colors.errorLight, color: Colors.error, label: 'Void' },
  void_requested: { bg: Colors.warningLight, color: Colors.warning, label: 'Menunggu Persetujuan' },
};

interface RiwayatScreenProps {
  navigation: { goBack: () => void };
}

export default function RiwayatScreen({ navigation }: RiwayatScreenProps) {
  const { transactions, voidTransaction } = useTransactions();
  const { activeShift } = useShift();
  const { hasPermission } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [voidModal, setVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = useMemo(
    () => transactions.filter((t) => filter === 'all' || t.status === filter),
    [transactions, filter]
  );

  const stats = useMemo(() => {
    const c = filtered.filter((t) => t.status === 'completed');
    return { count: c.length, total: c.reduce((s, t) => s + t.total, 0) };
  }, [filtered]);

  const confirmVoid = () => {
    if (!voidReason.trim()) {
      Alert.alert('Perhatian', 'Mohon isi alasan void');
      return;
    }
    if (!detail) return;
    const res = voidTransaction(detail.id, voidReason.trim());
    setVoidModal(false);
    setVoidReason('');
    setDetail(null);
    Alert.alert(
      res.requiresApproval ? 'Permintaan Dikirim' : 'Void Berhasil',
      res.requiresApproval ? 'Menunggu persetujuan Owner.' : 'Transaksi telah dibatalkan & stok dikembalikan.'
    );
  };

  const renderItem: ListRenderItem<Transaction> = ({ item }) => {
    const badge = STATUS_BADGE[item.status] || { bg: Colors.borderLight, color: Colors.textSecondary, label: item.status };
    return (
      <TouchableOpacity style={styles.row} onPress={() => setDetail(item)} activeOpacity={0.85}>
        <View style={styles.rowIcon}>
          <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowId}>{item.code}</Text>
          <Text style={styles.rowMeta}>
            {formatDateTime(item.createdAt)} · {item.method} · {item.cashier}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.rowAmount}>{formatCurrency(item.total)}</Text>
          <Text style={styles.rowItems}>{item.items.length} item</Text>
          {item.credit && <Text style={styles.creditTag}>Kredit</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Riwayat Transaksi"
        subtitle={`Shift ${activeShift?.id?.slice(-6) || '-'} · ${stats.count} selesai · ${formatCurrency(stats.total)}`}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipOn]} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Tidak Ada Riwayat</Text>
          </View>
        }
      />

      <Modal visible={!!detail} transparent animationType="slide">
        <View style={[styles.overlay, { paddingLeft: insets.left, paddingRight: insets.right }]}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setDetail(null)} />
          <View style={[styles.detailSheet, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailTitle}>{detail?.code}</Text>
                <Text style={styles.detailDate}>{detail && formatDateTime(detail.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetail(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Item ({detail?.items.length})</Text>
              <View style={styles.itemList}>
                {detail?.items.map((it, idx) => (
                  <View key={idx} style={styles.detailItem}>
                    <Text style={styles.detailItemEmoji}>{it.image}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailItemName}>{it.name}</Text>
                      <Text style={styles.detailItemPrice}>
                        {formatCurrency(it.hargaJual)} × {it.qty}
                      </Text>
                    </View>
                    <Text style={styles.detailItemSub}>{formatCurrency(it.subtotal)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Ringkasan</Text>
              <View style={styles.summary}>
                <SumLine label="Subtotal" val={formatCurrency(detail?.subtotal || 0)} />
                {(detail?.discount ?? 0) > 0 && <SumLine label="Diskon" val={`-${formatCurrency(detail?.discount ?? 0)}`} color={Colors.success} />}
                <SumLine label="Pajak" val={formatCurrency(detail?.tax || 0)} />
                <View style={[styles.sumLine, styles.sumTotal]}>
                  <Text style={styles.sumTotalLabel}>Total</Text>
                  <Text style={styles.sumTotalVal}>{formatCurrency(detail?.total || 0)}</Text>
                </View>
              </View>

              <View style={styles.metaBox}>
                <MetaLine label="Metode" val={detail?.method} />
                <MetaLine label="Kasir" val={detail?.cashier} />
                <MetaLine label="Pelanggan" val={detail?.memberName} />
                {detail?.voidReason ? <MetaLine label="Alasan Void" val={detail.voidReason} color={Colors.error} /> : null}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.reprintBtn} onPress={() => Alert.alert('Cetak Ulang', 'Mock: mengirim ke printer thermal…')} activeOpacity={0.85}>
                  <Ionicons name="print-outline" size={18} color={Colors.primary} />
                  <Text style={styles.reprintText}>Cetak Ulang</Text>
                </TouchableOpacity>
                {detail?.status === 'completed' && (
                  <TouchableOpacity style={styles.voidBtn} onPress={() => setVoidModal(true)} activeOpacity={0.85}>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.white} />
                    <Text style={styles.voidBtnText}>{hasPermission('canVoid') ? 'Void' : 'Ajukan Void'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={voidModal} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: 'center', paddingLeft: Spacing.xl + insets.left, paddingRight: Spacing.xl + insets.right }]}>
          <View style={styles.voidCard}>
            <Text style={styles.voidTitle}>{hasPermission('canVoid') ? 'Void Transaksi' : 'Ajukan Void'}</Text>
            <Text style={styles.voidSub}>{hasPermission('canVoid') ? 'Stok akan dikembalikan.' : 'Permintaan dikirim ke Owner untuk disetujui.'}</Text>
            <TextInput style={styles.voidInput} value={voidReason} onChangeText={setVoidReason} placeholder="Alasan void..." placeholderTextColor={Colors.textLight} multiline />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.voidCancelBtn}
                onPress={() => {
                  setVoidModal(false);
                  setVoidReason('');
                }}
              >
                <Text style={styles.voidCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voidConfirmBtn} onPress={confirmVoid}>
                <Text style={styles.voidConfirmText}>Kirim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SumLine({ label, val, color }: { label: string; val: string; color?: string }) {
  return (
    <View style={styles.sumLine}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumVal, color ? { color } : null]}>{val}</Text>
    </View>
  );
}
function MetaLine({ label, val, color }: { label: string; val?: string; color?: string }) {
  return (
    <View style={styles.metaLine}>
      <Text style={styles.metaLineLabel}>{label}</Text>
      <Text style={[styles.metaLineVal, color ? { color } : null]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  filterBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  filterRow: { gap: 8, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, alignItems: 'center' },
  filterChip: { height: 34, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  filterChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary },
  filterTextOn: { color: Colors.white },
  list: { padding: Spacing.base },
  row: { flexDirection: 'row', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, gap: Spacing.sm, ...Shadow.sm },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  rowId: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  rowMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  rowAmount: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.primary },
  rowItems: { fontSize: 10, color: Colors.textSecondary },
  creditTag: { fontSize: 9, fontWeight: '800', color: Colors.secondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.55)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  detailSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  detailDate: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.textSecondary, marginHorizontal: Spacing.base, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemList: { paddingHorizontal: Spacing.base },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailItemEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  detailItemName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  detailItemPrice: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  detailItemSub: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primary },
  summary: { paddingHorizontal: Spacing.base },
  sumLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  sumLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  sumVal: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  sumTotal: { borderTopWidth: 1.5, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  sumTotalLabel: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.textPrimary },
  sumTotalVal: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.primary },
  metaBox: { backgroundColor: Colors.background, padding: Spacing.md, marginHorizontal: Spacing.base, borderRadius: Radius.md, marginTop: Spacing.md },
  metaLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLineLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  metaLineVal: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 8, padding: Spacing.base, marginTop: Spacing.sm },
  reprintBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12 },
  reprintText: { color: Colors.primary, fontWeight: '700', fontSize: Fonts.sizes.sm },
  voidBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.error, borderRadius: Radius.md, paddingVertical: 12 },
  voidBtnText: { color: Colors.white, fontWeight: '700', fontSize: Fonts.sizes.sm },
  voidCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg },
  voidTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  voidSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginBottom: Spacing.md },
  voidInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, marginBottom: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  voidCancelBtn: { flex: 1, padding: 12, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  voidCancelText: { fontWeight: '700', color: Colors.textSecondary },
  voidConfirmBtn: { flex: 1, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.error, alignItems: 'center' },
  voidConfirmText: { fontWeight: '700', color: Colors.white },
});
