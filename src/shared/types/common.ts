/**
 * Shared, domain-agnostic primitives used across modules.
 */

/** Integer Rupiah. Money is always stored as a whole number (00-foundation.md §6). */
export type Rupiah = number;

/** ISO-8601 date-time string, e.g. "2026-06-01T08:30:00.000Z". */
export type ISODateString = string;

/** ISO date (no time), e.g. "2026-06-01". */
export type ISODate = string;

/** Discriminated result for operations that can fail with a known error code. */
export type Result<T = void, E = string> =
  | ({ ok: true } & (T extends void ? Record<never, never> : { value: T }))
  | { ok: false; error: E };

/** Lightweight success/failure shape matching the existing context return values. */
export interface ActionResult<E = string> {
  ok: boolean;
  error?: E;
}

export type DiscountType = 'percentage' | 'fixed';
