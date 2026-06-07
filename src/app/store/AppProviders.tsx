import React, { useRef } from 'react';
import { ResetRegistryProvider, useResetRegistry } from './ResetRegistry';
import { OutletProvider } from '@features/outlet/store/outlet.store';
import { AuthProvider } from '@features/auth/store/auth.store';
import { CatalogProvider } from '@features/catalog/store/catalog.store';
import { MembersProvider } from '@features/members/store/members.store';
import { DebtProvider } from '@features/debt/store/debt.store';
import { TransactionsProvider } from '@features/transactions/store/transactions.store';
import { SyncProvider } from '@features/sync/store/sync.store';
import { ShiftProvider } from '@features/shift/store/shift.store';
import { PosProvider } from '@features/pos/store/pos.store';
import { PosResetProvider, type PosResetActions } from '@features/pos/services/pos-reset.service';

/** Bridges the reset registry into AuthProvider so logout clears domain state. */
const AuthWithReset = ({ children }: { children: React.ReactNode }) => {
  const { resetAll } = useResetRegistry();
  return <AuthProvider onLogout={resetAll}>{children}</AuthProvider>;
};

/**
 * Composes every domain provider in dependency order:
 *   outlet → auth → catalog → members → debt → transactions → sync → shift → pos
 *
 * `PosResetProvider` holds a ref the shift domain reads to clear POS-owned held
 * orders on close, without importing PosContext (which depends on shift data).
 */
export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const posResetRef = useRef<PosResetActions | null>(null);

  return (
    <ResetRegistryProvider>
      <OutletProvider>
        <AuthWithReset>
          <CatalogProvider>
            <MembersProvider>
              <DebtProvider>
                <TransactionsProvider>
                  <SyncProvider>
                    <PosResetProvider value={posResetRef}>
                      <ShiftProvider>
                        <PosProvider>{children}</PosProvider>
                      </ShiftProvider>
                    </PosResetProvider>
                  </SyncProvider>
                </TransactionsProvider>
              </DebtProvider>
            </MembersProvider>
          </CatalogProvider>
        </AuthWithReset>
      </OutletProvider>
    </ResetRegistryProvider>
  );
};
