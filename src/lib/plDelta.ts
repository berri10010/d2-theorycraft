/**
 * plDelta.ts
 *
 * Power-level delta → damage multiplier, sourced from MossyMax's
 * Outgoing Damage Scaling Spreadsheet (EoF Standard activity type).
 *
 * The raw curve is normalised so that delta 0 = 1.0 (your current
 * PvE baseline).  Negative deltas represent being under-levelled for
 * the activity; positive deltas represent being over-levelled.
 *
 * Example:
 *   delta  0  → 1.000  (at level — current baseline)
 *   delta -10 → 0.802  (−19.8% damage when 10 under)
 *   delta -20 → 0.617  (−38.3% damage when 20 under)
 *   delta +10 → 1.025  (+2.5% damage when 10 over)
 */

import plDeltaData from '../data/plDeltaCurve.json';

const MIN_DELTA  = plDeltaData.min;     // -50
const MAX_DELTA  = plDeltaData.max;     // +30
const AT_ZERO    = plDeltaData.atZero;  // 0.900219 (raw EoF Standard value at delta 0)
const VALUES     = plDeltaData.values;  // 81 entries: index 0 = delta −50, index 50 = delta 0

/**
 * Returns the damage multiplier relative to delta 0 (delta 0 → 1.0).
 * Values outside [-50, +30] are clamped to the nearest endpoint.
 */
export function getPlDeltaMultiplier(delta: number): number {
  const clamped = Math.max(MIN_DELTA, Math.min(MAX_DELTA, delta));
  const idx     = clamped - MIN_DELTA;
  const raw     = VALUES[idx] ?? AT_ZERO;
  return raw / AT_ZERO;
}

/** Human-readable label, e.g. "+5 · +2.6%"  or  "−20 · −38.3%". */
export function fmtPlDelta(delta: number): string {
  const mult = getPlDeltaMultiplier(delta);
  const pct  = (mult - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${delta >= 0 ? '+' : ''}${delta} · ${sign}${pct.toFixed(1)}%`;
}
