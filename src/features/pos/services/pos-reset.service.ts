import React, { createContext, useContext } from 'react';

/**
 * Coordination bridge so sibling domains (e.g. shift close) can clear POS-owned
 * transient state (held orders) without importing PosContext directly — which
 * would create a provider-ordering cycle (Pos depends on Shift's data).
 */
export interface PosResetActions {
  clearHeldOrders: () => void;
}

export type PosResetRef = React.MutableRefObject<PosResetActions | null>;

const PosResetContext = createContext<PosResetRef | null>(null);

export const PosResetProvider = PosResetContext.Provider;

export const usePosResetRef = (): PosResetRef => {
  const ref = useContext(PosResetContext);
  if (!ref) throw new Error('usePosResetRef must be used within PosResetProvider');
  return ref;
};
