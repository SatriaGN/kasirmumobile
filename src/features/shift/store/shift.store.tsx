import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { uuid } from '@shared/utils/format';
import type { ShiftContextValue, Shift, ZReport, ByMethodTotals, ClosedShiftSummary } from '@features/shift/types/shift.type';
import { useAuth } from '@features/auth/store/auth.store';
import { useOutlet } from '@features/outlet/store/outlet.store';
import { useTransactionsStore } from '@features/transactions/store/transactions.store';
import { usePosResetRef } from '@features/pos/services/pos-reset.service';
import { useRegisterReset } from '@app/store/ResetRegistry';

const ShiftContext = createContext<ShiftContextValue | null>(null);

const emptyByMethod = (): ByMethodTotals => ({ tunai: 0, qris: 0, kartu: 0, transfer: 0 });

export const ShiftProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();
  const { transactions } = useTransactionsStore();
  const resetPos = usePosResetRef();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);

  // Drop the active shift on logout (matches the original AppContext behavior).
  useRegisterReset(() => setActiveShift(null));

  const openShift = useCallback<ShiftContextValue['openShift']>(
    (kasAwal) => {
      const shift: Shift = {
        id: `SH-${Date.now()}`,
        clientShiftId: uuid(),
        openedAt: new Date().toISOString(),
        kasAwal: Number(kasAwal) || 0,
        cashier: user?.name || 'Kasir',
        outletId: activeOutlet?.id || null,
        outletName: activeOutlet?.name || null,
        status: 'active',
      };
      setActiveShift(shift);
      return shift;
    },
    [user, activeOutlet]
  );

  const closeShift = useCallback<ShiftContextValue['closeShift']>(
    (kasAkhirActual, keterangan): ClosedShiftSummary | null => {
      if (!activeShift) return null;
      const shiftTx = transactions.filter((t) => t.shiftId === 'active' && t.status === 'completed');
      const byMethod = emptyByMethod();
      shiftTx.forEach((t) => {
        byMethod[t.method] = (byMethod[t.method] || 0) + t.total;
      });
      const cashSales = byMethod.tunai;
      const totalOmzet = shiftTx.reduce((s, t) => s + t.total, 0);
      const expectedCash = activeShift.kasAwal + cashSales;
      const kasAkhir = Number(kasAkhirActual) || 0;
      const voidCount = transactions.filter(
        (t) => t.shiftId === 'active' && t.status === 'voided'
      ).length;
      const zReport: ZReport = {
        kasAwal: activeShift.kasAwal,
        kasAkhir,
        expectedCash,
        selisih: kasAkhir - expectedCash,
        totalOmzet,
        txnCount: shiftTx.length,
        voidCount,
        byMethod,
        discountTotal: shiftTx.reduce((s, t) => s + (t.discount || 0), 0),
        taxTotal: shiftTx.reduce((s, t) => s + (t.tax || 0), 0),
      };
      const trimmedKeterangan = keterangan?.trim();
      const closed: Shift = {
        ...activeShift,
        closedAt: new Date().toISOString(),
        status: 'closed',
        zReport,
        kasAkhir,
        ...(trimmedKeterangan ? { keterangan: trimmedKeterangan } : {}),
      };
      setShiftHistory((prev) => [closed, ...prev]);
      setActiveShift(null);
      resetPos.current?.clearHeldOrders();
      return { ...closed, ...zReport };
    },
    [activeShift, transactions, resetPos]
  );

  const shiftTransactions = useMemo(
    () => (activeShift ? transactions.filter((t) => t.shiftId === 'active') : []),
    [activeShift, transactions]
  );

  const value = useMemo<ShiftContextValue>(
    () => ({ activeShift, shiftHistory, shiftTransactions, openShift, closeShift }),
    [activeShift, shiftHistory, shiftTransactions, openShift, closeShift]
  );

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
};

export const useShift = (): ShiftContextValue => {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error('useShift must be used within ShiftProvider');
  return ctx;
};
