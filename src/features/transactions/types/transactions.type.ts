import type { ISODateString, Rupiah } from '@shared/types/common';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';

export type TransactionStatus = 'completed' | 'voided' | 'void_requested';

export interface TransactionItem {
  productId: string;
  name: string;
  image: string;
  qty: number;
  hargaJual: Rupiah;
  hargaBeli?: Rupiah;
  subtotal: Rupiah;
  note?: string;
  variantId?: string | null;
  uomConversionId?: string | null;
}

export interface Transaction {
  id: string;
  clientTxnId?: string;
  code: string;
  createdAt: ISODateString;
  items: TransactionItem[];
  subtotal: Rupiah;
  discount: Rupiah;
  tax: Rupiah;
  total: Rupiah;
  method: PaymentMethodKey;
  cashReceived?: Rupiah;
  change: Rupiah;
  cashier: string;
  memberName: string;
  memberId?: string;
  status: TransactionStatus;
  credit: boolean;
  outletId?: string;
  outletName?: string;
  shiftId: string;
  synced?: boolean;
  voidReason?: string | null;
  voidedAt?: ISODateString;
}

export interface VoidResult {
  requiresApproval: boolean;
}

export interface TransactionsContextValue {
  transactions: Transaction[];
  voidTransaction: (txId: string, reason?: string) => VoidResult;
  approveVoid: (txId: string) => void;
  rejectVoid: (txId: string) => void;
}
