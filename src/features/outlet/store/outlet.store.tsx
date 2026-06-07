import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Outlet } from '@features/outlet/types/outlet.type';
import { OUTLETS } from '@data/mockData';

interface OutletContextValue {
  outlets: Outlet[];
  activeOutlet: Outlet | null;
  selectOutlet: (outlet: Outlet | null) => void;
  setActiveOutlet: React.Dispatch<React.SetStateAction<Outlet | null>>;
}

const OutletContext = createContext<OutletContextValue | null>(null);

export const OutletProvider = ({ children }: { children: React.ReactNode }) => {
  const [outlets] = useState<Outlet[]>(OUTLETS);
  const [activeOutlet, setActiveOutlet] = useState<Outlet | null>(null);

  const selectOutlet = useCallback((outlet: Outlet | null) => setActiveOutlet(outlet), []);

  const value = useMemo<OutletContextValue>(
    () => ({ outlets, activeOutlet, selectOutlet, setActiveOutlet }),
    [outlets, activeOutlet, selectOutlet]
  );

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
};

export const useOutlet = (): OutletContextValue => {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error('useOutlet must be used within OutletProvider');
  return ctx;
};
