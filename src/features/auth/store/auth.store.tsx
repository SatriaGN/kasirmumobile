import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AuthContextValue, PermissionKey, User } from '@features/auth/types/auth.type';
import { USERS, OUTLETS } from '@data/mockData';
import { useOutlet } from '@features/outlet/store/outlet.store';

interface AuthProviderProps {
  children: React.ReactNode;
  /** Called on logout so other domains can reset their state. */
  onLogout?: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children, onLogout }: AuthProviderProps) => {
  const { setActiveOutlet } = useOutlet();
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = !!user;

  const login = useCallback<AuthContextValue['login']>(
    (email, password) => {
      const found = USERS.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!found) return { ok: false, error: 'INVALID_CREDENTIALS' };
      setUser(found);
      // Kasir with a single outlet auto-select.
      if (found.outletIds.length === 1) {
        setActiveOutlet(OUTLETS.find((o) => o.id === found.outletIds[0]) || null);
      }
      return { ok: true, user: found };
    },
    [setActiveOutlet]
  );

  const logout = useCallback(() => {
    setUser(null);
    setActiveOutlet(null);
    onLogout?.();
  }, [setActiveOutlet, onLogout]);

  const hasPermission = useCallback(
    (perm: PermissionKey): boolean => {
      if (!user) return false;
      return !!user.permissions?.[perm];
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoggedIn, login, logout, hasPermission }),
    [user, isLoggedIn, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
