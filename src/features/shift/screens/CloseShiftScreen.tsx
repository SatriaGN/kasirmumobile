import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import type { IconName } from '@shared/types/icon';
import { formatCurrency, formatDateTime, groupDigits } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useTransactions } from '@features/transactions/store/transactions.store';
import { useSync } from '@features/sync/store/sync.store';
import { usePos } from '@features/pos/store/pos.store';
import { useShift } from '@features/shift/store/shift.store';
import type { ByMethodTotals, ClosedShiftSummary } from '@features/shift/types/shift.type';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { KasirStackScreenProps } from '@app/navigation/types';

type Props = KasirStackScreenProps<'CloseShift'>;

export default function CloseShiftScreen({ navigation }: Props) {
  const { activeShift, shiftTransactions, closeShift } = useShift();
  const { transactions } = useTransactions();
  const { heldOrders } = usePos();
  const { activeOutlet } = useOutlet();
  const { user, logout, hasPermission } = useAuth();
  const { outbox, online } = useSync();
  const [actualCash, setActualCash] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [summary, setSummary] = useState<ClosedShiftSummary | null>(null);
  const insets = useSafeAreaInsets();
  const canViewReport = hasPermission('canViewShiftReport');

  // Note: `transactions` is read so the memo recomputes as sales come in.
  void transactions;

  const stats = useMemo(() => {
    const completed = shiftTransactions.filter((t) => t.status === 'completed');
    const voided = shiftTransactions.filter((t) => t.status === 'voided');
    const byMethod: ByMethodTotals = { tunai: 0, qris: 0, kartu: 0, transfer: 0 };
    completed.forEach((t) => {
      byMethod[t.method] = (byMethod[t.method] || 0) + t.total;
    });
    const totalSales = completed.reduce((s, t) => s + t.total, 0);
    return {
      txCount: completed.length,
      voidCount: voided.length,
      byMethod,
      totalSales,
      expectedCash: (activeShift?.kasAwal || 0) + byMethod.tunai,
    };
  }, [shiftTransactions, activeShift]);

  const actualAmt = parseInt((actualCash || '').replace(/\D/g, ''), 10) || 0;
  const difference = actualAmt - stats.expectedCash;
  const pendingOutbox = outbox.filter((o) => o.status === 'pending').length;

  const handleClose = () => {
    if (heldOrders.length > 0) {
      Alert.alert('Tidak Bisa Tutup Shift', `Masih ada ${heldOrders.length} transaksi tersimpan (hold). Selesaikan atau hapus dulu sebelum tutup shift.`);
      return;
    }
    if (!actualCash.trim()) {
      Alert.alert('Perhatian', 'Masukkan kas akhir fisik di laci');
      return;
    }
    if (pendingOutbox > 0 && online) {
      Alert.alert('Sinkron Dulu', `Ada ${pendingOutbox} transaksi belum tersinkron. Sinkronkan dulu sebelum tutup shift.`);
      return;
    }
    Alert.alert(
      'Tutup Shift',
      `${difference === 0 ? 'Kas balance.' : difference > 0 ? `Surplus ${formatCurrency(difference)}.` : `Kurang ${formatCurrency(-difference)}.`} Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Tutup Shift', onPress: () => setSummary(closeShift(actualAmt, keterangan)) },
      ]
    );
  };

  if (!activeShift) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="warning-outline" size={64} color={Colors.warning} />
          <Text style={styles.emptyTitle}>Tidak Ada Shift Aktif</Text>
          <TouchableOpacity style={styles.backToHome} onPress={() => navigation.goBack()}>
            <Text style={styles.backToHomeText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Tutup Shift</Text>
            <Text style={styles.sub}>Rekonsiliasi kas akhir (Z-Report)</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 + insets.bottom }}>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Informasi Shift</Text>
          </View>
          <Row label="Outlet" val={activeOutlet?.name} />
          <Row label="Kasir" val={user?.name} />
          <Row label="Mulai" val={formatDateTime(activeShift.openedAt)} />
          <Row label="Kas Awal" val={formatCurrency(activeShift.kasAwal)} valColor={Colors.primary} />
        </View>

        {canViewReport ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="bar-chart-outline" size={18} color={Colors.success} />
              <Text style={styles.cardTitle}>Ringkasan Penjualan (Z)</Text>
            </View>
            <View style={styles.salesBox}>
              <Text style={styles.salesLabel}>Total Omzet Shift</Text>
              <Text style={styles.salesValue}>{formatCurrency(stats.totalSales)}</Text>
              <Text style={styles.salesMeta}>
                {stats.txCount} selesai · {stats.voidCount} void
              </Text>
            </View>
            <View style={styles.methodGrid}>
              <MethodCard icon="cash-outline" label="Tunai" amount={stats.byMethod.tunai} color={Colors.success} bg={Colors.successLight} />
              <MethodCard icon="qr-code-outline" label="QRIS" amount={stats.byMethod.qris} color={Colors.primary} bg={Colors.primarySoft} />
              <MethodCard icon="card-outline" label="Kartu" amount={stats.byMethod.kartu} color={Colors.warning} bg={Colors.warningLight} />
              <MethodCard icon="swap-horizontal-outline" label="Transfer" amount={stats.byMethod.transfer} color={Colors.info} bg={Colors.infoLight} />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.cardTitle}>Ringkasan Terbatas</Text>
            </View>
            <Row label="Transaksi" val={`${stats.txCount} selesai`} />
            <Row label="Void" val={`${stats.voidCount}`} />
            <Text style={styles.gateNote}>Angka omzet penuh disembunyikan (tanpa izin canViewShiftReport).</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="wallet-outline" size={18} color={Colors.secondary} />
            <Text style={styles.cardTitle}>Rekonsiliasi Kas</Text>
          </View>
          <CalcLine label="Kas Awal" val={formatCurrency(activeShift.kasAwal)} />
          <CalcLine label="+ Penjualan Tunai" val={formatCurrency(stats.byMethod.tunai)} />
          <View style={[styles.calcLine, styles.calcTotal]}>
            <Text style={styles.calcTotalLabel}>= Kas Seharusnya</Text>
            <Text style={styles.calcTotalVal}>{formatCurrency(stats.expectedCash)}</Text>
          </View>

          <Text style={styles.inputLabel}>Kas Akhir Fisik (Aktual)</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>Rp</Text>
            <TextInput
              style={styles.input}
              value={groupDigits(actualCash)}
              onChangeText={(t) => setActualCash(t.replace(/\D/g, ''))}
              placeholder="Jumlah uang fisik"
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
            />
          </View>
          {actualAmt > 0 && (
            <View
              style={[
                styles.diffBox,
                difference === 0 && { backgroundColor: Colors.successLight, borderColor: Colors.success },
                difference > 0 && { backgroundColor: Colors.infoLight, borderColor: Colors.info },
                difference < 0 && { backgroundColor: Colors.errorLight, borderColor: Colors.error },
              ]}
            >
              <Ionicons
                name={difference === 0 ? 'checkmark-circle' : difference > 0 ? 'trending-up' : 'trending-down'}
                size={26}
                color={difference === 0 ? Colors.success : difference > 0 ? Colors.info : Colors.error}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.diffLabel}>{difference === 0 ? 'Balance' : difference > 0 ? 'Surplus' : 'Kurang (Selisih)'}</Text>
                <Text style={[styles.diffVal, { color: difference === 0 ? Colors.success : difference > 0 ? Colors.info : Colors.error }]}>
                  {difference === 0 ? formatCurrency(0) : difference > 0 ? '+' + formatCurrency(difference) : formatCurrency(difference)}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.inputLabel}>Keterangan (opsional)</Text>
          <TextInput
            style={styles.notesInput}
            value={keterangan}
            onChangeText={setKeterangan}
            placeholder="Mis: selisih karena uang kembalian, dll"
            placeholderTextColor={Colors.textLight}
            multiline
          />
        </View>

        {heldOrders.length > 0 && (
          <View style={styles.warnBox}>
            <Ionicons name="warning" size={20} color={Colors.warning} />
            <Text style={styles.warnText}>Ada {heldOrders.length} transaksi tersimpan (hold). Shift tidak bisa ditutup sampai transaksi ini diselesaikan atau dihapus.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.base + insets.bottom }]}>
        <TouchableOpacity style={[styles.closeBtn, heldOrders.length > 0 && styles.closeBtnDisabled]} onPress={handleClose} activeOpacity={0.88} disabled={heldOrders.length > 0}>
          <LinearGradient colors={heldOrders.length > 0 ? ['#B0B7C3', '#C7CDD6'] : ['#C62828', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.closeGrad}>
            <Ionicons name="stop-circle" size={20} color={Colors.white} />
            <Text style={styles.closeText}>Tutup Shift Sekarang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={!!summary} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.summaryCard}>
            <LinearGradient colors={['#2E7D32', '#43A047']} style={styles.summaryTop}>
              <View style={styles.summaryCheck}>
                <Ionicons name="checkmark" size={36} color={Colors.success} />
              </View>
              <Text style={styles.summaryTitle}>Shift Ditutup</Text>
              <Text style={styles.summaryId}>{summary?.id}</Text>
            </LinearGradient>
            <View style={styles.summaryBody}>
              {canViewReport && <SumRow label="Total Omzet" val={formatCurrency(summary?.totalOmzet || 0)} />}
              <SumRow label="Transaksi" val={`${summary?.txnCount || 0} selesai`} />
              <SumRow label="Kas Seharusnya" val={formatCurrency(summary?.expectedCash || 0)} />
              <SumRow label="Kas Aktual" val={formatCurrency(summary?.kasAkhir || 0)} />
              <SumRow
                label="Selisih"
                val={(summary?.selisih ?? 0) >= 0 ? '+' + formatCurrency(summary?.selisih || 0) : formatCurrency(summary?.selisih || 0)}
                valStyle={{
                  color: summary?.selisih === 0 ? Colors.success : (summary?.selisih ?? 0) > 0 ? Colors.info : Colors.error,
                  fontWeight: '800',
                }}
              />
              {summary?.keterangan ? <SumRow label="Keterangan" val={summary.keterangan} /> : null}
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={() => {
                  setSummary(null);
                  logout();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.finishText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, val, valColor }: { label: string; val?: string | null; valColor?: string }) {
  return (
    <View style={styles.cardRow}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardVal, valColor ? { color: valColor, fontWeight: '800' } : null]}>{val}</Text>
    </View>
  );
}
function CalcLine({ label, val }: { label: string; val: string }) {
  return (
    <View style={styles.calcLine}>
      <Text style={styles.calcLabel}>{label}</Text>
      <Text style={styles.calcVal}>{val}</Text>
    </View>
  );
}
function MethodCard({ icon, label, amount, color, bg }: { icon: IconName; label: string; amount: number; color: string; bg: string }) {
  return (
    <View style={[styles.methodCard, { borderLeftColor: color }]}>
      <View style={[styles.methodIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.methodLabel}>{label}</Text>
      <Text style={styles.methodVal}>{formatCurrency(amount)}</Text>
    </View>
  );
}
function SumRow({ label, val, valStyle }: { label: string; val: string; valStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumRowLabel}>{label}</Text>
      <Text style={[styles.sumRowVal, valStyle]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: Fonts.sizes.xs, marginTop: 2 },
  body: { flex: 1 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  cardTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  cardLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  cardVal: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textPrimary },
  gateNote: { fontSize: 10, color: Colors.textLight, marginTop: 6 },
  salesBox: { backgroundColor: Colors.primarySoft, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginBottom: Spacing.md },
  salesLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  salesValue: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  salesMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 4 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodCard: { flex: 1, minWidth: '47%', padding: 10, backgroundColor: Colors.background, borderRadius: Radius.md, borderLeftWidth: 3 },
  methodIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  methodLabel: { fontSize: 11, color: Colors.textSecondary },
  methodVal: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  calcLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  calcLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  calcVal: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  calcTotal: { borderTopWidth: 1.5, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  calcTotalLabel: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  calcTotalVal: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.primary },
  inputLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.secondary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.secondarySoft },
  inputPrefix: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.secondary, marginRight: 6 },
  input: { flex: 1, height: 56, fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary },
  notesInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, backgroundColor: Colors.white, minHeight: 64, textAlignVertical: 'top' },
  diffBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md, borderWidth: 1.5 },
  diffLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  diffVal: { fontSize: Fonts.sizes.lg, fontWeight: '800', marginTop: 2 },
  warnBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.warningLight, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning },
  warnText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.warning, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  closeBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  closeBtnDisabled: { opacity: 0.7 },
  closeGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  closeText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.6)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  summaryCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg },
  summaryTop: { alignItems: 'center', paddingVertical: Spacing.xl },
  summaryCheck: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  summaryTitle: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800', marginBottom: 4 },
  summaryId: { color: 'rgba(255,255,255,0.85)', fontSize: Fonts.sizes.sm },
  summaryBody: { padding: Spacing.lg },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sumRowLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  sumRowVal: { flex: 1, fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  finishBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg },
  finishText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md },
  backToHome: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md },
  backToHomeText: { color: Colors.white, fontWeight: '700' },
});
