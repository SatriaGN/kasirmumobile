import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { TransactionsContextValue, Transaction } from '@features/transactions/types/transactions.type';
import { TRANSACTIONS } from '@data/mockData';
import { useAuth } from '@features/auth/store/auth.store';

interface TransactionsInternalValue extends TransactionsContextValue {
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const TransactionsContext = createContext<TransactionsInternalValue | null>(null);

export const TransactionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { hasPermission } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);

  const voidTransaction = useCallback<TransactionsContextValue['voidTransaction']>(
    (txId, reason = '') => {
      const canVoid = hasPermission('canVoid');
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                status: canVoid ? 'voided' : 'void_requested',
                voidReason: reason,
                voidedAt: new Date().toISOString(),
              }
            : t
        )
      );
      return { requiresApproval: !canVoid };
    },
    [hasPermission]
  );

  const approveVoid = useCallback<TransactionsContextValue['approveVoid']>((txId) => {
    setTransactions((prev) => prev.map((t) => (t.id === txId ? { ...t, status: 'voided' } : t)));
  }, []);

  const rejectVoid = useCallback<TransactionsContextValue['rejectVoid']>((txId) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, status: 'completed', voidReason: null } : t))
    );
  }, []);

  const value = useMemo<TransactionsInternalValue>(
    () => ({ transactions, voidTransaction, approveVoid, rejectVoid, setTransactions }),
    [transactions, voidTransaction, approveVoid, rejectVoid]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

const useTransactionsInternal = (): TransactionsInternalValue => {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
};

export const useTransactions = (): TransactionsContextValue => useTransactionsInternal();

/** Internal hook for POS (append sales) and shift (close-shift sync flag). */
export const useTransactionsStore = (): Pick<
  TransactionsInternalValue,
  'transactions' | 'setTransactions'
> => {
  const { transactions, setTransactions } = useTransactionsInternal();
  return { transactions, setTransactions };
};
