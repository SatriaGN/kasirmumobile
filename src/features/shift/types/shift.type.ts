import type { ISODateString, Rupiah } from '@shared/types/common';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { Transaction } from '@features/transactions/types/transactions.type';

export type ShiftStatus = 'active' | 'closed';

export type ByMethodTotals = Record<PaymentMethodKey, Rupiah>;

export interface ZReport {
  kasAwal: Rupiah;
  kasAkhir: Rupiah;
  expectedCash: Rupiah;
  selisih: Rupiah;
  totalOmzet: Rupiah;
  txnCount: number;
  voidCount: number;
  byMethod: ByMethodTotals;
  discountTotal: Rupiah;
  taxTotal: Rupiah;
}

export interface Shift {
  id: string;
  clientShiftId: string;
  openedAt: ISODateString;
  kasAwal: Rupiah;
  cashier: string;
  outletId: string | null;
  outletName: string | null;
  status: ShiftStatus;
  closedAt?: ISODateString;
  kasAkhir?: Rupiah;
  keterangan?: string;
  zReport?: ZReport;
}

/** Returned by closeShift: the closed shift flattened with its Z-report figures. */
export type ClosedShiftSummary = Shift & ZReport;

export interface ShiftContextValue {
  activeShift: Shift | null;
  shiftHistory: Shift[];
  shiftTransactions: Transaction[];
  openShift: (kasAwal: number) => Shift;
  closeShift: (kasAkhirActual: number, keterangan?: string) => ClosedShiftSummary | null;
}
