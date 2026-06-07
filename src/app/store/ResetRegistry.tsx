import React, { createContext, useContext, useRef, useCallback } from 'react';

/**
 * App-level registry of "reset on logout" callbacks. Each domain provider that
 * holds session-scoped state registers a reset fn; AuthProvider.onLogout fires
 * them all. This keeps logout cleanup decoupled — Auth need not know about POS,
 * shift, or sync internals.
 */
type ResetFn = () => void;

interface ResetRegistryValue {
  register: (fn: ResetFn) => () => void;
  resetAll: () => void;
}

const ResetRegistryContext = createContext<ResetRegistryValue | null>(null);

export const ResetRegistryProvider = ({ children }: { children: React.ReactNode }) => {
  const fns = useRef(new Set<ResetFn>());

  const register = useCallback((fn: ResetFn) => {
    fns.current.add(fn);
    return () => {
      fns.current.delete(fn);
    };
  }, []);

  const resetAll = useCallback(() => {
    fns.current.forEach((fn) => fn());
  }, []);

  const value = useRef<ResetRegistryValue>({ register, resetAll }).current;

  return <ResetRegistryContext.Provider value={value}>{children}</ResetRegistryContext.Provider>;
};

export const useResetRegistry = (): ResetRegistryValue => {
  const ctx = useContext(ResetRegistryContext);
  if (!ctx) throw new Error('useResetRegistry must be used within ResetRegistryProvider');
  return ctx;
};

/** Register a reset callback for the lifetime of the calling component. */
export const useRegisterReset = (fn: ResetFn): void => {
  const { register } = useResetRegistry();
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => register(() => ref.current()), [register]);
};
