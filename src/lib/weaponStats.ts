/**
 * weaponStats.ts
 *
 * Lookup layer for the Massive Breakdowns weapon-stat dataset.
 * Provides exact engine-calibrated bodyDamage, critDamage, and frame-based
 * timing values (shotDelay, burstDelay, chargeMs) per weapon archetype.
 *
 * All delay values are in 30fps engine frames.  Divide by 30 to get seconds.
 * chargeMs is in milliseconds.  Divide by 1000 to get seconds.
 */

import rawData from '../data/weaponStats.json';
import { EXOTIC_PVE, COMPENDIUM_ROWS, EXOTIC_ROW_ALIASES } from '../data/compendium';
import { sheetSubType } from './subtypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeaponStatEntry {
  /** Spreadsheet primary key e.g. "Hand Cannon_p_Adaptive" */
  lookup: string;
  /** Spreadsheet type string e.g. "Hand Cannon" */
  type: string;
  /** Ammo slot: "p" | "s" | "h" */
  ammo: string;
  /** Spreadsheet frame name e.g. "Adaptive" */
  frame: string;
  /** Base body damage per individual projectile — one pellet / bolt / bullet (PvP-calibrated) */
  bodyDamage: number;
  /** Base crit damage per individual projectile (PvP-calibrated) */
  critDamage: number;
  /**
   * Delay between consecutive shots / between bullets within a burst,
   * measured in 30fps engine frames.  Null for weapons with no shot timing
   * (e.g. bows that only have chargeMs).
   */
  shotDelay: number | null;
  /**
   * Delay applied per complete burst interval in the burst-weapon TTK formula,
   * in 30fps engine frames.
   */
  burstDelay: number | null;
  /** Charge / draw time in milliseconds (Fusions, LFRs, Bows). */
  chargeMs: number | null;
  /**
   * Bullets fired per trigger pull (Pulse Rifle bursts, burst Sidearms, Trinity Ghoul's
   * three arrows, Euphony's three rounds).  Null for single-fire weapons.
   */
  shotsPerBurst: number | null;
  /**
   * Projectiles in each bullet: shotgun pellets, fusion bolts, spread-shot pellets.
   * Damage per trigger pull is bodyDamage * pellets (* shotsPerBurst for multi-bullet pulls).
   * Null for single-projectile weapons.
   */
  pellets: number | null;
  /** Reference RPM used for sorting / display (not used in TTK math). */
  rpm: number | null;
  /**
   * Set when this exotic has no row of its own and the numbers are those of the frame it is built on
   * (see EXOTIC_FRAME_FALLBACK). Absent for exact rows.
   */
  approxFrom?: string | null;
  /**
   * PvE damage relative to a legendary of this type, on top of the type's PvE scalar (the weapon's own PvE bonus,
   * from the Destiny Data Compendium). Absent = 1.
   */
  pveFactor?: number | null;
  /** Extra PvE multiplier at particular enemy tiers (see pveMultiplier). */
  pveTierMult?: Partial<Record<string, number>>;
  /** 'compendium' when the damage comes from the Data Compendium itself, not the stat sheet. */
  source?: 'compendium' | null;
}

// ── Subtype → spreadsheet type string ────────────────────────────────────────
//  Keys are the *spreadsheet's* subtype numbers (see ./subtypes.ts for the three that differ
//  from Bungie's DestinyItemSubType); lookupWeaponStat converts before indexing.

const SUBTYPE_TO_TYPE: Record<number, string> = {
    6: 'Auto',
    7: 'Shotgun',
    8: 'Machine Gun',
    9: 'Hand Cannon',
   10: 'Rocket Launcher',
   11: 'Fusion',
   12: 'Sniper',
   13: 'Pulse',
   14: 'Scout',
   17: 'Sidearm',
   22: 'Linear Fusion',
   24: 'SMG',
   25: 'Grenade Launcher',
   29: 'Trace',
   31: 'Bow',
   33: 'Glaive',
   34: 'Sword',
   35: 'Heavy Grenade Launcher',
   36: 'Breech Grenade Launcher',
   37: 'Rocket Sidearm',
};

/** ammoType (1/2/3) → spreadsheet ammo slot (p/s/h) */
const AMMO_TO_SLOT: Record<number, string> = { 1: 'p', 2: 's', 3: 'h' };

// ── Frame-name normalisation ──────────────────────────────────────────────────
//
// Bungie intrinsic perk names: "Adaptive Frame", "Rapid-Fire Frame", etc.
// Spreadsheet frame column: "Adaptive", "Rapid Fire", etc.

function normalizeFrameName(bungieName: string): string {
  return bungieName
    .replace(/ Frame$/, '')           // "Adaptive Frame" → "Adaptive"
    .replace(/^Rapid-Fire$/, 'Rapid Fire'); // hyphen → space
}

