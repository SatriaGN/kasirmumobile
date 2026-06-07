/**
 * Public hook for the pos feature — re-exported from the feature store so
 * consumers depend on `@features/pos/hooks/usePos` rather than the store impl.
 */
export { usePos } from '@features/pos/store/pos.store';
