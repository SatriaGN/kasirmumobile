/**
 * App-level configuration.
 *
 * Centralizes runtime flags and constants that aren't tied to a single feature.
 * Today the app runs entirely on in-memory mock data; when a backend lands,
 * surface things like the API base URL and feature flags here (sourced from
 * `expo-constants` / `process.env`).
 */
export const AppConfig = {
  /** The app reads from `@data/mockData` instead of a network API. */
  useMockData: true,
  appName: 'KasirMu',
  version: '1.0.0',
} as const;

export type AppConfigType = typeof AppConfig;
