import { parseCSV } from './parseCSV';
import type { WeaponStatEntry } from './weaponStats';

/**
 * huwugo's "Destiny WeaponStat Chart" (v2.1) -> weaponStats.json.
 * https://docs.google.com/spreadsheets/d/1FWMC-Vd_bGEoRkkrn3drWIORCFYyWQVMNlMasa4OE6I
 *
 * Columns used: type, frame, body, head, RPM, ammo, lookup, fr1 (inter-burst delay, 30fps frames),
 * fr2 (intra-burst delay), charge (ms), burst1 (bullets per burst).
 */

export const WEAPON_STAT_SHEET_ID = '1FWMC-Vd_bGEoRkkrn3drWIORCFYyWQVMNlMasa4OE6I';
export const WEAPON_STAT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${WEAPON_STAT_SHEET_ID}`;
/** The "WeaponStat Chart" tab (gid); the plain CSV export keeps the header row intact, unlike gviz. */
export const WEAPON_STAT_TAB_GID = '1692216024';

const AMMO_SLOT: Record<string, string> = { Primary: 'p', Special: 's', Heavy: 'h' };

/** Frame names the sheet abbreviates in combined rows; our weapon data uses the full intrinsic name. */
const FRAME_ALIASES: Record<string, string> = { 'PR-55': 'Legacy PR-55 Frame' };

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const n = Number(s.replace(/,/g, '').trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

export interface ParsedSheet {
  entries: WeaponStatEntry[];
  /** Rows skipped because the sheet had no usable numbers (#N/A, blank, zero damage). */
  skipped: string[];
  /** The sheet's own banner, e.g. "CURRENTLY UPDATING SORRY! ..." (empty when none). */
  banner: string;
  /** The version string from the header, e.g. "D2 MoT: 9.7.0.3". */
  version: string;
}

/** Parse the WeaponStat Chart tab. */
export function parseWeaponStatSheet(csv: string): ParsedSheet {
  const rows = parseCSV(csv);
  const hdr = rows.findIndex((r) => r[0]?.trim() === 'type' && r[1]?.trim() === 'frame');
  if (hdr < 0) throw new Error('WeaponStat Chart header row (type, frame, ...) not found');
  const col = (name: string) => rows[hdr].findIndex((h) => h.trim() === name);
  const iType = col('type'), iFrame = col('frame'), iBody = col('body'), iHead = col('head'), iRpm = col('RPM');
  const iAmmo = col('ammo'), iLookup = col('lookup'), iFr1 = col('fr1'), iFr2 = col('fr2');
  const iCharge = col('charge'), iBurst = col('burst1');
  if ([iType, iFrame, iBody, iHead, iAmmo, iLookup, iFr1, iFr2, iCharge, iBurst].some((i) => i < 0)) {
    throw new Error('WeaponStat Chart is missing an expected column');
  }

  const banner = (rows[0]?.[0] ?? '').replace(/\s+/g, ' ').trim();
  const version = rows.slice(0, hdr).flat().find((c) => /^D2 MoT:/i.test(c.trim()))?.trim() ?? '';

  const entries: WeaponStatEntry[] = [];
  const skipped: string[] = [];

  for (const r of rows.slice(hdr + 1)) {
    const lookup = r[iLookup]?.trim();
    if (!lookup) continue;
    const body = num(r[iBody]);
    const head = num(r[iHead]);
    const slot = AMMO_SLOT[r[iAmmo]?.trim()];
    const fr1 = num(r[iFr1]) ?? 0;
    const fr2 = num(r[iFr2]) ?? 0;
    const charge = num(r[iCharge]) ?? 0;
    // No damage, or no timing at all (e.g. the melee row), means there's nothing to calculate with.
    if (body === null || head === null || body <= 0 || head <= 0 || !slot || (fr1 <= 0 && charge <= 0)) {
      skipped.push(lookup);
      continue;
    }

    const burst = num(r[iBurst]) ?? 1;
    const make = (key: string): WeaponStatEntry => {
      const [type, ammo, ...frame] = key.split('_');
      return {
        lookup: key,
        type,
        ammo,
        frame: frame.join('_'),
        bodyDamage: body,
        critDamage: head,
        shotDelay: fr1 > 0 ? fr1 : null,
        burstDelay: fr2 > 0 ? fr2 : null,
        chargeMs: charge > 0 ? charge : null,
        shotsPerBurst: burst > 1 ? burst : null,
        rpm: iRpm >= 0 ? num(r[iRpm]) : null,
      };
    };

    // The sheet's own lookup key is authoritative (it renames frames, e.g. "Vex Mythoclast" ->
    // "Timeless Mythoclast"). A combined frame such as "Adaptive / Lightweight" covers every frame
    // named in it, so give each its own entry.
    entries.push(make(lookup));
    const type = lookup.split('_')[0];
    for (const alias of r[iFrame].split(' / ').map((f) => f.trim()).filter(Boolean)) {
      const key = `${type}_${slot}_${FRAME_ALIASES[alias] ?? alias}`;
      if (key !== lookup && !entries.some((e) => e.lookup === key)) entries.push(make(key));
    }
  }
  return { entries, skipped, banner, version };
}

export interface MergeResult {
  entries: WeaponStatEntry[];
  updated: number;
  added: number;
  /** Frames the new sheet no longer lists; kept as they were. */
  kept: number;
}

/**
 * Merge a parsed sheet into the existing data.
 *  - Frames in the sheet take its damage and timing.
 *  - Pellet counts are not in the sheet in a usable form (the sheet's pellet columns are a flat 12 and
 *    its TTK is flagged broken for pellet weapons), so a frame we already track keeps its curated
 *    shotsPerBurst unless the sheet reports a real burst (> 1 bullet per trigger pull).
 *  - Frames the sheet dropped are kept: losing their TTK data would be worse than slightly old numbers.
 */
export function mergeWeaponStats(existing: WeaponStatEntry[], sheet: WeaponStatEntry[]): MergeResult {
  const byLookup = new Map(existing.map((e) => [e.lookup, e]));
  const seen = new Set<string>();
  let updated = 0, added = 0;

  const merged = sheet.map((n): WeaponStatEntry => {
    seen.add(n.lookup);
    const old = byLookup.get(n.lookup);
    if (!old) { added++; return n; }
    updated++;
    return {
      ...n,
      shotsPerBurst: n.shotsPerBurst ?? old.shotsPerBurst,
      rpm: n.rpm ?? old.rpm,
    };
  });

  const kept = existing.filter((e) => !seen.has(e.lookup));
  return { entries: [...merged, ...kept], updated, added, kept: kept.length };
}

/** Sheet banners like "CURRENTLY UPDATING SORRY!" mean the numbers are mid-edit. */
export function sheetIsMidUpdate(banner: string): boolean {
  return /currently updating|inaccurate/i.test(banner);
}
