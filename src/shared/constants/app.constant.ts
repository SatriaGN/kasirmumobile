/**
 * App-wide constants shared across features. Feature-specific constants belong
 * in their own feature folder; only put genuinely cross-cutting values here.
 */

/** Default "walk-in customer" member id used by the POS flow. */
export const DEFAULT_MEMBER_ID = 'm0';

/** Sentinel shift id carried by transactions belonging to the current shift. */
export const ACTIVE_SHIFT_ID = 'active';

/** Locale used for all currency/date formatting. */
export const LOCALE = 'id-ID';
