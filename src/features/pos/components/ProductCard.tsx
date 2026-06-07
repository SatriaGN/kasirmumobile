import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { formatCurrency } from '@shared/utils/format';
import type { Product } from '@features/catalog/types/catalog.type';

interface ProductCardProps {
  product: Product;
  qty: number;
  /** Computed by the grid so columns adapt to orientation. */
  width: number;
  onPress: (product: Product) => void;
}

export default function ProductCard({ product, qty, width, onPress }: ProductCardProps) {
  const out = product.stokSaat === 0;
  const low = product.stokSaat > 0 && product.stokSaat <= product.stokMinimum;
  const hasOptions =
    product.variants?.length > 0 || product.uomConversions?.length > 0 || product.wholesalePrices?.length > 0;
  return (
    <TouchableOpacity style={[styles.productCard, { width }]} onPress={() => onPress(product)} activeOpacity={0.82}>
      {qty > 0 && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{qty}</Text>
        </View>
      )}
      {out && (
        <View style={styles.outBadge}>
          <Text style={styles.outBadgeText}>HABIS</Text>
        </View>
      )}
      {low && (
        <View style={[styles.outBadge, { backgroundColor: Colors.warning }]}>
          <Text style={styles.outBadgeText}>MENIPIS</Text>
        </View>
      )}
      <View style={styles.emojiWrap}>
        <Text style={styles.productEmoji}>{product.image}</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.productStock}>Stok: {product.stokSaat}</Text>
      {hasOptions && (
        <View style={styles.tagRow}>
          {product.variants?.length > 0 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Varian</Text>
            </View>
          )}
          {product.uomConversions?.length > 0 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>UOM</Text>
            </View>
          )}
          {product.wholesalePrices?.length > 0 && (
            <View style={[styles.tag, { backgroundColor: Colors.secondarySoft }]}>
              <Text style={[styles.tagText, { color: Colors.secondary }]}>Grosir</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{formatCurrency(product.hargaJual)}</Text>
        <View style={styles.addBtn}>
          <Ionicons name="add" size={16} color={Colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.md },
  qtyBadge: { position: 'absolute', top: 8, right: 8, zIndex: 2, backgroundColor: Colors.secondary, borderRadius: Radius.full, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  qtyBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  outBadge: { position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: Colors.error, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  outBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
  emojiWrap: { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm, alignSelf: 'center' },
  productEmoji: { fontSize: 30 },
  productName: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2, lineHeight: 18 },
  productStock: { fontSize: 10, color: Colors.textSecondary, marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  tag: { backgroundColor: Colors.primarySoft, borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontSize: 8, fontWeight: '700', color: Colors.primary },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.primary, flex: 1 },
  addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
});
