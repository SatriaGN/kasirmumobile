/**
 * Public hook for the transactions feature — re-exported from the feature store so
 * consumers depend on `@features/transactions/hooks/useTransactions` rather than the store impl.
 */
export { useTransactions } from '@features/transactions/store/transactions.store';
