import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import type { IconName } from '@shared/types/icon';
import { formatCurrency, formatDateTime } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useShift } from '@features/shift/store/shift.store';
import { usePos } from '@features/pos/store/pos.store';
import type { KasirTabScreenProps } from '@app/navigation/types';

type Props = KasirTabScreenProps<'Profil'>;

export default function KasirProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { activeOutlet } = useOutlet();
  const { activeShift, shiftTransactions, shiftHistory } = useShift();
  const { heldOrders } = usePos();

  const insets = useSafeAreaInsets();
  const [pwdModal, setPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const completed = shiftTransactions.filter((t) => t.status === 'completed');
  const totalSales = completed.reduce((s, t) => s + t.total, 0);

  const handleLogout = () => {
    if (activeShift) {
      Alert.alert('Shift Masih Aktif', 'Anda harus menutup shift terlebih dahulu sebelum logout.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Tutup Shift', onPress: () => navigation.getParent()?.navigate('CloseShift') },
      ]);
      return;
    }
    Alert.alert('Logout', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePwd = () => {
    if (!oldPwd || !newPwd || !confirmPwd) {
      Alert.alert('Perhatian', 'Semua field wajib diisi');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Perhatian', 'Password baru dan konfirmasi tidak cocok');
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert('Perhatian', 'Password minimal 6 karakter');
      return;
    }
    Alert.alert('Berhasil', 'Password telah diganti', [
      {
        text: 'OK',
        onPress: () => {
          setPwdModal(false);
          setOldPwd('');
          setNewPwd('');
          setConfirmPwd('');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Profil Kasir</Text>
        </View>
        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role || 'Kasir'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 60 + insets.bottom }}>
        {activeShift ? (
          <View style={[styles.card, { borderLeftColor: Colors.success, borderLeftWidth: 4 }]}>
            <View style={styles.cardHead}>
              <View style={styles.liveDot} />
              <Text style={[styles.cardTitle, { color: Colors.success }]}>Shift Sedang Aktif</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>ID Shift</Text>
              <Text style={styles.shiftVal}>{activeShift.id}</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>Outlet</Text>
              <Text style={styles.shiftVal}>{activeOutlet?.name}</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>Mulai</Text>
              <Text style={styles.shiftVal}>{formatDateTime(activeShift.openedAt)}</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>Kas Awal</Text>
              <Text style={styles.shiftVal}>{formatCurrency(activeShift.kasAwal)}</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>Transaksi</Text>
              <Text style={styles.shiftVal}>{completed.length}</Text>
            </View>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>Omzet Berjalan</Text>
              <Text style={[styles.shiftVal, { color: Colors.primary, fontWeight: '800' }]}>{formatCurrency(totalSales)}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { borderLeftColor: Colors.warning, borderLeftWidth: 4 }]}>
            <View style={styles.cardHead}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
              <Text style={[styles.cardTitle, { color: Colors.warning }]}>Belum Ada Shift Aktif</Text>
            </View>
            <Text style={styles.cardDesc}>Anda perlu membuka shift untuk mulai melayani transaksi</Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="pause-circle" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{heldOrders.length}</Text>
            <Text style={styles.statLabel}>Hold</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{completed.length}</Text>
            <Text style={styles.statLabel}>Trx Selesai</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{shiftHistory.length}</Text>
            <Text style={styles.statLabel}>Shift Lalu</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Akun</Text>
        <View style={styles.menu}>
          <MenuItem icon="person-outline" label="Edit Profil" onPress={() => Alert.alert('Mock', 'Form edit profil')} />
          <MenuItem icon="key-outline" label="Ganti Password" onPress={() => setPwdModal(true)} />
          <MenuItem icon="notifications-outline" label="Notifikasi" rightText="Aktif" onPress={() => Alert.alert('Mock', 'Pengaturan notifikasi')} />
        </View>

        <Text style={styles.sectionLabel}>Outlet & Perangkat</Text>
        <View style={styles.menu}>
          <MenuItem icon="storefront-outline" label="Outlet Aktif" rightText={activeOutlet?.name?.replace('Wijaya Mart — ', '') || '-'} onPress={() => Alert.alert('Info', 'Outlet tidak bisa diganti saat shift aktif')} />
          <MenuItem icon="print-outline" label="Printer Thermal" rightText="Terhubung" onPress={() => Alert.alert('Mock', 'Pairing printer Bluetooth')} />
          <MenuItem icon="sync-outline" label="Status Sinkronisasi" onPress={() => navigation.navigate('Sync' as never)} />
        </View>

        <Text style={styles.sectionLabel}>Bantuan</Text>
        <View style={styles.menu}>
          <MenuItem icon="help-circle-outline" label="Pusat Bantuan" onPress={() => Alert.alert('Mock', 'Membuka FAQ')} />
          <MenuItem icon="chatbubble-outline" label="Kontak Owner" onPress={() => Alert.alert('Mock', 'Membuka chat dengan owner')} />
          <MenuItem icon="information-circle-outline" label="Tentang Aplikasi" rightText="v1.0.0" onPress={() => Alert.alert('KasirMu', 'POS Mobile v1.0.0')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pwdModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pwdCard}>
            <View style={styles.pwdHeader}>
              <Text style={styles.pwdTitle}>Ganti Password</Text>
              <TouchableOpacity onPress={() => setPwdModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <PwdInput label="Password Lama" value={oldPwd} onChange={setOldPwd} />
            <PwdInput label="Password Baru" value={newPwd} onChange={setNewPwd} />
            <PwdInput label="Konfirmasi Password Baru" value={confirmPwd} onChange={setConfirmPwd} />
            <TouchableOpacity style={styles.pwdSubmit} onPress={handleChangePwd}>
              <Text style={styles.pwdSubmitText}>Simpan Password Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, rightText }: { icon: IconName; label: string; onPress: () => void; rightText?: string }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {rightText ? <Text style={styles.menuRight}>{rightText}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

function PwdInput({ label, value, onChange }: { label: string; value: string; onChange: (text: string) => void }) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.pwdLabel}>{label}</Text>
      <TextInput style={styles.pwdInput} value={value} onChangeText={onChange} secureTextEntry placeholder="••••••" placeholderTextColor={Colors.textLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800' },
  profileBox: { alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm, ...Shadow.md },
  avatarText: { color: Colors.primary, fontSize: 32, fontWeight: '800' },
  userName: { color: Colors.white, fontSize: Fonts.sizes.lg, fontWeight: '800' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginTop: 6 },
  roleBadgeText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '700' },
  body: { flex: 1 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  cardTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800' },
  cardDesc: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, lineHeight: 18 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  shiftLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  shiftVal: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textPrimary },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', ...Shadow.sm },
  statValue: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  menu: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  menuRight: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginRight: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.md, marginTop: Spacing.lg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.error, backgroundColor: Colors.errorLight },
  logoutText: { color: Colors.error, fontWeight: '800', fontSize: Fonts.sizes.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.6)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  pwdCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg },
  pwdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  pwdTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  pwdLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  pwdInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, backgroundColor: Colors.primarySoft },
  pwdSubmit: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  pwdSubmitText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
