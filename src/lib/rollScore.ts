import type { Weapon, PerkColumn } from '../types/weapon';
import type { GodRollEntry } from './godRolls';

/**
 * How a roll compares with the meta: Aegis's recommendations in PvE, Pride Eternal's (plus the
 * CrucibleGuidebook wishlist) in PvP. Both order their perks by usefulness, so a perk's position in the
 * list matters: the top pick is worth the most, a listed perk less, an unlisted one nothing.
 */

export type ColumnKey = 'barrel' | 'mag' | 'perk1' | 'perk2' | 'origin' | 'mw';

export const COLUMN_LABEL: Record<ColumnKey, string> = {
  barrel: 'Barrel', mag: 'Magazine', perk1: 'Perk 1', perk2: 'Perk 2', origin: 'Origin', mw: 'Masterwork',
};

/** Trait columns decide a roll; barrel and magazine are smaller; masterwork and origin are last. */
const WEIGHT: Record<ColumnKey, number> = { perk1: 0.3, perk2: 0.3, barrel: 0.12, mag: 0.12, origin: 0.08, mw: 0.08 };

/** Score for a perk sitting at this position in the recommended list. */
const POSITION_SCORE = [1, 0.85, 0.7];
const LISTED_LOWER = 0.55;

export type Verdict = 'best' | 'listed' | 'off' | 'unset';

export interface ColumnScore {
  key: ColumnKey;
  label: string;
  picked: string | null;
  recommended: string[];
  /** 0 = the top recommendation; null when the pick is not recommended. */
  position: number | null;
  verdict: Verdict;
  /** 0 to 1. */
  score: number;
  weight: number;
  /** A better recommendation that is available on this weapon, when the pick isn't already the best one. */
  suggestion: string | null;
}

export type Grade = 'God roll' | 'Great' | 'Good' | 'Mixed' | 'Weak';

export interface RollScore {
  /** 0 to 100. */
  score: number;
  grade: Grade;
  columns: ColumnScore[];
}

/** What the roll has in each column. undefined = the weapon has no such column; null = nothing picked. */
export interface RollPicks {
  barrel?: string | null;
  mag?: string | null;
  perk1?: string | null;
  perk2?: string | null;
  origin?: string | null;
  mw?: string | null;
}

/** The perks the weapon can roll in each column, for suggestions. */
export type RollOptions = Partial<Record<ColumnKey, string[]>>;

export type MetaRoll = Pick<GodRollEntry, 'barrel' | 'mag' | 'perk1' | 'perk2' | 'originTrait' | 'mw'>;

const strip = (s: string) => s.toLowerCase().replace(/^enhanced\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Range, Stability or Handling" / "Stability\nRange" -> ["Range", "Stability", "Handling"]. */
function splitList(s: string | null | undefined): string[] {
  return (s ?? '').split(/\r?\n|,|\bor\b|\band\b|\//i).map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== 'none');
}

function recommendedFor(meta: MetaRoll, key: ColumnKey): string[] {
  switch (key) {
    case 'barrel': return meta.barrel ?? [];
    case 'mag': return meta.mag ?? [];
    case 'perk1': return meta.perk1 ?? [];
    case 'perk2': return meta.perk2 ?? [];
    case 'origin': return splitList(meta.originTrait);
    case 'mw': return splitList(meta.mw);
  }
}

export function gradeFor(score: number): Grade {
  if (score >= 92) return 'God roll';
  if (score >= 78) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Mixed';
  return 'Weak';
}

/**
 * Score a roll against a meta recommendation. Columns the weapon lacks, or that the meta has no
 * recommendation for, are left out and the rest re-weighted. Returns null when nothing can be scored
 * (e.g. an exotic the meta only rates by tier).
 */
export function scoreRoll(picks: RollPicks, meta: MetaRoll, options: RollOptions = {}): RollScore | null {
  const columns: ColumnScore[] = [];
  for (const key of Object.keys(WEIGHT) as ColumnKey[]) {
    const picked = picks[key];
    if (picked === undefined) continue; // the weapon has no such column
    const recommended = recommendedFor(meta, key);
    if (!recommended.length) continue;

    const pos = picked ? recommended.findIndex((r) => strip(r) === strip(picked)) : -1;
    const score = pos < 0 ? 0 : POSITION_SCORE[pos] ?? LISTED_LOWER;
    const available = new Set((options[key] ?? []).map(strip));
    const better = recommended.find((r, i) => (pos < 0 || i < pos) && (available.size === 0 || available.has(strip(r))));
    columns.push({
      key, label: COLUMN_LABEL[key], picked: picked ?? null, recommended,
      position: pos < 0 ? null : pos,
      verdict: !picked ? 'unset' : pos === 0 ? 'best' : pos > 0 ? 'listed' : 'off',
      score, weight: WEIGHT[key],
      suggestion: pos === 0 ? null : better ?? null,
    });
  }
  if (!columns.length) return null;
  const totalWeight = columns.reduce((a, c) => a + c.weight, 0);
  const score = Math.round((columns.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight) * 100);
  return { score, grade: gradeFor(score), columns };
}

// ── From the editor's state to picks ─────────────────────────────────────────

function pickedName(col: PerkColumn | undefined, selected: Record<string, string>): string | null | undefined {
  if (!col) return undefined;
  const hash = selected[col.name];
  if (!hash) return null;
  const perk = col.perks.find((p) => p.hash === hash || p.enhancedVersion?.hash === hash);
  return perk ? perk.name : null;
}

const optionNames = (col: PerkColumn | undefined) => (col ? col.perks.map((p) => p.name) : []);

/** The roll's picks and the weapon's options per column, from a { column name -> perk hash } selection. */
export function picksFromSelection(
  weapon: Weapon,
  selected: Record<string, string>,
  masterwork?: string | null,
): { picks: RollPicks; options: RollOptions } {
  const cols = weapon.perkSockets;
  const barrel = cols.find((c) => c.columnType === 'barrel');
  const mag = cols.find((c) => c.columnType === 'mag');
  const origin = cols.find((c) => c.columnType === 'origin');
  const [p1, p2] = cols.filter((c) => c.columnType === 'perk');
  const mwOptions = weapon.masterworkOptions ?? [];
  return {
    picks: {
      barrel: pickedName(barrel, selected),
      mag: pickedName(mag, selected),
      perk1: pickedName(p1, selected),
      perk2: pickedName(p2, selected),
      origin: pickedName(origin, selected),
      mw: mwOptions.length ? masterwork ?? null : undefined,
    },
    options: {
      barrel: optionNames(barrel), mag: optionNames(mag), perk1: optionNames(p1), perk2: optionNames(p2),
      origin: optionNames(origin), mw: mwOptions,
    },
  };
}

/** A saved roll is a flat list of perk hashes: assign each to the column it belongs to. */
export function selectionFromHashes(weapon: Weapon, hashes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of weapon.perkSockets) {
    const hit = hashes.find((h) => col.perks.some((p) => p.hash === h || p.enhancedVersion?.hash === h));
    if (hit) out[col.name] = hit;
  }
  return out;
}
