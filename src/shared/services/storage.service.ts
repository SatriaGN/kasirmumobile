/**
 * Cross-cutting persistence service (stub).
 *
 * Wrap the device storage layer (e.g. AsyncStorage / expo-secure-store) here so
 * features depend on this small interface instead of a concrete library. The app
 * is currently in-memory only, so these are no-ops to be implemented later.
 */
export interface StorageService {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const storage: StorageService = {
  async getItem() {
    return null;
  },
  async setItem() {
    /* no-op until a backend/persistence layer is added */
  },
  async removeItem() {
    /* no-op until a backend/persistence layer is added */
  },
};
