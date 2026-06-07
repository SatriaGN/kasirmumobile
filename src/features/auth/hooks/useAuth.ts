/**
 * Public hook for the auth feature — re-exported from the feature store so
 * consumers depend on `@features/auth/hooks/useAuth` rather than the store impl.
 */
export { useAuth } from '@features/auth/store/auth.store';
