import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, groupDigits } from '@shared/utils/format';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useShift } from '@features/shift/store/shift.store';

export default function OpenShiftScreen() {
  const { activeOutlet, selectOutlet } = useOutlet();
  const { user } = useAuth();
  const { openShift } = useShift();
  const [cashInput, setCashInput] = useState('');
  const insets = useSafeAreaInsets();

  const cashAmount = parseInt(cashInput.replace(/\D/g, ''), 10) || 0;

  const handleOpen = () => {
    if (!cashInput.trim()) {
      Alert.alert('Perhatian', 'Masukkan jumlah kas awal terlebih dahulu');
      return;
    }
    Alert.alert(
      'Buka Shift',
      `Anda akan membuka shift dengan kas awal ${formatCurrency(cashAmount)}. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Shift', onPress: () => openShift(cashAmount) },
      ]
    );
  };

  const handleChangeOutlet = () => {
    selectOutlet(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={32} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.title}>Buka Shift</Text>
        <Text style={styles.sub}>Catat kas awal sebelum melayani transaksi</Text>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: Spacing.base }}>
        <View style={styles.outletCard}>
          <View style={styles.outletIcon}>
            <Ionicons name="storefront" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.outletLabel}>Outlet</Text>
            <Text style={styles.outletName}>{activeOutlet?.name}</Text>
          </View>
          <TouchableOpacity onPress={handleChangeOutlet} style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>Ganti</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Kasir</Text>
            <Text style={styles.infoVal}>{user?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Tanggal</Text>
            <Text style={styles.infoVal}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Jam</Text>
            <Text style={styles.infoVal}>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        <Text style={styles.label}>Kas Awal (Modal Laci)</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputPrefix}>Rp</Text>
          <TextInput
            style={styles.input}
            value={groupDigits(cashInput)}
            onChangeText={(t) => setCashInput(t.replace(/\D/g, ''))}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <Text style={styles.quickLabel}>Pilih cepat:</Text>
        <View style={styles.quickRow}>
          {[100000, 200000, 300000, 500000].map((amt) => (
            <TouchableOpacity key={amt} style={styles.quickAmt} onPress={() => setCashInput(String(amt))} activeOpacity={0.8}>
              <Text style={styles.quickAmtText}>{formatCurrency(amt)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={18} color={Colors.info} />
          <Text style={styles.noteText}>
            Pastikan jumlah kas awal sesuai dengan uang fisik di laci. Selisih akan terdeteksi saat tutup shift.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.base + insets.bottom }]}>
        <TouchableOpacity style={styles.openBtn} onPress={handleOpen} activeOpacity={0.88}>
          <LinearGradient colors={['#FF8A65', '#FFAB91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.openBtnGrad}>
            <Ionicons name="play" size={20} color={Colors.white} />
            <Text style={styles.openBtnText}>Buka Shift Sekarang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.base, alignItems: 'flex-start' },
  headerRow: { width: '100%', marginBottom: Spacing.md },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.white, fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: Fonts.sizes.sm, marginTop: 4 },
  body: { flex: 1 },
  outletCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md, ...Shadow.sm },
  outletIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  outletLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  outletName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  changeBtn: { backgroundColor: Colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  changeBtnText: { color: Colors.primary, fontWeight: '700', fontSize: Fonts.sizes.xs },
  infoBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadow.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, width: 80 },
  infoVal: { fontSize: Fonts.sizes.sm, color: Colors.textPrimary, fontWeight: '600', flex: 1 },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.primarySoft, marginBottom: Spacing.md },
  inputPrefix: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.primary, marginRight: 6 },
  input: { flex: 1, height: 56, fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.textPrimary },
  quickLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  quickAmt: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  quickAmtText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary },
  noteBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.infoLight, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.info, lineHeight: 18 },
  footer: { padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  openBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  openBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  openBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
