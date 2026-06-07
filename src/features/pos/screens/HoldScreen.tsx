import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, type ListRenderItem } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { formatCurrency, formatTime } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePos } from '@features/pos/store/pos.store';
import type { HeldOrder } from '@features/pos/types/pos.type';
import type { KasirTabScreenProps } from '@app/navigation/types';

type Props = KasirTabScreenProps<'Hold'>;

export default function HoldScreen({ navigation }: Props) {
  const { heldOrders, resumeHeldOrder, deleteHeldOrder, cart } = usePos();
  const insets = useSafeAreaInsets();

  const goToCart = (id: string, mode: 'pay' | 'edit') => {
    resumeHeldOrder(id);
    navigation.navigate('Kasir', mode === 'pay' ? { openPayment: true } : { openCart: true });
  };

  const handlePay = (id: string) => {
    if (cart.length > 0) {
      Alert.alert('Keranjang Tidak Kosong', 'Anda punya transaksi aktif. Melanjutkan akan menimpa keranjang saat ini. Lanjutkan?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Bayar', onPress: () => goToCart(id, 'pay') },
      ]);
      return;
    }
    goToCart(id, 'pay');
  };

  const handleEdit = (id: string) => {
    if (cart.length > 0) {
      Alert.alert('Keranjang Tidak Kosong', 'Anda punya transaksi aktif. Mengedit akan menimpa keranjang saat ini. Lanjutkan?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Edit', onPress: () => goToCart(id, 'edit') },
      ]);
      return;
    }
    goToCart(id, 'edit');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Hold?', 'Transaksi yang dihold akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteHeldOrder(id) },
    ]);
  };

  const renderItem: ListRenderItem<HeldOrder> = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.idChip}>
          <Ionicons name="pause-circle" size={14} color={Colors.warning} />
          <Text style={styles.idText}>{item.id}</Text>
        </View>
        <Text style={styles.timeText}>{formatTime(item.heldAt)}</Text>
      </View>

      {item.note ? (
        <View style={styles.noteRow}>
          <Ionicons name="bookmark-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.noteText} numberOfLines={2}>
            {item.note}
          </Text>
        </View>
      ) : null}

      <View style={styles.itemsRow}>
        {item.items.slice(0, 4).map((it, idx) => (
          <View key={idx} style={styles.itemPill}>
            <Text style={styles.itemEmoji}>{it.image}</Text>
            <Text style={styles.itemQty}>×{it.qty}</Text>
          </View>
        ))}
        {item.items.length > 4 && (
          <View style={styles.itemPill}>
            <Text style={styles.itemMore}>+{item.items.length - 4}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{item.member?.name || 'Umum'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cube-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{item.itemCount} item</Text>
        </View>
        <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={styles.delBtnText}>Hapus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item.id)} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resumeBtn} onPress={() => handlePay(item.id)} activeOpacity={0.88}>
          <LinearGradient colors={['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.resumeGrad}>
            <Ionicons name="card-outline" size={16} color={Colors.white} />
            <Text style={styles.resumeBtnText}>Bayar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Transaksi Tersimpan</Text>
            <Text style={styles.sub}>{heldOrders.length} transaksi di-hold</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={heldOrders}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxl + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyTitle}>Tidak Ada Hold</Text>
            <Text style={styles.emptyText}>Transaksi yang Anda tunda akan muncul di sini</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.base },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: Fonts.sizes.xs, marginTop: 2 },
  list: { padding: Spacing.base, paddingBottom: Spacing.xxl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.warning, ...Shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  idChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  idText: { fontSize: 11, fontWeight: '800', color: Colors.warning },
  timeText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, backgroundColor: Colors.background, padding: Spacing.sm, borderRadius: Radius.sm },
  noteText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  itemPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primarySoft, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  itemEmoji: { fontSize: 14 },
  itemQty: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  itemMore: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, paddingHorizontal: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  totalText: { marginLeft: 'auto', fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.primary },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error },
  delBtnText: { color: Colors.error, fontWeight: '700', fontSize: Fonts.sizes.xs },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primary },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: Fonts.sizes.xs },
  resumeBtn: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  resumeGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  resumeBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.sm },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
