import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { DebtContextValue, DebtRecord, DebtorSummary } from '@features/debt/types/debt.type';
import { DEBT_RECORDS } from '@data/mockData';
import { useMembersStore } from '@features/members/store/members.store';

interface DebtInternalValue extends DebtContextValue {
  setDebtRecords: React.Dispatch<React.SetStateAction<DebtRecord[]>>;
}

const DebtContext = createContext<DebtInternalValue | null>(null);

export const DebtProvider = ({ children }: { children: React.ReactNode }) => {
  const { members, setMembers } = useMembersStore();
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>(DEBT_RECORDS);

  // Debtor payment (partial + FIFO allocation)
  const payDebt = useCallback<DebtContextValue['payDebt']>(
    (memberId, amount, method = 'tunai', targetIds = null) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return { ok: false, error: 'NOT_FOUND' };
      if (amount <= 0) return { ok: false, error: 'amount<=0' };
      if (amount > member.totalDebt) return { ok: false, error: 'Pembayaran melebihi total piutang' };

      let remaining = amount;
      const allocations: { debtRecordId: string; amount: number }[] = [];
      // open/partial debts, oldest first (FIFO)
      let debts = debtRecords
        .filter((d) => d.memberId === memberId && d.type === 'debt' && (d.outstanding ?? 0) > 0)
        .sort(
          (a, b) =>
            new Date(a.dueDate || a.createdAt).getTime() - new Date(b.dueDate || b.createdAt).getTime()
        );
      if (targetIds?.length) {
        debts = [
          ...debts.filter((d) => targetIds.includes(d.id)),
          ...debts.filter((d) => !targetIds.includes(d.id)),
        ];
      }
      const updated: DebtRecord[] = debtRecords.map((d) => ({ ...d }));
      for (const d of debts) {
        if (remaining <= 0) break;
        const rec = updated.find((x) => x.id === d.id);
        if (!rec) continue;
        const applied = Math.min(remaining, rec.outstanding ?? 0);
        rec.outstanding = (rec.outstanding ?? 0) - applied;
        rec.status = rec.outstanding === 0 ? 'paid' : 'partial';
        remaining -= applied;
        allocations.push({ debtRecordId: d.id, amount: applied });
      }
      updated.unshift({
        id: `dr-${Date.now()}`,
        memberId,
        type: 'payment',
        amount,
        method,
        allocations,
        createdAt: new Date().toISOString(),
      });
      setDebtRecords(updated);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, totalDebt: m.totalDebt - amount } : m))
      );
      return { ok: true, allocations, memberTotalDebtAfter: member.totalDebt - amount };
    },
    [members, debtRecords, setMembers]
  );

  const debtorSummaries = useMemo<DebtorSummary[]>(() => {
    return members
      .filter((m) => m.totalDebt > 0)
      .map((m) => {
        const records = debtRecords.filter(
          (d) => d.memberId === m.id && d.type === 'debt' && (d.outstanding ?? 0) > 0
        );
        return { ...m, records };
      });
  }, [members, debtRecords]);

  const value = useMemo<DebtInternalValue>(
    () => ({ debtRecords, debtorSummaries, payDebt, setDebtRecords }),
    [debtRecords, debtorSummaries, payDebt]
  );

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
};

const useDebtInternal = (): DebtInternalValue => {
  const ctx = useContext(DebtContext);
  if (!ctx) throw new Error('useDebt must be used within DebtProvider');
  return ctx;
};

export const useDebt = (): DebtContextValue => useDebtInternal();

/** Internal hook for the POS flow to append debt records on credit sales. */
export const useDebtStore = (): Pick<DebtInternalValue, 'setDebtRecords'> => {
  const { setDebtRecords } = useDebtInternal();
  return { setDebtRecords };
};
