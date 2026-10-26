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
import difficultyData from '../data/difficultyCurves.json';

const MIN_DELTA  = plDeltaData.min;     // -50
const MAX_DELTA  = plDeltaData.max;     // +30
const AT_ZERO    = plDeltaData.atZero;  // 0.900219 (raw EoF Standard value at delta 0)
const VALUES     = plDeltaData.values;  // 81 entries: index 0 = delta −50, index 50 = delta 0

/**
 * Difficulty curves. 'standard' is the MossyMax curve above (delta 0 = 1.0, a small bonus when over-levelled).
 * 'raid' and 'master' come from oracle_engine: outgoing damage against Raid & Dungeon or Master content, where
 * Normal at level is 1.0, so even at delta 0 they cost damage (0.925 and 0.85) and being over-levelled gives nothing.
 */
export type Difficulty = 'standard' | 'raid' | 'master';

export const DIFFICULTY_OPTIONS: Array<{ key: Difficulty; label: string }> = [
  { key: 'standard', label: 'Standard' },
  { key: 'raid',     label: 'Raid & Dungeon' },
  { key: 'master',   label: 'Master' },
];

const TABLES = { raid: difficultyData.raid, master: difficultyData.master } as Record<'raid' | 'master', number[][]>;

function interpolate(table: number[][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}

/**
 * Returns the PvE damage multiplier for a power delta on a difficulty. For 'standard', delta 0 → 1.0 and values
 * outside [-50, +30] are clamped to the nearest endpoint. For 'raid' and 'master' it is the oracle_engine table.
 */
export function getPlDeltaMultiplier(delta: number, difficulty: Difficulty = 'standard'): number {
  if (difficulty !== 'standard') return interpolate(TABLES[difficulty], Math.min(delta, 0));
  const clamped = Math.max(MIN_DELTA, Math.min(MAX_DELTA, delta));
  const idx     = clamped - MIN_DELTA;
  const raw     = VALUES[idx] ?? AT_ZERO;
  return raw / AT_ZERO;
}

/** Human-readable label, e.g. "+5 · +2.6%"  or  "−20 · −38.3%". */
export function fmtPlDelta(delta: number, difficulty: Difficulty = 'standard'): string {
  const mult = getPlDeltaMultiplier(delta, difficulty);
  const pct  = (mult - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${delta >= 0 ? '+' : ''}${delta} · ${sign}${pct.toFixed(1)}%`;
}
