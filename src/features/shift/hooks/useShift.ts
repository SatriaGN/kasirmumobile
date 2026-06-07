/**
 * Public hook for the shift feature — re-exported from the feature store so
 * consumers depend on `@features/shift/hooks/useShift` rather than the store impl.
 */
export { useShift } from '@features/shift/store/shift.store';
