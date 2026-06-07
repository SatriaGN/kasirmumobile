/**
 * Public hook for the members feature — re-exported from the feature store so
 * consumers depend on `@features/members/hooks/useMembers` rather than the store impl.
 */
export { useMembers } from '@features/members/store/members.store';