// ── Lookup index ──────────────────────────────────────────────────────────────

const entryIndex = new Map<string, WeaponStatEntry>(
  (rawData as WeaponStatEntry[]).map(e => [`${e.type}_${e.ammo}_${e.frame}`, e]),
);

/**
 * Exotics have their own row, named after the weapon ("Sweet Business"), but their intrinsic trait is
 * something else ("Payday"). Match by weapon name, ignoring case, punctuation and a leading "The",
 * since the sheet and Bungie disagree on those ("The Huckleberry" / "Huckleberry").
 */
// Sheet spelling quirks, by loose name: Bungie's "Tessellation" is the sheet's "Tesselation", "Ager's Scepter" is "Ager's Sceptre".
const LOOSE_ALIASES: Record<string, string> = { tessellation: 'tesselation', agersscepter: 'agerssceptre' };
const looseName = (s: string) => {
  const k = s.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]/g, '');
  return LOOSE_ALIASES[k] ?? k;
};
const nameIndex = new Map<string, WeaponStatEntry>(
  (rawData as WeaponStatEntry[]).map(e => [`${e.type}_${e.ammo}_${looseName(e.frame)}`, e]),
);

/**
 * Exotics the sheet has no row for, but whose damage and timing are those of a standard frame: Hawkmoon is an
 * Adaptive hand cannon, Centrifuse a Precision auto rifle. Keyed by loose weapon name. Every entry was checked
 * against Bungie's own rpm for legendary weapons of that frame (the exotic's rate of fire must be theirs), and
 * weaponStats.test.ts keeps checking it, so a patch that changes a weapon's rate of fire drops the guess instead
 * of showing a wrong number. Anything not listed shows no timing data rather than a guess: rockets, swords and
 * heavy grenade launchers have no usable sheet rows (blank damage), glaives and bows time themselves differently
 * from their frame, and Ruinous Effigy / Divinity are scaled against legendary traces.
 */
export const EXOTIC_FRAME_FALLBACK: Record<string, string> = {
  'Barrow-Dyad': 'Aggressive',
  'Centrifuse': 'Precision',
  'Cloudstrike': 'Rapid Fire',
  'Coldheart': 'Adaptive',
  'Collective Obligation': 'Adaptive',
  'Cryosthesia 77K': 'Precision',
  'Deterministic Chaos': 'High-Impact',
  "Finality's Auger": 'Precision',
  'Heir Apparent': 'Rapid Fire',
  'Hawkmoon': 'Adaptive',
  'Khvostov 7G-0X': 'Adaptive',
  'Lumina': 'Adaptive',
  'Malfeasance': 'Precision',
  'MIDA Multi-Tool': 'Lightweight',
  'No Time to Explain': 'High-Impact',
  'Outbreak Perfected': 'Lightweight',
  'Prometheus Lens': 'Adaptive',
  'Ruinous Effigy': 'Adaptive',
  'Polaris Lance': 'High-Impact',
  'Quicksilver Storm': 'Rapid Fire',
  'SUROS Regime': 'Adaptive',
  'Symmetry': 'Rapid Fire',
  'Tessellation': 'Adaptive',
  'The Jade Rabbit': 'High-Impact',
  'Thunderlord': 'Adaptive',
  "Ticuu's Divination": 'Lightweight',
  "Traveler's Chosen": 'Adaptive',
  'Wicked Implement': 'Rapid Fire',
};
const fallbackByName = new Map(Object.entries(EXOTIC_FRAME_FALLBACK).map(([n, f]) => [looseName(n), f]));
const pveBonusByName = new Map(Object.entries(EXOTIC_PVE).map(([n, b]) => [looseName(n), b]));
const compendiumRowByName = new Map(Object.entries(COMPENDIUM_ROWS).map(([n, r]) => [looseName(n), { name: n, row: r }]));
const aliasByName = new Map(Object.entries(EXOTIC_ROW_ALIASES).map(([n, lookup]) => [looseName(n), lookup]));
const entryByLookup = new Map((rawData as WeaponStatEntry[]).map((e) => [e.lookup, e]));

/** An entry with the weapon's own PvE bonus attached (the same object when it has none). Cached per weapon. */
const bonusCache = new Map<string, WeaponStatEntry>();
function withPveBonus(entry: WeaponStatEntry, weaponName: string | null | undefined): WeaponStatEntry {
  const bonus = weaponName ? pveBonusByName.get(looseName(weaponName)) : undefined;
  if (!bonus) return entry;
  const key = entry.lookup + '|' + entry.approxFrom + '|' + weaponName;
  let out = bonusCache.get(key);
  if (!out) { out = { ...entry, pveFactor: bonus.factor, ...(bonus.tierMult ? { pveTierMult: bonus.tierMult } : {}) }; bonusCache.set(key, out); }
  return out;
}

