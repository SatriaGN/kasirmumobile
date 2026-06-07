/**
 * Public hook for the outlet feature — re-exported from the feature store so
 * consumers depend on `@features/outlet/hooks/useOutlet` rather than the store impl.
 */
export { useOutlet } from '@features/outlet/store/outlet.store';
