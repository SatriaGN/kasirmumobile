import type { ISODateString, Rupiah, DiscountType } from '@shared/types/common';
import type { CartTotals } from '@shared/utils/format';
import type { Product, Discount, PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { Member } from '@features/members/types/members.type';
import type { Transaction } from '@features/transactions/types/transactions.type';

/** Options when building a cart line from a product. */
export interface LineOptions {
  variantId?: string | null;
  uomConversionId?: string | null;
  qty?: number;
  note?: string;
}

export interface CartLine {
  /** Stable key derived from product + variant + uom. */
  lineId: string;
  productId: string;
  name: string;
  image: string;
  variantId: string | null;
  uomConversionId: string | null;
  note: string;
  qty: number;
  unitPrice: Rupiah;
  hargaBeli: Rupiah;
  subtotal: Rupiah;
}

export interface ManualDiscount {
  type: DiscountType;
  value: number;
}

export interface HeldOrder {
  id: string;
  heldAt: ISODateString;
  items: CartLine[];
  discountConfig: Discount | null;
  manualDiscount: ManualDiscount | null;
  member: Member | null;
  note: string;
  total: Rupiah;
  itemCount: number;
}

export interface PosContextValue {
  cart: CartLine[];
  totals: CartTotals;
  selectedMember: Member;
  discountConfig: Discount | null;
  manualDiscount: ManualDiscount | null;
  isCredit: boolean;
  heldOrders: HeldOrder[];

  buildLine: (product: Product, opts?: LineOptions) => CartLine;
  addToCart: (product: Product, opts?: LineOptions) => void;
  removeFromCart: (lineId: string) => void;
  updateCartQty: (lineId: string, qty: number) => void;
  clearCart: () => void;

  setSelectedMember: React.Dispatch<React.SetStateAction<Member>>;
  setDiscountConfig: React.Dispatch<React.SetStateAction<Discount | null>>;
  setManualDiscount: React.Dispatch<React.SetStateAction<ManualDiscount | null>>;
  setIsCredit: React.Dispatch<React.SetStateAction<boolean>>;

  holdCurrentOrder: (note?: string) => HeldOrder | null;
  resumeHeldOrder: (holdId: string) => boolean;
  deleteHeldOrder: (holdId: string) => void;

  processPayment: (method: PaymentMethodKey, cashReceived: number) => Transaction;
}
