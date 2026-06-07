import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '@shared/theme';
import type { IconName } from '@shared/types/icon';
import { formatCurrency, isWholesale, groupDigits } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '@features/catalog/store/catalog.store';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useShift } from '@features/shift/store/shift.store';
import { useMembers } from '@features/members/store/members.store';
import { usePos } from '@features/pos/store/pos.store';
import type { CartLine } from '@features/pos/types/pos.type';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import SyncBadge from '@features/sync/components/SyncBadge';
import type { Product, PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { Transaction } from '@features/transactions/types/transactions.type';
import type { KasirTabScreenProps } from '@app/navigation/types';

type Props = KasirTabScreenProps<'Kasir'>;

// Target product-card width; column count adapts to screen width (portrait vs landscape).
const TARGET_CARD_WIDTH = 180;

export default function POSScreen({ navigation, route }: Props) {
  const { products, categories, discounts, paymentMethods, tax, findProductByBarcode } = useCatalog();
  const {
    cart,
    addToCart,
    updateCartQty,
    clearCart,
    totals,
    discountConfig,
    setDiscountConfig,
    selectedMember,
    setSelectedMember,
    isCredit,
    setIsCredit,
    processPayment,
    holdCurrentOrder,
    heldOrders,
  } = usePos();
  const { members } = useMembers();
  const { hasPermission } = useAuth();
  const { activeOutlet } = useOutlet();
  const { activeShift } = useShift();

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [cartVisible, setCartVisible] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethodKey>('tunai');
  const [cashInput, setCashInput] = useState('');
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [scanModal, setScanModal] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [memberModal, setMemberModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [invalidQtyLines, setInvalidQtyLines] = useState<Record<string, boolean>>({});
  const reportInvalidQty = useCallback((lineId: string, invalid: boolean) => {
    setInvalidQtyLines((prev) => {
      if (!!prev[lineId] === invalid) return prev;
      const next = { ...prev };
      if (invalid) next[lineId] = true;
      else delete next[lineId];
      return next;
    });
  }, []);
  const hasInvalidQty = Object.keys(invalidQtyLines).length > 0;
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [holdNoteModal, setHoldNoteModal] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const insets = useSafeAreaInsets();
  // Modals render outside the AppShell side-inset wrapper, so apply left/right
  // insets here too — otherwise sheet edges hide under the notch in landscape.
  const sideInset = { paddingLeft: insets.left, paddingRight: insets.right };
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  // Adapt the product grid to the available width so landscape uses more columns.
  const gridPadding = Spacing.base * 2;
  const numColumns = Math.max(2, Math.floor((winWidth - gridPadding) / TARGET_CARD_WIDTH));
  const cardWidth = (winWidth - gridPadding - Spacing.sm * (numColumns - 1)) / numColumns;

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const getCartQty = (id: string) => cart.filter((i) => i.productId === id).reduce((s, i) => s + i.qty, 0);

  // Open the payment modal / cart sheet directly when resumed from Hold.
  useEffect(() => {
    if (route.params?.openPayment) {
      setCartVisible(false);
      setPayModal(true);
      navigation.setParams({ openPayment: undefined });
    }
  }, [route.params?.openPayment, navigation]);

  useEffect(() => {
    if (route.params?.openCart) {
      setPayModal(false);
      setCartVisible(true);
      navigation.setParams({ openCart: undefined });
    }
  }, [route.params?.openCart, navigation]);

  const filtered = products.filter((p) => {
    const matchCat = activeCat === 'all' || p.categoryId === activeCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    return matchCat && matchSearch;
  });

  const cashAmount = parseInt((cashInput || '').replace(/\D/g, ''), 10) || 0;
  const change = cashAmount - totals.total;

  const openProduct = (product: Product) => {
    if (product.variants?.length > 0 || product.uomConversions?.length > 0) {
      setDetailProduct(product);
    } else {
      addToCart(product);
    }
  };

  const handlePay = () => {
    if (cart.length === 0) {
      Alert.alert('Perhatian', 'Keranjang masih kosong');
      return;
    }
    if (isCredit && !selectedMember?.canCredit) {
      Alert.alert('Perhatian', 'Member tidak bisa kredit');
      return;
    }
    if (!isCredit && payMethod === 'tunai' && cashAmount < totals.total) {
      Alert.alert('Perhatian', 'Uang yang diberikan kurang');
      return;
    }
    const tx = processPayment(isCredit ? 'tunai' : payMethod, cashAmount);
    setPayModal(false);
    setCartVisible(false);
    setReceipt(tx);
    setCashInput('');
    setPayMethod('tunai');
  };

  const handleScan = () => {
    const code = scanInput.trim();
    if (!code) {
      Alert.alert('Error', 'Masukkan kode barcode');
      return;
    }
    const product = findProductByBarcode(code);
    if (!product) {
      Alert.alert('Tidak Ditemukan', `Barcode ${code} tidak cocok`);
      return;
    }
    openProduct(product);
    setScanInput('');
    setScanModal(false);
  };

  const confirmHold = () => {
    holdCurrentOrder(holdNote.trim());
    setHoldNote('');
    setHoldNoteModal(false);
    setCartVisible(false);
    Alert.alert('Berhasil', 'Transaksi disimpan ke daftar Hold');
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.memberTypeName?.toLowerCase().includes(q)
    );
  });

  const availDiscounts = discounts.filter((d) => d.isActive && totals.subtotal >= d.minPurchase);
  const quickAmounts: number[] = [totals.total, 50000, 100000, 150000, 200000];

  return (
    <View style={styles.safeArea}>
      <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Kasir</Text>
            <View style={styles.headerSubRow}>
              <Ionicons name="storefront-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.headerSub} numberOfLines={1}>
                {activeOutlet?.name?.replace('Wijaya Mart — ', '') || 'Outlet'}
              </Text>
              <Text style={styles.headerDot}>·</Text>
              <Text style={styles.headerSub}>Shift {activeShift?.id?.slice(-6) || '-'}</Text>
            </View>
          </View>
          <SyncBadge onPress={() => navigation.getParent()?.navigate('Sync' as never)} />
          <TouchableOpacity style={styles.customerPill} activeOpacity={0.8} onPress={() => setMemberModal(true)}>
            <Ionicons name="person-circle-outline" size={18} color={Colors.white} />
            <Text style={styles.customerPillText} numberOfLines={1}>
              {selectedMember?.name}
            </Text>
            <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textLight} />
            <TextInput style={styles.searchInput} placeholder="Cari produk / barcode..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={() => setScanModal(true)}>
            <Ionicons name="scan" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.quickBar}>
        <QuickItem icon="clipboard-outline" color={Colors.warning} label="Tersimpan" badge={heldOrders.length} onPress={() => navigation.navigate('Hold')} />
        <View style={styles.quickDivider} />
        <QuickItem icon="people-outline" color={Colors.info} label="Member" onPress={() => navigation.getParent()?.navigate('Members' as never)} />
        <View style={styles.quickDivider} />
        <QuickItem icon="stop-circle-outline" color={Colors.error} label="Tutup" onPress={() => navigation.getParent()?.navigate('CloseShift' as never)} />
      </View>

      <View style={styles.catWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          <TouchableOpacity style={[styles.catChip, activeCat === 'all' && styles.catChipOn]} onPress={() => setActiveCat('all')}>
            <Text style={[styles.catText, activeCat === 'all' && styles.catTextOn]}>Semua</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.catChip, activeCat === cat.id && styles.catChipOn]} onPress={() => setActiveCat(cat.id)}>
              <Text style={{ fontSize: 12 }}>{cat.icon}</Text>
              <Text style={[styles.catText, activeCat === cat.id && styles.catTextOn]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        key={numColumns}
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.gridContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ProductCard product={item} qty={getCartQty(item.id)} width={cardWidth} onPress={openProduct} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="cube-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyText}>Tidak ada produk</Text>
          </View>
        }
      />

      {totalItems > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setCartVisible(true)} activeOpacity={0.9}>
          <LinearGradient colors={['#FF8A65', '#FFAB91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cartBarGrad}>
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarBadge}>
                <Text style={styles.cartBarBadgeText}>{totalItems}</Text>
              </View>
              <Text style={styles.cartBarLabel}>Lihat Keranjang</Text>
            </View>
            <Text style={styles.cartBarTotal}>{formatCurrency(totals.total)}</Text>
            <Ionicons name="chevron-up" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAdd={(p, opts) => {
          addToCart(p, opts);
          setDetailProduct(null);
        }}
        canViewCost={hasPermission('canViewCostPrice')}
      />

      {/* CART SHEET */}
      <Modal visible={cartVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={[styles.overlay, sideInset]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlayDismiss} onPress={() => setCartVisible(false)} />
          <View style={[styles.sheet, { maxHeight: winHeight * 0.88, paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Keranjang Belanja</Text>
                <Text style={styles.sheetSub}>
                  {totalItems} item · {selectedMember?.name}
                </Text>
              </View>
              <View style={styles.sheetHeaderRight}>
                {cart.length > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={styles.clearBtnText}>Kosongkan</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setCartVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={[styles.sheetItems, { maxHeight: winHeight * 0.3 }]} showsVerticalScrollIndicator={false}>
              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Ionicons name="cart-outline" size={52} color={Colors.border} />
                  <Text style={styles.emptyText}>Keranjang kosong</Text>
                </View>
              ) : (
                cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const wholesale = isWholesale(product, { uomConversionId: item.uomConversionId, qty: item.qty });
                  return <CartItemRow key={item.lineId} item={item} wholesale={wholesale} onChangeQty={updateCartQty} onInvalidChange={reportInvalidQty} />;
                })
              )}
            </ScrollView>

            {cart.length > 0 && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discChips}>
                  <TouchableOpacity style={[styles.discChip, !discountConfig && styles.discChipOn]} onPress={() => setDiscountConfig(null)}>
                    <Text style={[styles.discChipText, !discountConfig && styles.discChipTextOn]}>Tanpa Diskon</Text>
                  </TouchableOpacity>
                  {availDiscounts.map((d) => (
                    <TouchableOpacity key={d.id} style={[styles.discChip, discountConfig?.id === d.id && styles.discChipOn]} onPress={() => setDiscountConfig(d)}>
                      <Text style={[styles.discChipText, discountConfig?.id === d.id && styles.discChipTextOn]}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedMember?.canCredit && (
                  <TouchableOpacity style={[styles.creditRow, isCredit && styles.creditRowOn]} onPress={() => setIsCredit(!isCredit)}>
                    <Ionicons name={isCredit ? 'checkbox' : 'square-outline'} size={20} color={isCredit ? Colors.secondary : Colors.textSecondary} />
                    <Text style={styles.creditText}>Bayar nanti (utang) — {selectedMember.name}</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.summaryBox}>
                  <SummaryLine label="Subtotal" val={formatCurrency(totals.subtotal)} />
                  {totals.discount > 0 && <SummaryLine label="Diskon" val={`-${formatCurrency(totals.discount)}`} valColor={Colors.success} />}
                  {tax.ppnEnabled && <SummaryLine label={`PPN ${tax.ppnRate}%`} val={formatCurrency(totals.tax)} />}
                  <View style={[styles.summaryLine, styles.totalLine]}>
                    <Text style={styles.totalLabel}>Total Bayar</Text>
                    <Text style={styles.totalVal}>{formatCurrency(totals.total)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.holdBtn} onPress={() => setHoldNoteModal(true)}>
                      <Ionicons name="pause" size={18} color={Colors.warning} />
                      <Text style={styles.holdBtnText}>Simpan Transaksi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.payBtn, hasInvalidQty && styles.payBtnDisabled]}
                      onPress={() => {
                        setCartVisible(false);
                        setPayModal(true);
                      }}
                      activeOpacity={0.88}
                      disabled={hasInvalidQty}
                    >
                      <LinearGradient colors={hasInvalidQty ? ['#B0B7C3', '#C7CDD6'] : ['#FF8A65', '#FFAB91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.payBtnGrad}>
                        <Ionicons name="card-outline" size={20} color={Colors.white} />
                        <Text style={styles.payBtnText}>{isCredit ? 'Catat Utang' : 'Bayar'}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PAYMENT MODAL */}
      <Modal visible={payModal} transparent animationType="slide">
        <KeyboardAvoidingView style={[styles.overlay, sideInset]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.paySheet, { maxHeight: winHeight * 0.92, paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.paySheetHeader}>
              <Text style={styles.paySheetTitle}>{isCredit ? 'Konfirmasi Utang' : 'Proses Pembayaran'}</Text>
              <TouchableOpacity onPress={() => setPayModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <LinearGradient colors={['#D9F5EC', '#B8E8D9']} style={styles.totalBox}>
                <Text style={styles.totalBoxLabel}>{isCredit ? 'Total Utang' : 'Total Pembayaran'}</Text>
                <Text style={styles.totalBoxAmount}>{formatCurrency(totals.total)}</Text>
                <Text style={styles.totalBoxItems}>
                  {totalItems} item · {selectedMember?.name}
                </Text>
              </LinearGradient>

              {!isCredit && (
                <>
                  <Text style={styles.payLabel}>Metode Pembayaran</Text>
                  <View style={styles.payMethodsGrid}>
                    {paymentMethods
                      .filter((m) => m.isEnabled)
                      .map((m) => (
                        <TouchableOpacity key={m.id} style={[styles.payMethodCard, payMethod === m.key && styles.payMethodCardOn]} onPress={() => setPayMethod(m.key)}>
                          <Ionicons name={m.icon as IconName} size={22} color={payMethod === m.key ? Colors.primary : Colors.textSecondary} />
                          <Text style={[styles.payMethodCardText, payMethod === m.key && styles.payMethodCardTextOn]}>{m.label}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>

                  {payMethod === 'tunai' && (
                    <View style={styles.cashSection}>
                      <Text style={styles.payLabel}>Uang Diterima</Text>
                      <TextInput
                        style={styles.cashInput}
                        value={groupDigits(cashInput)}
                        onChangeText={(t) => setCashInput(t.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        placeholder="Masukkan nominal"
                        placeholderTextColor={Colors.textLight}
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                        {quickAmounts.map((amt, i) => (
                          <TouchableOpacity key={i} style={styles.quickAmt} onPress={() => setCashInput(String(amt))}>
                            <Text style={styles.quickAmtText}>{i === 0 ? 'Uang Pas' : formatCurrency(amt)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      {cashAmount > 0 && (
                        <View style={[styles.changeBox, { backgroundColor: change >= 0 ? Colors.successLight : Colors.errorLight }]}>
                          <Text style={styles.changeLabel}>Kembalian</Text>
                          <Text style={[styles.changeVal, { color: change >= 0 ? Colors.success : Colors.error }]}>
                            {change >= 0 ? formatCurrency(change) : 'Kurang ' + formatCurrency(-change)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {payMethod === 'qris' && (
                    <View style={styles.qrisBox}>
                      <View style={styles.qrisPlaceholder}>
                        <Ionicons name="qr-code" size={120} color={Colors.primary} />
                      </View>
                      <Text style={styles.qrisHint}>Tunjukkan QR ke pelanggan untuk discan</Text>
                    </View>
                  )}
                  {(payMethod === 'kartu' || payMethod === 'transfer') && (
                    <View style={styles.noteBox}>
                      <Ionicons name="information-circle" size={20} color={Colors.info} />
                      <Text style={styles.noteText}>Pastikan pembayaran diterima sebelum konfirmasi.</Text>
                    </View>
                  )}
                </>
              )}

              {isCredit && (
                <View style={styles.noteBox}>
                  <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                  <Text style={styles.noteText}>Transaksi ini dicatat sebagai utang member dan menambah total piutang.</Text>
                </View>
              )}

              <TouchableOpacity style={styles.confirmBtn} onPress={handlePay} activeOpacity={0.88}>
                <LinearGradient colors={['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmBtnGrad}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} />
                  <Text style={styles.confirmBtnText}>{isCredit ? 'Catat Utang' : 'Konfirmasi Pembayaran'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* RECEIPT */}
      <Modal visible={!!receipt} transparent animationType="fade">
        <View style={[styles.overlay, sideInset]}>
          <ScrollView contentContainerStyle={styles.centeredModalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.receiptCard}>
            <LinearGradient colors={['#1DAA8B', '#4FD1B5']} style={styles.receiptTop}>
              <View style={styles.receiptCheckCircle}>
                <Ionicons name="checkmark" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.receiptTitle}>{receipt?.credit ? 'Utang Tercatat!' : 'Pembayaran Berhasil!'}</Text>
              <Text style={styles.receiptId}>{receipt?.code}</Text>
            </LinearGradient>
            <View style={styles.receiptBody}>
              <ReceiptRow label="Total" val={formatCurrency(receipt?.total || 0)} />
              <ReceiptRow label="Metode" val={receipt?.credit ? 'Utang (Kredit)' : receipt?.method} />
              {receipt?.method === 'tunai' && (receipt?.change ?? 0) > 0 && <ReceiptRow label="Kembalian" val={formatCurrency(receipt?.change ?? 0)} valColor={Colors.success} />}
              <ReceiptRow label="Pelanggan" val={receipt?.memberName} />
              {!receipt?.synced && <ReceiptRow label="Status" val="Menunggu sinkron" valColor={Colors.warning} />}
              <View style={styles.receiptActions}>
                <TouchableOpacity style={styles.receiptShareBtn} onPress={() => Alert.alert('Cetak Struk', 'Mock: mengirim ke printer thermal Bluetooth…')} activeOpacity={0.85}>
                  <Ionicons name="print-outline" size={18} color={Colors.primary} />
                  <Text style={styles.receiptShareText}>Cetak / Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setReceipt(null)} activeOpacity={0.88}>
                  <Text style={styles.receiptCloseTxt}>Transaksi Baru</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>

      {/* SCAN */}
      <Modal visible={scanModal} transparent animationType="fade">
        <KeyboardAvoidingView style={[styles.overlay, sideInset]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.centeredModalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.scanCard}>
              <View style={styles.scanHeader}>
                <Text style={styles.scanTitle}>Scan Barcode Produk</Text>
                <TouchableOpacity
                  onPress={() => {
                    setScanModal(false);
                    setScanInput('');
                  }}
                >
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <View style={styles.scanArea}>
                <Ionicons name="barcode-outline" size={72} color={Colors.primary} />
                <View style={styles.scanLine} />
                <Text style={styles.scanHint}>Arahkan kamera atau ketik manual</Text>
              </View>
              <TextInput style={styles.scanInput} value={scanInput} onChangeText={setScanInput} placeholder="Mis: 8991234560028" keyboardType="numeric" placeholderTextColor={Colors.textLight} autoFocus />
              <TouchableOpacity style={styles.scanSubmit} onPress={handleScan}>
                <Text style={styles.scanSubmitText}>Tambah ke Keranjang</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MEMBER PICKER */}
      <Modal visible={memberModal} transparent animationType="slide">
        <KeyboardAvoidingView style={[styles.overlay, sideInset]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            style={styles.overlayDismiss}
            onPress={() => {
              setMemberModal(false);
              setMemberSearch('');
            }}
          />
          <View style={[styles.sheet, { maxHeight: winHeight * 0.88, paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pilih Member</Text>
              <TouchableOpacity
                onPress={() => {
                  setMemberModal(false);
                  setMemberSearch('');
                }}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.memberSearchWrap}>
              <View style={styles.memberSearchBox}>
                <Ionicons name="search-outline" size={18} color={Colors.textLight} />
                <TextInput
                  style={styles.memberSearchInput}
                  placeholder="Cari nama / no. HP / tipe..."
                  placeholderTextColor={Colors.textLight}
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                />
                {memberSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setMemberSearch('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ScrollView style={{ maxHeight: winHeight * 0.6 }}>
              {filteredMembers.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Ionicons name="people-outline" size={52} color={Colors.border} />
                  <Text style={styles.emptyText}>Member tidak ditemukan</Text>
                </View>
              ) : (
                filteredMembers.map((c) => {
                const on = selectedMember?.id === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.custRow, on && styles.custRowOn]}
                    onPress={() => {
                      setSelectedMember(c);
                      setIsCredit(false);
                      setMemberModal(false);
                      setMemberSearch('');
                    }}
                  >
                    <View style={styles.custAvatar}>
                      <Text style={styles.custInit}>{c.name?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.custName}>{c.name}</Text>
                      <Text style={styles.custMeta}>
                        {c.memberTypeName}
                        {c.canCredit ? ' · bisa kredit' : ''}
                        {c.totalDebt > 0 ? ` · utang ${formatCurrency(c.totalDebt)}` : ''}
                      </Text>
                    </View>
                    {on && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                  </TouchableOpacity>
                );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* HOLD NOTE */}
      <Modal visible={holdNoteModal} transparent animationType="fade">
        <KeyboardAvoidingView style={[styles.overlay, { justifyContent: 'center', paddingLeft: Spacing.xl + insets.left, paddingRight: Spacing.xl + insets.right }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.scanCard}>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>Simpan Transaksi</Text>
              <TouchableOpacity
                onPress={() => {
                  setHoldNoteModal(false);
                  setHoldNote('');
                }}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.scanHint}>Tambahkan catatan agar mudah dikenali (opsional)</Text>
            <TextInput style={[styles.scanInput, { marginTop: 12 }]} value={holdNote} onChangeText={setHoldNote} placeholder="Mis: Pak Budi · ambil dompet" placeholderTextColor={Colors.textLight} />
            <TouchableOpacity style={[styles.scanSubmit, { backgroundColor: Colors.warning }]} onPress={confirmHold}>
              <Text style={styles.scanSubmitText}>Simpan ke Hold</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function QuickItem({ icon, color, label, badge, onPress }: { icon: IconName; color: string; label: string; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={color} />
        {(badge ?? 0) > 0 && (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

function CartItemRow({
  item,
  wholesale,
  onChangeQty,
  onInvalidChange,
}: {
  item: CartLine;
  wholesale: boolean;
  onChangeQty: (lineId: string, qty: number) => void;
  onInvalidChange: (lineId: string, invalid: boolean) => void;
}) {
  const [qtyText, setQtyText] = useState(String(item.qty));
  const parsed = parseInt(qtyText.replace(/\D/g, ''), 10) || 0;
  const qtyInvalid = parsed <= 0;

  // Keep local text in sync when qty changes from +/- buttons or elsewhere.
  useEffect(() => {
    setQtyText(String(item.qty));
  }, [item.qty]);

  // Report invalid state up (to disable the pay button) and clear it on unmount.
  useEffect(() => {
    onInvalidChange(item.lineId, qtyInvalid);
    return () => onInvalidChange(item.lineId, false);
  }, [item.lineId, qtyInvalid, onInvalidChange]);

  // Commit on every keystroke. Empty/0 stays in the input without deleting the line;
  // the pay button is disabled instead (use the trash button to remove).
  const handleChangeQty = (t: string) => {
    const digits = t.replace(/\D/g, '');
    setQtyText(digits);
    const next = parseInt(digits, 10);
    if (next > 0 && next !== item.qty) onChangeQty(item.lineId, next);
  };

  return (
    <View style={styles.cartItem}>
      <Text style={styles.cartEmoji}>{item.image}</Text>
      <View style={styles.cartInfo}>
        <Text style={styles.cartName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cartUnitPrice}>
          {formatCurrency(item.unitPrice)} {wholesale && <Text style={styles.grosirTag}>· Grosir</Text>}
        </Text>
        {item.note ? <Text style={styles.cartNote}>“{item.note}”</Text> : null}
        {qtyInvalid && <Text style={styles.cartQtyError}>Jumlah tidak boleh kosong atau 0</Text>}
      </View>
      <View style={styles.cartControls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => onChangeQty(item.lineId, item.qty - 1)}>
          <Ionicons name={item.qty === 1 ? 'trash-outline' : 'remove'} size={15} color={item.qty === 1 ? Colors.error : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.ctrlQtyInput, qtyInvalid && styles.ctrlQtyInputError]}
          value={qtyText}
          onChangeText={handleChangeQty}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={4}
        />
        <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnFill]} onPress={() => onChangeQty(item.lineId, item.qty + 1)}>
          <Ionicons name="add" size={15} color={Colors.white} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartSubtotal}>{formatCurrency(item.subtotal)}</Text>
    </View>
  );
}

function SummaryLine({ label, val, valColor }: { label: string; val: string; valColor?: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryVal, valColor ? { color: valColor } : null]}>{val}</Text>
    </View>
  );
}

function ReceiptRow({ label, val, valColor }: { label: string; val?: string; valColor?: string }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={[styles.receiptValue, valColor ? { color: valColor } : null]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 14, paddingHorizontal: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  headerTitle: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  headerDot: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginHorizontal: 2 },
  customerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 130 },
  customerPillText: { color: Colors.white, fontSize: Fonts.sizes.xs, fontWeight: '600', flex: 1 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textPrimary },
  scanBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  quickBar: { flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  quickItem: { flex: 1, alignItems: 'center', gap: 2 },
  quickIcon: { position: 'relative' },
  quickText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  quickDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  quickBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: Colors.error, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  quickBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
  catWrapper: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catScroll: { paddingHorizontal: Spacing.base, paddingVertical: 10, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  catChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  catTextOn: { color: Colors.white },
  gridRow: { gap: Spacing.sm, paddingHorizontal: Spacing.base },
  gridContent: { paddingTop: Spacing.md, paddingBottom: 130, gap: Spacing.sm },
  emptyList: { alignItems: 'center', padding: Spacing.xxl },
  cartBar: { position: 'absolute', bottom: 16, left: Spacing.base, right: Spacing.base, borderRadius: Radius.lg, overflow: 'hidden' },
  cartBarGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.base, gap: Spacing.sm },
  cartBarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cartBarBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full, minWidth: 26, height: 26, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  cartBarBadgeText: { color: Colors.white, fontSize: Fonts.sizes.sm, fontWeight: '800' },
  cartBarLabel: { color: Colors.white, fontSize: Fonts.sizes.base, fontWeight: '700' },
  cartBarTotal: { color: Colors.white, fontSize: Fonts.sizes.base, fontWeight: '800', marginRight: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.55)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  centeredModalScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sheetTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  sheetSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  sheetHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.errorLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full },
  clearBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.error },
  sheetItems: { paddingHorizontal: Spacing.base },
  emptyCart: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  cartEmoji: { fontSize: 26, width: 32, textAlign: 'center' },
  cartInfo: { flex: 1 },
  cartName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  cartUnitPrice: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  grosirTag: { color: Colors.secondary, fontWeight: '700' },
  cartNote: { fontSize: 10, color: Colors.textLight, fontStyle: 'italic', marginTop: 1 },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctrlBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  ctrlBtnFill: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ctrlQty: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.textPrimary, minWidth: 22, textAlign: 'center' },
  ctrlQtyInput: { fontSize: Fonts.sizes.base, fontWeight: '800', color: Colors.textPrimary, minWidth: 40, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 2, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, backgroundColor: Colors.white },
  ctrlQtyInputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  cartQtyError: { fontSize: 10, fontWeight: '700', color: Colors.error, marginTop: 2 },
  cartSubtotal: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primary, minWidth: 70, textAlign: 'right' },
  discChips: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: 6 },
  discChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  discChipOn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  discChipText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary },
  discChipTextOn: { color: Colors.white },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.base, marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.background },
  creditRowOn: { backgroundColor: Colors.secondarySoft },
  creditText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  summaryBox: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  summaryVal: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  totalLine: { borderTopWidth: 1.5, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: 4, marginBottom: Spacing.md },
  totalLabel: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  totalVal: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.primary },
  holdBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.warning, backgroundColor: Colors.warningLight, minWidth: 110 },
  holdBtnText: { color: Colors.warning, fontWeight: '800', fontSize: Fonts.sizes.sm },
  payBtn: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  payBtnDisabled: { opacity: 0.7 },
  payBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8 },
  payBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
  paySheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
  paySheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  paySheetTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  totalBox: { marginHorizontal: Spacing.base, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.base },
  totalBoxLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: 4 },
  totalBoxAmount: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  totalBoxItems: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 4 },
  payLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textSecondary, marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  payMethodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  payMethodCard: { flex: 1, minWidth: '45%', alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  payMethodCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  payMethodCardText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  payMethodCardTextOn: { color: Colors.primary },
  cashSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  cashInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, backgroundColor: Colors.primarySoft },
  quickAmt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.border },
  quickAmtText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.primary },
  changeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm },
  changeLabel: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.textPrimary },
  changeVal: { fontSize: Fonts.sizes.lg, fontWeight: '800' },
  qrisBox: { alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  qrisPlaceholder: { width: 200, height: 200, borderRadius: Radius.lg, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  qrisHint: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: Spacing.sm },
  noteBox: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.base, backgroundColor: Colors.infoLight, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.base, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.info, lineHeight: 18 },
  confirmBtn: { marginHorizontal: Spacing.base, borderRadius: Radius.md, overflow: 'hidden' },
  confirmBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  confirmBtnText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
  receiptCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden' },
  receiptTop: { alignItems: 'center', paddingVertical: Spacing.xl, paddingTop: Spacing.xxl },
  receiptCheckCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  receiptTitle: { color: Colors.white, fontSize: Fonts.sizes.xl, fontWeight: '800', marginBottom: 4 },
  receiptId: { color: 'rgba(255,255,255,0.8)', fontSize: Fonts.sizes.sm },
  receiptBody: { padding: Spacing.lg },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  receiptLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  receiptValue: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  receiptActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  receiptShareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12 },
  receiptShareText: { color: Colors.primary, fontWeight: '700', fontSize: Fonts.sizes.sm },
  receiptCloseBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  receiptCloseTxt: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.sm },
  scanCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  scanTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  scanArea: { height: 160, backgroundColor: Colors.primarySoft, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  scanLine: { width: 140, height: 2, backgroundColor: Colors.error, marginTop: 6 },
  scanHint: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: Spacing.sm },
  scanInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.md, backgroundColor: Colors.white },
  scanSubmit: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  scanSubmitText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
  memberSearchWrap: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  memberSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.borderLight },
  memberSearchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textPrimary },
  custRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, marginHorizontal: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  custRowOn: { backgroundColor: Colors.primarySoft },
  custAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  custInit: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  custName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  custMeta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
});
