import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { SyncContextValue, OutboxItem, SyncStatus } from '@features/sync/types/sync.type';
import { useTransactionsStore } from '@features/transactions/store/transactions.store';
import { useRegisterReset } from '@app/store/ResetRegistry';

interface SyncInternalValue extends SyncContextValue {
  setOutbox: React.Dispatch<React.SetStateAction<OutboxItem[]>>;
}

const SyncContext = createContext<SyncInternalValue | null>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { setTransactions } = useTransactionsStore();
  const [online, setOnline] = useState(true);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);

  // Clear the outbox on logout (online stays as-is; it's a device setting).
  useRegisterReset(() => setOutbox([]));

  const toggleOnline = useCallback(() => setOnline((v) => !v), []);

  const syncOutbox = useCallback<SyncContextValue['syncOutbox']>(() => {
    setOutbox((prev) => prev.map((o) => ({ ...o, status: 'synced', message: 'Tersinkron' })));
    setTransactions((prev) => prev.map((t) => ({ ...t, synced: true })));
    setTimeout(() => setOutbox([]), 600);
  }, [setTransactions]);

  const syncStatus = useMemo<SyncStatus>(() => {
    if (!online) return { color: 'red', label: 'Offline', count: outbox.length };
    const pending = outbox.filter((o) => o.status === 'pending' || o.status === 'sending').length;
    const review = outbox.filter((o) => o.status === 'needs_review').length;
    if (review > 0) return { color: 'amber', label: 'Perlu tinjauan', count: review };
    if (pending > 0) return { color: 'yellow', label: `${pending} menunggu`, count: pending };
    return { color: 'green', label: 'Tersinkron', count: 0 };
  }, [online, outbox]);

  const value = useMemo<SyncInternalValue>(
    () => ({ online, outbox, syncStatus, toggleOnline, syncOutbox, setOutbox }),
    [online, outbox, syncStatus, toggleOnline, syncOutbox]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

const useSyncInternal = (): SyncInternalValue => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};

export const useSync = (): SyncContextValue => useSyncInternal();

/** Internal hook for the POS flow to enqueue outbox items on offline sales. */
export const useSyncStore = (): Pick<SyncInternalValue, 'online' | 'setOutbox'> => {
  const { online, setOutbox } = useSyncInternal();
  return { online, setOutbox };
};
