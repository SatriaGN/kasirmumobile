/**
 * Public hook for the sync feature — re-exported from the feature store so
 * consumers depend on `@features/sync/hooks/useSync` rather than the store impl.
 */
export { useSync } from '@features/sync/store/sync.store';
