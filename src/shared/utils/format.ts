// Shared formatting & PRD calculation helpers (00-foundation.md §6)

import type { ISODateString, Rupiah, DiscountType } from '@shared/types/common';

export const formatCurrency = (val: number | null | undefined): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0);

export const formatDateTime = (iso: ISODateString): string =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDate = (iso: ISODateString): string =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const formatTime = (iso: ISODateString): string =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Group raw digit input with thousand separators, e.g. "1000000" -> "1.000.000".
// Strips any non-digit so it's safe to pass user-typed text directly.
export const groupDigits = (text: string | number | null | undefined): string => {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse grouped/typed currency text back to an integer Rupiah value.
export const parseCurrency = (text: string | number | null | undefined): Rupiah =>
  parseInt(String(text ?? '').replace(/\D/g, ''), 10) || 0;

// Half-up rounding on Rupiah
export const roundRp = (n: number): Rupiah => Math.round(n);

// ─── Structural shapes for pricing/total calculations ───────────────────────────
// Declared locally so `shared` does not depend on feature modules. The catalog /
// pos domain types are structurally compatible with these.

export interface PriceableVariant {
  id: string;
  priceDelta?: number;
}

export interface PriceableUomConversion {
  id: string;
  factor: number;
  hargaJual: Rupiah;
}

export interface PriceableWholesaleTier {
  minQty: number;
  price: Rupiah;
}

export interface PriceableProduct {
  hargaJual: Rupiah;
  variants?: PriceableVariant[];
  uomConversions?: PriceableUomConversion[];
  wholesalePrices?: PriceableWholesaleTier[];
}

export interface PriceSelection {
  variantId?: string | null;
  uomConversionId?: string | null;
  qty?: number;
}

export interface TotalsLine {
  subtotal: Rupiah;
}

export interface DiscountConfigLike {
  type: DiscountType;
  value: number;
  minPurchase?: number;
}

export interface TaxConfigLike {
  ppnEnabled: boolean;
  ppnRate: number;
  ppnIncluded: boolean;
}

export interface ComputeTotalsOptions {
  discountConfig?: DiscountConfigLike | null;
  manualDiscount?: { type: DiscountType; value: number } | null;
  tax?: TaxConfigLike | null;
}

export interface CartTotals {
  subtotal: Rupiah;
  discount: Rupiah;
  tax: Rupiah;
  total: Rupiah;
}

// Effective unit price for a cart line (wholesale tier > variant > uom > base)
export function effectiveUnitPrice(
  product: PriceableProduct | null | undefined,
  { variantId, uomConversionId, qty = 1 }: PriceSelection = {}
): Rupiah {
  if (!product) return 0;
  // a. wholesale tier (base unit)
  if (!uomConversionId && product.wholesalePrices?.length) {
    const tiers = product.wholesalePrices
      .filter((w) => qty >= w.minQty)
      .sort((a, b) => b.minQty - a.minQty);
    if (tiers.length) return tiers[0]!.price;
  }
  // c. uom conversion
  if (uomConversionId) {
    const u = product.uomConversions?.find((x) => x.id === uomConversionId);
    if (u) return u.hargaJual;
  }
  // b. variant delta
  if (variantId) {
    const v = product.variants?.find((x) => x.id === variantId);
    if (v) return product.hargaJual + (v.priceDelta || 0);
  }
  // d. base
  return product.hargaJual;
}

// Whether a wholesale tier is currently applied (for "Harga grosir" badge)
export function isWholesale(
  product: PriceableProduct | null | undefined,
  { uomConversionId, qty = 1 }: PriceSelection = {}
): boolean {
  if (uomConversionId || !product?.wholesalePrices?.length) return false;
  return product.wholesalePrices.some((w) => qty >= w.minQty);
}

// Compute totals for a cart per PRD §6
export function computeTotals(
  cart: TotalsLine[],
  { discountConfig, manualDiscount, tax }: ComputeTotalsOptions = {}
): CartTotals {
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  let discount = 0;
  if (discountConfig && subtotal >= (discountConfig.minPurchase || 0)) {
    discount =
      discountConfig.type === 'percentage'
        ? roundRp((subtotal * discountConfig.value) / 100)
        : discountConfig.value;
  }
  if (manualDiscount && manualDiscount.value > 0) {
    discount +=
      manualDiscount.type === 'percentage'
        ? roundRp((subtotal * manualDiscount.value) / 100)
        : manualDiscount.value;
  }
  discount = Math.min(discount, subtotal);
  const taxBase = subtotal - discount;
  let taxAmt = 0;
  if (tax?.ppnEnabled && !tax.ppnIncluded) taxAmt = roundRp((taxBase * tax.ppnRate) / 100);
  const total = taxBase + taxAmt;
  return { subtotal, discount, tax: taxAmt, total };
}

export type AgingBucket = '0-7' | '8-14' | '15-30' | '30+';

// Aging bucket from a due date / created date
export function agingBucket(dateIso: ISODateString): AgingBucket {
  const days = Math.floor((Date.now() - new Date(dateIso).getTime()) / 86400000);
  if (days <= 7) return '0-7';
  if (days <= 14) return '8-14';
  if (days <= 30) return '15-30';
  return '30+';
}

export function ageDays(dateIso: ISODateString): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / 86400000);
}

/** Generate a pseudo-unique client id (offline-first idempotency key). */
export const uuid = (): string =>
  'xxxx-4xxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)) + '-' + Date.now();
