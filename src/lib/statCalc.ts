import type { StatMap, StatCurveNode } from '../types/weapon';
import { interpolateStat } from './math';

/**
 * Weapon stat maths.
 *
 * Bungie stores every stat as a raw "investment" value (0–100). Most stats are shown 1:1,
 * but some (Magazine, Impact, RPM, Draw Time, …) are shown through a per-stat-group
 * interpolation curve — e.g. a sidearm's Magazine: raw 65 → 15 rounds, raw 85 → 17.
 * Every modifier (perks, mods, masterwork, armour, buffs) is expressed in raw units, so it
 * has to be added to the *raw* value and re-interpolated. Adding it to the displayed value
 * (what this used to do) gave e.g. 34 rounds for a sniper with Extended Mag.
 *
 * All contributions are summed first and clamped once at the end (the game does not clamp
 * after each individual modifier).
 */

/** Stats with no 0–100 cap that have no curve data to fall back on. */
export const UNCAPPED_STATS = new Set([
  'Draw Time', 'Charge Time', 'RPM', 'Magazine', 'Ammo Capacity',
  'Cooling Efficiency', 'Heat Generated', 'Vent Speed', 'Persistence',
]);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface StatCurveData {
  /** Raw investment per curved stat. */
  rawStats?: Record<string, number>;
  /** Raw → display interpolation per curved stat. */
  displayCurves?: Record<string, StatCurveNode[]>;
}

/**
 * Apply summed raw modifiers to a weapon's displayed base stats.
 *
 * @param base    Displayed base stats (may include stats pre-seeded to 0).
 * @param deltas  Total raw modifier per stat name (sum of every source).
 */
export function applyStatDeltas(base: StatMap, deltas: Record<string, number>, curveData: StatCurveData = {}): StatMap {
  const out: StatMap = {};

  for (const [stat, shown] of Object.entries(base)) {
    const delta = deltas[stat] ?? 0;
    const curve = curveData.displayCurves?.[stat];
    const raw0 = curveData.rawStats?.[stat];

    if (curve && raw0 !== undefined) {
      // Anchor on the manifest's displayed value and move by the curve's own change. This keeps
      // frame-specific rounding in the base (e.g. burst weapons snapping to multiples of 3).
      const before = interpolateStat(clamp(raw0, 0, 100), curve);
      const after = interpolateStat(clamp(raw0 + delta, 0, 100), curve);
      out[stat] = before === null || after === null
        ? shown
        : Math.max(0, Math.round(shown + (after - before)));
    } else if (UNCAPPED_STATS.has(stat)) {
      out[stat] = Math.max(0, shown + delta);
    } else {
      out[stat] = clamp(shown + delta, 0, 100);
    }
  }

  return out;
}

/**
 * The change in a stat's *displayed* value for a raw modifier — e.g. a bow's +10 raw Draw Time
 * masterwork is −33 ms. For plain stats this is just the delta.
 */
export function displayedDelta(
  stat: string,
  shownBase: number,
  rawDelta: number,
  curveData: StatCurveData = {},
): number {
  const out = applyStatDeltas({ [stat]: shownBase }, { [stat]: rawDelta }, curveData)[stat];
  return out - shownBase;
}
