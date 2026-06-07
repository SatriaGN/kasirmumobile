import type { ISODateString } from '@shared/types/common';

export type OutboxStatus = 'pending' | 'sending' | 'synced' | 'needs_review';
export type OutboxItemType = 'transaction';

export interface OutboxItem {
  id: string;
  type: OutboxItemType;
  status: OutboxStatus;
  label: string;
  message: string;
  createdAt: ISODateString;
}

export type SyncColor = 'green' | 'yellow' | 'amber' | 'red';

export interface SyncStatus {
  color: SyncColor;
  label: string;
  count: number;
}

export interface SyncContextValue {
  online: boolean;
  outbox: OutboxItem[];
  syncStatus: SyncStatus;
  toggleOnline: () => void;
  syncOutbox: () => void;
}