/**
 * The multiplier an entry adds to the PvE damage scalar at an enemy tier: the weapon's own PvE bonus and any tier
 * penalty. 1 for weapons with neither, so legendary maths are unchanged.
 */
export function pveMultiplier(entry: WeaponStatEntry | null | undefined, tier: string): number {
  return (entry?.pveFactor ?? 1) * (entry?.pveTierMult?.[tier] ?? 1);
}

function compendiumEntry(name: string, row: (typeof COMPENDIUM_ROWS)[string]): WeaponStatEntry {
  return {
    lookup: row.type + '_' + row.ammo + '_' + name,
    type: row.type, ammo: row.ammo, frame: name,
    bodyDamage: row.bodyDamage, critDamage: row.critDamage,
    shotDelay: row.shotDelay, burstDelay: null, chargeMs: null, shotsPerBurst: null, pellets: row.pellets, rpm: row.rpm,
    pveFactor: row.pveFactor, ...(row.pveTierMult ? { pveTierMult: row.pveTierMult } : {}), source: 'compendium',
  };
}
const compendiumEntries = new Map([...compendiumRowByName].map(([k, { name, row }]) => [k, compendiumEntry(name, row)]));

/**
 * Look up the Massive Breakdowns stat entry for a weapon archetype.
 *
 * @param itemSubType  Bungie itemSubType number (6 = Auto Rifle, 9 = HC, …)
 * @param ammoType     Bungie ammoType (1 = Primary, 2 = Special, 3 = Heavy)
 * @param intrinsicName  The intrinsicTrait perk name, e.g. "Adaptive Frame"
 * @param weaponName     The weapon's name; an exotic's own row (matched by name) wins over its frame
 */
export function lookupWeaponStat(
  itemSubType: number,
  ammoType: number,
  intrinsicName: string | null,
  weaponName?: string | null,
): WeaponStatEntry | null {
  if (!intrinsicName && !weaponName) return null;

  const typeStr  = SUBTYPE_TO_TYPE[sheetSubType(itemSubType)];
  const ammoSlot = AMMO_TO_SLOT[ammoType];
  if (!typeStr || !ammoSlot) {
    if (process.env.NODE_ENV === 'development' && typeStr === undefined) {
      console.warn(`lookupWeaponStat: unknown itemSubType ${itemSubType} — no timing data`);
    }
    return null;
  }

  const own = weaponName ? compendiumEntries.get(looseName(weaponName)) : undefined;
  if (own && own.type === typeStr && own.ammo === ammoSlot) return own;

  const byName = weaponName ? nameIndex.get(`${typeStr}_${ammoSlot}_${looseName(weaponName)}`) : undefined;
  if (byName) return withPveBonus(byName, weaponName);

  const aliased = weaponName ? aliasByName.get(looseName(weaponName)) : undefined;
  if (aliased && entryByLookup.has(aliased)) return withPveBonus(entryByLookup.get(aliased)!, weaponName);

  const exact = intrinsicName ? entryIndex.get(`${typeStr}_${ammoSlot}_${normalizeFrameName(intrinsicName)}`) : undefined;
  if (exact) return exact;

  // No row of its own: an exotic built on a standard frame borrows that frame's numbers, marked as approximate.
  const fallbackFrame = weaponName ? fallbackByName.get(looseName(weaponName)) : undefined;
  const borrowed = fallbackFrame ? entryIndex.get(`${typeStr}_${ammoSlot}_${fallbackFrame}`) : undefined;
  return borrowed ? withPveBonus({ ...borrowed, approxFrom: fallbackFrame }, weaponName) : null;
}

/** The frame an exotic's timing was borrowed from, or null when its numbers are exact (or missing). */
export function statBasis(
  itemSubType: number,
  ammoType: number,
  intrinsicName: string | null,
  weaponName?: string | null,
): string | null {
  return lookupWeaponStat(itemSubType, ammoType, intrinsicName, weaponName)?.approxFrom ?? null;
}

// ── Weapon category helpers ───────────────────────────────────────────────────

/** Weapon requires a charge/draw before firing (Fusions, LFRs, Bows). */
export function isChargeWeapon(entry: WeaponStatEntry): boolean {
  return entry.chargeMs !== null;
}

/**
 * Weapon fires multiple projectiles per trigger pull with intra-burst timing
 * but does NOT use a charge phase (Pulse Rifles, burst Sidearms/SMGs).
 *
 * Note: requires burstDelay !== null to distinguish burst weapons from
 * pellet shotguns, which also have shotsPerBurst (pellet count) but fire
 * all pellets simultaneously with no intra-shot timing.
 */
export function isBurstWeapon(entry: WeaponStatEntry): boolean {
  return entry.shotsPerBurst !== null && entry.chargeMs === null && entry.burstDelay !== null;
}
