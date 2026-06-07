import type { Outlet } from '@features/outlet/types/outlet.type';

export type Role = 'kasir';

/** Permission flags carried in the user's JWT-style claims. */
export interface Permissions {
  canVoid?: boolean;
  canDiscount?: boolean;
  canViewShiftReport?: boolean;
  canViewCostPrice?: boolean;
  canManageMembers?: boolean;
}

export type PermissionKey = keyof Permissions;

export interface User {
  id: string;
  name: string;
  email: string;
  /** Demo only — real auth never stores plaintext passwords client-side. */
  password: string;
  role: Role;
  tenantId: string | null;
  outletIds: string[];
  permissions: Permissions;
  avatar: string;
  avatarBg: string;
}

export type LoginError = 'INVALID_CREDENTIALS';

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: LoginError };

export interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => LoginResult;
  logout: () => void;
  hasPermission: (perm: PermissionKey) => boolean;
}

// Re-exported for convenience where auth and outlet are used together.
export type { Outlet };
