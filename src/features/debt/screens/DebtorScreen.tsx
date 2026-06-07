import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  type ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { ScreenHeader } from '@shared';
import { formatCurrency, formatDate, agingBucket, ageDays, groupDigits } from '@shared/utils/format';
import type { AgingBucket } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebt } from '@features/debt/store/debt.store';
import type { DebtorSummary, PayDebtResult } from '@features/debt/types/debt.type';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';

const BUCKETS: AgingBucket[] = ['0-7', '8-14', '15-30', '30+'];

interface DebtorRow extends DebtorSummary {
  oldestDate?: string;
  oldestBucket: AgingBucket;
  overdue: boolean;
}

interface DebtorScreenProps {
  navigation: { goBack: () => void };
}

export default function DebtorScreen({ navigation }: DebtorScreenProps) {
  const { debtorSummaries, payDebt } = useDebt();
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<AgingBucket | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [detail, setDetail] = useState<DebtorSummary | null>(null);
  const insets = useSafeAreaInsets();

  const summary = useMemo(() => {
    const buckets: Record<AgingBucket, number> = { '0-7': 0, '8-14': 0, '15-30': 0, '30+': 0 };
    let total = 0;
    let overdue = 0;
    debtorSummaries.forEach((m) => {
      m.records.forEach((r) => {
        const b = agingBucket(r.dueDate || r.createdAt);
        buckets[b] += r.outstanding ?? 0;
        total += r.outstanding ?? 0;
        if (b !== '0-7') overdue += r.outstanding ?? 0;
      });
    });
    return { buckets, total, overdue, memberCount: debtorSummaries.length };
  }, [debtorSummaries]);

  const rows = useMemo<DebtorRow[]>(() => {
    return debtorSummaries
      .map((m): DebtorRow => {
        const oldest = m.records.reduce<Date | null>((min, r) => {
          const d = new Date(r.dueDate || r.createdAt);
          return !min || d < min ? d : min;
        }, null);
        const oldestBucket = oldest ? agingBucket(oldest.toISOString()) : '0-7';
        return { ...m, oldestDate: oldest?.toISOString(), oldestBucket, overdue: oldestBucket !== '0-7' };
      })
      .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))
      .filter((m) => !overdueOnly || m.overdue)
      .filter((m) => !bucketFilter || m.records.some((r) => agingBucket(r.dueDate || r.createdAt) === bucketFilter))
      .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [debtorSummaries, search, overdueOnly, bucketFilter]);

  const renderItem: ListRenderItem<DebtorRow> = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => setDetail(item)} activeOpacity={0.85}>
      <View style={[styles.rowAvatar, item.overdue && { backgroundColor: Colors.errorLight }]}>
        <Text style={[styles.rowInit, item.overdue && { color: Colors.error }]}>{item.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.memberTypeName} · {item.records.length} utang
        </Text>
        {item.overdue && <Text style={styles.overdueTag}>⚠ Telat — bucket {item.oldestBucket}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.rowDebt, item.overdue && { color: Colors.error }]}>{formatCurrency(item.totalDebt)}</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Piutang & Aging"
        subtitle={`${summary.memberCount} member berutang`}
        onBack={() => navigation.goBack()}
        colors={['#FF8A65', '#FFAB91']}
      />

      <FlatList
        data={rows}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Outstanding</Text>
              <Text style={styles.summaryTotal}>{formatCurrency(summary.total)}</Text>
              <Text style={styles.summaryOverdue}>Overdue: {formatCurrency(summary.overdue)}</Text>
              <View style={styles.bucketGrid}>
                {BUCKETS.map((b) => (
                  <View key={b} style={styles.bucketCard}>
                    <Text style={styles.bucketRange}>{b} hari</Text>
                    <Text style={styles.bucketVal}>{formatCurrency(summary.buckets[b])}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textLight} />
              <TextInput style={styles.searchInput} placeholder="Cari nama / telepon..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <TouchableOpacity style={[styles.filterChip, overdueOnly && styles.filterChipOn]} onPress={() => setOverdueOnly(!overdueOnly)}>
                <Text style={[styles.filterText, overdueOnly && styles.filterTextOn]}>Overdue saja</Text>
              </TouchableOpacity>
              {BUCKETS.map((b) => (
                <TouchableOpacity key={b} style={[styles.filterChip, bucketFilter === b && styles.filterChipOn]} onPress={() => setBucketFilter(bucketFilter === b ? null : b)}>
                  <Text style={[styles.filterText, bucketFilter === b && styles.filterTextOn]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyText}>Tidak ada piutang</Text>
          </View>
        }
      />

      <DebtorDetail detail={detail} onClose={() => setDetail(null)} onPay={payDebt} />
    </SafeAreaView>
  );
}

interface DebtorDetailProps {
  detail: DebtorSummary | null;
  onClose: () => void;
  onPay: (memberId: string, amount: number, method?: PaymentMethodKey) => PayDebtResult;
}

function DebtorDetail({ detail, onClose, onPay }: DebtorDetailProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethodKey>('tunai');
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (detail) {
      setAmount('');
      setMethod('tunai');
    }
  }, [detail]);
  if (!detail) return null;

  const amt = parseInt((amount || '').replace(/\D/g, ''), 10) || 0;
  const after = detail.totalDebt - amt;

  const submit = () => {
    if (amt <= 0) {
      Alert.alert('Perhatian', 'Masukkan nominal pembayaran');
      return;
    }
    const res = onPay(detail.id, amt, method);
    if (!res.ok) {
      Alert.alert('Gagal', res.error);
      return;
    }
    Alert.alert('Pembayaran Tercatat', `${formatCurrency(amt)} dialokasikan FIFO. Sisa: ${formatCurrency(res.memberTotalDebtAfter)}`);
    onClose();
  };

  const methods: PaymentMethodKey[] = ['tunai', 'qris', 'transfer'];

  return (
    <Modal visible={!!detail} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.detailSheet, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{detail.name}</Text>
              <Text style={styles.detailSub}>
                {detail.memberTypeName} · {detail.phone}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.totalDebtBox}>
              <Text style={styles.totalDebtLabel}>Total Piutang</Text>
              <Text style={styles.totalDebtVal}>{formatCurrency(detail.totalDebt)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Rincian Utang (FIFO)</Text>
            {detail.records.map((r) => {
              const days = ageDays(r.dueDate || r.createdAt);
              const bucket = agingBucket(r.dueDate || r.createdAt);
              const overdue = bucket !== '0-7';
              return (
                <View key={r.id} style={styles.debtItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtNote}>{r.note || 'Utang'}</Text>
                    <Text style={styles.debtMeta}>
                      Jatuh tempo {formatDate(r.dueDate || r.createdAt)} · {days} hari{overdue ? ' (telat)' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.debtOut, overdue && { color: Colors.error }]}>{formatCurrency(r.outstanding ?? 0)}</Text>
                    <Text style={styles.debtStatus}>{r.status}</Text>
                  </View>
                </View>
              );
            })}

            <Text style={styles.sectionLabel}>Catat Pembayaran (partial)</Text>
            <View style={styles.payInputBox}>
              <Text style={styles.payPrefix}>Rp</Text>
              <TextInput style={styles.payInput} value={groupDigits(amount)} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textLight} />
            </View>
            <View style={styles.methodRow}>
              {methods.map((m) => (
                <TouchableOpacity key={m} style={[styles.methodChip, method === m && styles.methodChipOn]} onPress={() => setMethod(m)}>
                  <Text style={[styles.methodChipText, method === m && styles.methodChipTextOn]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {amt > 0 && (
              <View style={[styles.afterBox, { backgroundColor: after < 0 ? Colors.errorLight : Colors.successLight }]}>
                <Text style={styles.afterLabel}>Sisa setelah bayar</Text>
                <Text style={[styles.afterVal, { color: after < 0 ? Colors.error : Colors.success }]}>{after < 0 ? 'Melebihi piutang!' : formatCurrency(after)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.payBtn} onPress={submit} activeOpacity={0.88}>
              <LinearGradient colors={['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payGrad}>
                <Ionicons name="cash-outline" size={20} color={Colors.white} />
                <Text style={styles.payBtnText}>Catat Pembayaran</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.base },
  summaryCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.md },
  summaryLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  summaryTotal: { fontSize: 30, fontWeight: '800', color: Colors.secondary, marginTop: 2 },
  summaryOverdue: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '700', marginTop: 4 },
  bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  bucketCard: { flex: 1, minWidth: '46%', backgroundColor: Colors.background, borderRadius: Radius.md, padding: 10 },
  bucketRange: { fontSize: 10, color: Colors.textSecondary },
  bucketVal: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44, marginBottom: Spacing.sm },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textPrimary },
  filterRow: { gap: 6, paddingVertical: 4, marginBottom: Spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  filterChipOn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary },
  filterTextOn: { color: Colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, ...Shadow.sm },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  rowInit: { color: Colors.primary, fontWeight: '800', fontSize: 18 },
  rowName: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  rowMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  overdueTag: { fontSize: 10, color: Colors.error, fontWeight: '700', marginTop: 2 },
  rowDebt: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.secondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.55)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: Spacing.base },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  detailSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  totalDebtBox: { backgroundColor: Colors.secondarySoft, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  totalDebtLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  totalDebtVal: { fontSize: 26, fontWeight: '800', color: Colors.secondary, marginTop: 2 },
  sectionLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  debtItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  debtNote: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  debtMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  debtOut: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  debtStatus: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  payInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.primarySoft, marginBottom: Spacing.sm },
  payPrefix: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.primary, marginRight: 6 },
  payInput: { flex: 1, height: 52, fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  methodChip: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  methodChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  methodChipText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize' },
  methodChipTextOn: { color: Colors.primary },
  afterBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm },
  afterLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  afterVal: { fontSize: Fonts.sizes.base, fontWeight: '800' },
  payBtn: { borderRadius: Radius.md, overflow: 'hidden', marginVertical: Spacing.md },
  payGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  payBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
