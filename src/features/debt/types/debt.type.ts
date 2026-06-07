import type { ISODate, ISODateString, Rupiah } from '@shared/types/common';
import type { PaymentMethodKey } from '@features/catalog/types/catalog.type';
import type { Member } from '@features/members/types/members.type';

export type DebtRecordType = 'debt' | 'payment';
export type DebtStatus = 'open' | 'partial' | 'paid';

export interface DebtAllocation {
  debtRecordId: string;
  amount: Rupiah;
}

export interface DebtRecord {
  id: string;
  memberId: string;
  type: DebtRecordType;
  amount: Rupiah;
  /** Only meaningful for `type: 'debt'`. */
  outstanding?: Rupiah;
  status?: DebtStatus;
  dueDate?: ISODate;
  createdAt: ISODateString;
  note?: string;
  /** Only meaningful for `type: 'payment'`. */
  method?: PaymentMethodKey;
  allocations?: DebtAllocation[];
}

/** A member that currently has outstanding debt, with their open debt records. */
export interface DebtorSummary extends Member {
  records: DebtRecord[];
}

export type PayDebtResult =
  | { ok: true; allocations: DebtAllocation[]; memberTotalDebtAfter: Rupiah }
  | { ok: false; error: string };

export interface DebtContextValue {
  debtRecords: DebtRecord[];
  debtorSummaries: DebtorSummary[];
  payDebt: (
    memberId: string,
    amount: Rupiah,
    method?: PaymentMethodKey,
    targetIds?: string[] | null
  ) => PayDebtResult;
}
