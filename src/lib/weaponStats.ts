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
  /** Base body damage per individual projectile (PvP-calibrated) */
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
   * Number of projectiles fired per trigger pull (Pulse Rifles, burst Sidearms,
   * Fusion bolts, etc.).  Null for single-fire weapons.
   */
  shotsPerBurst: number | null;
  /** Reference RPM used for sorting / display (not used in TTK math). */
  rpm: number | null;
}

// ── Subtype → spreadsheet type string ────────────────────────────────────────
//  Values match Bungie's DestinyItemSubType enum.

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
   38: 'Machinegun',
   39: 'Submachinegun',
   40: 'Auto Rifle',
   41: 'Handcannon',
   42: 'Pulserifle',
   43: 'Scoutrifle',
   44: 'Sniperrifle',
   45: 'Shotgun',
   46: 'Fusionrifle',
   47: 'Linearfusionrifle',
   48: 'Sword',
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
 * Look up the Massive Breakdowns stat entry for a weapon archetype.
 *
 * @param itemSubType  Bungie itemSubType number (6 = Auto Rifle, 9 = HC, …)
 * @param ammoType     Bungie ammoType (1 = Primary, 2 = Special, 3 = Heavy)
 * @param intrinsicName  The intrinsicTrait perk name, e.g. "Adaptive Frame"
 */
export function lookupWeaponStat(
  itemSubType: number,
  ammoType: number,
  intrinsicName: string | null,
): WeaponStatEntry | null {
  if (!intrinsicName) return null;

  const typeStr  = SUBTYPE_TO_TYPE[itemSubType];
  const ammoSlot = AMMO_TO_SLOT[ammoType];
  if (!typeStr || !ammoSlot) return null;

  const frame = normalizeFrameName(intrinsicName);
  const key   = `${typeStr}_${ammoSlot}_${frame}`;

  return entryIndex.get(key) ?? null;
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
