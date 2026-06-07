/**
 * Public hook for the debt feature — re-exported from the feature store so
 * consumers depend on `@features/debt/hooks/useDebt` rather than the store impl.
 */
export { useDebt } from '@features/debt/store/debt.store';
