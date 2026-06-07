import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Fonts } from '@shared/theme';
import { formatCurrency, effectiveUnitPrice, isWholesale } from '@shared/utils/format';
import type { Product } from '@features/catalog/types/catalog.type';
import type { LineOptions } from '@features/pos/types/pos.type';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, opts: LineOptions) => void;
  canViewCost: boolean;
}

export default function ProductDetailModal({ product, onClose, onAdd, canViewCost }: ProductDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [uomId, setUomId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState('1');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (product) {
      setVariantId(product.variants?.length ? product.variants[0]!.id : null);
      setUomId(null);
      setQty(1);
      setQtyText('1');
      setNote('');
    }
  }, [product]);

  // Keep editable text in sync with qty changes from the +/- buttons.
  useEffect(() => {
    setQtyText(String(qty));
  }, [qty]);

  // Commit on every keystroke, including empty/0 — the add button is disabled instead.
  const handleChangeQty = (t: string) => {
    const digits = t.replace(/\D/g, '');
    setQtyText(digits);
    setQty(parseInt(digits, 10) || 0);
  };

  const qtyInvalid = qty <= 0;

  if (!product) return null;
  const unitPrice = effectiveUnitPrice(product, { variantId, uomConversionId: uomId, qty });
  const wholesale = isWholesale(product, { uomConversionId: uomId, qty });
  const needsVariant = product.variants?.length > 0;

  return (
    <Modal visible={!!product} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayDismiss} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: winHeight * 0.88, paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 30 }}>{product.image}</Text>
              <View>
                <Text style={styles.sheetTitle}>{product.name}</Text>
                <Text style={styles.sheetSub}>
                  Stok: {product.stokSaat}
                  {canViewCost ? ` · HPP ${formatCurrency(product.hargaBeli)}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: winHeight * 0.5, paddingHorizontal: Spacing.base }}>
            {needsVariant && (
              <>
                <Text style={styles.detailLabel}>Varian *</Text>
                <View style={styles.optRow}>
                  {product.variants.map((v) => (
                    <TouchableOpacity key={v.id} style={[styles.optChip, variantId === v.id && styles.optChipOn]} onPress={() => setVariantId(v.id)}>
                      <Text style={[styles.optChipText, variantId === v.id && styles.optChipTextOn]}>
                        {v.name}
                        {v.priceDelta ? ` (${v.priceDelta > 0 ? '+' : ''}${formatCurrency(v.priceDelta)})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {product.uomConversions?.length > 0 && (
              <>
                <Text style={styles.detailLabel}>Satuan Jual</Text>
                <View style={styles.optRow}>
                  <TouchableOpacity style={[styles.optChip, !uomId && styles.optChipOn]} onPress={() => setUomId(null)}>
                    <Text style={[styles.optChipText, !uomId && styles.optChipTextOn]}>Satuan ({formatCurrency(product.hargaJual)})</Text>
                  </TouchableOpacity>
                  {product.uomConversions.map((u) => (
                    <TouchableOpacity key={u.id} style={[styles.optChip, uomId === u.id && styles.optChipOn]} onPress={() => setUomId(u.id)}>
                      <Text style={[styles.optChipText, uomId === u.id && styles.optChipTextOn]}>
                        {u.name} ({formatCurrency(u.hargaJual)})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <Text style={styles.detailLabel}>Jumlah</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                <Ionicons name="remove" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.qtyInput, qtyInvalid && styles.qtyInputError]}
                value={qtyText}
                onChangeText={handleChangeQty}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={4}
              />
              <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnFill]} onPress={() => setQty(qty + 1)}>
                <Ionicons name="add" size={22} color={Colors.white} />
              </TouchableOpacity>
              {wholesale && (
                <View style={styles.grosirBadge}>
                  <Text style={styles.grosirBadgeText}>Harga grosir</Text>
                </View>
              )}
            </View>
            {qtyInvalid && <Text style={styles.qtyError}>Jumlah tidak boleh kosong atau 0</Text>}
            <Text style={styles.detailLabel}>Catatan</Text>
            <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Mis: tanpa gula" placeholderTextColor={Colors.textLight} />
          </ScrollView>

          <View style={styles.detailFooter}>
            <View>
              <Text style={styles.detailFooterLabel}>Subtotal</Text>
              <Text style={styles.detailFooterVal}>{formatCurrency(unitPrice * qty)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.detailAddBtn, qtyInvalid && styles.detailAddBtnDisabled]}
              onPress={() => onAdd(product, { variantId: needsVariant ? variantId : null, uomConversionId: uomId, qty, note })}
              activeOpacity={0.88}
              disabled={qtyInvalid}
            >
              <LinearGradient colors={qtyInvalid ? ['#B0B7C3', '#C7CDD6'] : ['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.detailAddGrad}>
                <Ionicons name="cart" size={20} color={Colors.white} />
                <Text style={styles.detailAddText}>Tambah</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.55)', justifyContent: 'flex-end' },
  overlayDismiss: { flex: 1 },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sheetTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  sheetSub: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  detailLabel: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  optChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  optChipText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  optChipTextOn: { color: Colors.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnFill: { backgroundColor: Colors.primary },
  qtyVal: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.textPrimary, minWidth: 40, textAlign: 'center' },
  qtyInput: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.textPrimary, minWidth: 64, textAlign: 'center', paddingVertical: 6, paddingHorizontal: 4, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.white },
  qtyInputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  qtyError: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.error, marginTop: Spacing.sm },
  grosirBadge: { backgroundColor: Colors.secondarySoft, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 'auto' },
  grosirBadgeText: { color: Colors.secondary, fontSize: Fonts.sizes.xs, fontWeight: '800' },
  noteInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, backgroundColor: Colors.white },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.md, gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  detailFooterLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  detailFooterVal: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.primary },
  detailAddBtn: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  detailAddBtnDisabled: { opacity: 0.7 },
  detailAddGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  detailAddText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
