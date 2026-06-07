/**
 * Public hook for the catalog feature — re-exported from the feature store so
 * consumers depend on `@features/catalog/hooks/useCatalog` rather than the store impl.
 */
export { useCatalog } from '@features/catalog/store/catalog.store';
