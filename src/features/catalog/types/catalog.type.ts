import type { Rupiah } from '@shared/types/common';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Uom {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  /** Price difference relative to the base sell price (can be negative). */
  priceDelta: number;
}

export interface UomConversion {
  id: string;
  uomId: string;
  name: string;
  /** How many base units this conversion represents (e.g. 1 box = 40 pcs). */
  factor: number;
  hargaJual: Rupiah;
}

export interface WholesaleTier {
  id: string;
  minQty: number;
  price: Rupiah;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  /** Emoji used as the product image in this demo. */
  image: string;
  hargaJual: Rupiah;
  hargaBeli: Rupiah;
  stokSaat: number;
  stokMinimum: number;
  variants: ProductVariant[];
  uomConversions: UomConversion[];
  wholesalePrices: WholesaleTier[];
}

export interface TaxConfig {
  ppnEnabled: boolean;
  ppnRate: number;
  ppnIncluded: boolean;
}

export type PaymentMethodKey = 'tunai' | 'qris' | 'kartu' | 'transfer';

export interface PaymentMethod {
  id: string;
  key: PaymentMethodKey;
  label: string;
  icon: string;
  isEnabled: boolean;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase: number;
  isActive: boolean;
}

export interface CatalogContextValue {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  uoms: Uom[];
  tax: TaxConfig;
  paymentMethods: PaymentMethod[];
  discounts: Discount[];
  findProductByBarcode: (code: string) => Product | null;
}
