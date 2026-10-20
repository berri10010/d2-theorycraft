import { parseCSV } from './parseCSV';
import type { WeaponStatEntry } from './weaponStats';

/**
 * huwugo's "Destiny WeaponStat Chart" (v2.1) -> weaponStats.json.
 * https://docs.google.com/spreadsheets/d/1FWMC-Vd_bGEoRkkrn3drWIORCFYyWQVMNlMasa4OE6I
 *
 * Two tabs are used:
 *  - "WeaponData": the raw per-frame table (damage per projectile, shot / burst delay in 30fps
 *    frames, charge ms, bullets per trigger pull, projectiles per bullet). This is the source of
 *    every number.
 *  - "WeaponStat Chart": only read for its header banner/version and for frame naming — it merges
 *    frames ("Adaptive / Lightweight") and renames some, so those names get entries too.
 */

export const WEAPON_STAT_SHEET_ID = '1FWMC-Vd_bGEoRkkrn3drWIORCFYyWQVMNlMasa4OE6I';
export const WEAPON_STAT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${WEAPON_STAT_SHEET_ID}`;
/** Tab ids; the plain CSV export keeps header rows intact, unlike gviz. */
export const WEAPON_STAT_CHART_GID = '1692216024';
export const WEAPON_DATA_GID = '1678079223';

const AMMO_SLOT: Record<string, string> = { Primary: 'p', Special: 's', Heavy: 'h' };

/** Frame names the chart abbreviates in combined rows; our weapon data uses the full intrinsic name. */
const FRAME_ALIASES: Record<string, string> = { 'PR-55': 'Legacy PR-55 Frame' };

const norm = (h: string) => h.replace(/\s+/g, ' ').trim().toLowerCase();

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const n = Number(s.replace(/,/g, '').trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

export interface ParsedSheet {
  entries: WeaponStatEntry[];
  /** Rows skipped because the sheet had no usable numbers (blank, #N/A, zero damage, no timing). */
  skipped: string[];
  /** The chart's banner, e.g. "CURRENTLY UPDATING SORRY! ..." (empty when none). */
  banner: string;
  /** The version string from the chart header, e.g. "D2 MoT: 9.7.0.3". */
  version: string;
}

function findHeader(rows: string[][], first: string, second?: string): number {
  return rows.findIndex((r) => norm(r[0] ?? '') === first && (second === undefined || norm(r[1] ?? '') === second));
}

/** Parse the WeaponData tab into one entry per lookup key (the first row wins when a key repeats). */
function parseWeaponData(csv: string, skipped: string[]): Map<string, WeaponStatEntry> {
  const rows = parseCSV(csv);
  const hdr = findHeader(rows, 'lookup');
  if (hdr < 0) throw new Error('WeaponData header row (lookup, ...) not found');
  const col = (name: string) => rows[hdr].findIndex((h) => norm(h) === name);
  const idx = {
    lookup: col('lookup'), type: col('type'), ammo: col('ammo'), frame: col('frame'),
    body: col('body damage'), crit: col('crit damage'), shot: col('shot delay'), burst: col('burst delay'),
    charge: col('charge ms'), perBurst: col('shots per burst'), perSub: col('shots per sub'), rpm: col('ref rpm'),
  };
  if (Object.values(idx).some((i) => i < 0)) throw new Error('WeaponData is missing an expected column');

  const out = new Map<string, WeaponStatEntry>();
  for (const r of rows.slice(hdr + 1)) {
    const lookup = r[idx.lookup]?.trim();
    if (!lookup || lookup === '.') continue;
    if (out.has(lookup)) continue;

    const body = num(r[idx.body]);
    const crit = num(r[idx.crit]);
    const shot = num(r[idx.shot]) ?? 0;
    const charge = num(r[idx.charge]) ?? 0;
    // No damage, or no timing at all (e.g. the melee row), means there's nothing to calculate with.
    if (body === null || crit === null || body <= 0 || crit <= 0 || (shot <= 0 && charge <= 0)) {
      skipped.push(lookup);
      continue;
    }
    const burstDelay = num(r[idx.burst]) ?? 0;
    const perBurst = num(r[idx.perBurst]) ?? 1;
    const perSub = num(r[idx.perSub]) ?? 1;

    out.set(lookup, {
      lookup,
      type: r[idx.type].trim(),
      ammo: r[idx.ammo].trim(),
      frame: r[idx.frame].trim(),
      bodyDamage: body,
      critDamage: crit,
      shotDelay: shot > 0 ? shot : null,
      burstDelay: burstDelay > 0 ? burstDelay : null,
      chargeMs: charge > 0 ? charge : null,
      shotsPerBurst: perBurst > 1 ? perBurst : null,
      pellets: perSub > 1 ? perSub : null,
      rpm: num(r[idx.rpm]),
    });
  }
  return out;
}

/** Parse the WeaponData tab plus the chart tab's naming and banner. */
export function parseWeaponStatSheet(chartCsv: string, dataCsv: string): ParsedSheet {
  const skipped: string[] = [];
  const data = parseWeaponData(dataCsv, skipped);
  const entries = [...data.values()];

  const rows = parseCSV(chartCsv);
  const hdr = findHeader(rows, 'type', 'frame');
  if (hdr < 0) throw new Error('WeaponStat Chart header row (type, frame, ...) not found');
  const col = (name: string) => rows[hdr].findIndex((h) => norm(h) === name);
  const iFrame = col('frame'), iAmmo = col('ammo'), iLookup = col('lookup');
  if (iFrame < 0 || iAmmo < 0 || iLookup < 0) throw new Error('WeaponStat Chart is missing an expected column');

  const banner = (rows[0]?.[0] ?? '').replace(/\s+/g, ' ').trim();
  const version = rows.slice(0, hdr).flat().find((c) => /^D2 MoT:/i.test(c.trim()))?.trim() ?? '';

  // A chart row whose frame is "Adaptive / Lightweight" or renamed ("Vex Mythoclast" under the key
  // "Timeless Mythoclast") covers every frame named there: give each name the same numbers.
  const have = new Set(data.keys());
  for (const r of rows.slice(hdr + 1)) {
    const primary = data.get(r[iLookup]?.trim() ?? '');
    const slot = AMMO_SLOT[r[iAmmo]?.trim() ?? ''];
    if (!primary || !slot) continue;
    for (const alias of (r[iFrame] ?? '').split(' / ').map((f) => f.trim()).filter(Boolean)) {
      const frame = FRAME_ALIASES[alias] ?? alias;
      const key = `${primary.type}_${slot}_${frame}`;
      if (have.has(key)) continue;
      have.add(key);
      entries.push({ ...primary, lookup: key, frame });
    }
  }

  return { entries, skipped, banner, version };
}

export interface MergeResult {
  entries: WeaponStatEntry[];
  updated: number;
  added: number;
  /** Frames the sheet no longer lists; kept as they were. */
  kept: number;
}

/**
 * Merge a parsed sheet into the existing data. The sheet is authoritative for every frame it
 * lists; frames it dropped are kept (losing their TTK data would be worse than slightly old numbers).
 */
export function mergeWeaponStats(existing: WeaponStatEntry[], sheet: WeaponStatEntry[]): MergeResult {
  const old = new Set(existing.map((e) => e.lookup));
  const seen = new Set(sheet.map((e) => e.lookup));
  const kept = existing
    .filter((e) => !seen.has(e.lookup))
    .map((e) => ({ ...e, pellets: e.pellets ?? null }));
  return {
    entries: [...sheet, ...kept],
    updated: sheet.filter((e) => old.has(e.lookup)).length,
    added: sheet.filter((e) => !old.has(e.lookup)).length,
    kept: kept.length,
  };
}

/** Sheet banners like "CURRENTLY UPDATING SORRY!" mean the numbers are mid-edit. */
export function sheetIsMidUpdate(banner: string): boolean {
  return /currently updating|inaccurate/i.test(banner);
}
