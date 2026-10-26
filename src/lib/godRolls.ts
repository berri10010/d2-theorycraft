import type { PvpWishlistEntry } from './pvpWishlist';

/** Pride Eternal's PvP spreadsheet (kept here so the UI can link it without loading the sheet parser). */
export const PRIDE_SHEET_ID = '1TVgtTRWNGEPi6OMlTLxXFSKUTi_ycwykhwuw8EW_jJ0';
export const PRIDE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${PRIDE_SHEET_ID}`;

export interface GodRollEntry {
  weaponType: string;
  season: string | null;
  energy: string | null;
  frame: string | null;
  /** Activity or source where the weapon drops */
  source: string | null;
  /** Recommended barrel / bowstring / blade perks */
  barrel: string[];
  /** Recommended magazine / battery / arrow perks */
  mag: string[];
  /** Recommended masterwork stat */
  mw: string | null;
  /** Recommended options for Trait 1 (first trait column) */
  perk1: string[];
  /** Recommended options for Trait 2 (second trait column) */
  perk2: string[];
  originTrait: string | null;
  /** Analyst notes about the weapon */
  notes: string | null;
  /** Rank within its weapon type category */
  rank: number | null;
  /** Overall tier for PvE: S / A / B / C / D */
  tier: string | null;

  // PvP god roll fields (optional — absent means no PvP entry curated)
  pvpBarrel?: string[];
  pvpMag?: string[];
  pvpPerk1?: string[];
  pvpPerk2?: string[];
  pvpOriginTrait?: string | null;
  pvpMw?: string | null;
  pvpNotes?: string | null;
  pvpTier?: string | null;
  pvpRank?: number | null;
}

export type GodRollDatabase = Record<string, GodRollEntry>;

const lowerCaseKeys = new WeakMap<GodRollDatabase, Map<string, string>>();

/** Lower-cased key -> real key, built once per database (the sheets spell names like "Redback-5SI" vs "Redback-5si"). */
function keysByLowerCase(db: GodRollDatabase): Map<string, string> {
  let index = lowerCaseKeys.get(db);
  if (!index) {
    index = new Map(Object.keys(db).map((key) => [key.toLowerCase(), key]));
    lowerCaseKeys.set(db, index);
  }
  return index;
}

/**
 * Look up a god roll entry for a weapon using the family hierarchy:
 *   1. Exact weapon name (version-specific override)
 *   2. baseName (applies to the whole weapon family)
 *   3. The same two names, ignoring capitalisation
 * Returns null if none exists.
 */
export function lookupGodRoll(
  db: GodRollDatabase,
  weapon: { name: string; baseName: string },
): GodRollEntry | null {
  const exact = db[weapon.name] ?? db[weapon.baseName];
  if (exact) return exact;
  const index = keysByLowerCase(db);
  const key = index.get(weapon.name.toLowerCase()) ?? index.get(weapon.baseName.toLowerCase());
  return key ? db[key] : null;
}

// ──────────────────────────────────────────────────
// PvP view
// ──────────────────────────────────────────────────


const hasList = (a?: string[]) => !!a && a.length > 0;

/**
 * The tier to show for a weapon. PvE tiers are Aegis's (the god-roll database); PvP tiers are Pride
 * Eternal's, unless a PvP tier was curated by hand on the Aegis entry.
 */
export function weaponTier(
  mode: 'pve' | 'pvp',
  pve: GodRollEntry | null,
  pride: GodRollEntry | null,
): string | null {
  return mode === 'pvp' ? (pve?.pvpTier ?? pride?.tier ?? null) : (pve?.tier ?? null);
}

/**
 * The PvP recommendation for a weapon, shaped like a PvE entry so the god-roll UI can render it
 * unchanged. In order of priority:
 *   1. hand-curated PvP fields on the Aegis entry (the admin editor writes these),
 *   2. Pride Eternal's PvP sheet (tier, notes, perks per column), with any column it leaves empty
 *      filled from the wishlist,
 *   3. the r/CrucibleGuidebook community wishlist.
 * Returns null when none exists.
 */
export function pvpGodRoll(
  pve: GodRollEntry | null,
  wishlist: PvpWishlistEntry | null,
  pride: GodRollEntry | null = null,
): GodRollEntry | null {
  const curated = !!pve && (hasList(pve.pvpBarrel) || hasList(pve.pvpMag) || hasList(pve.pvpPerk1) || hasList(pve.pvpPerk2));

  if (!curated && !wishlist && !pride) return null;

  if (!curated && pride) {
    const fill = (mine: string[], theirs?: string[]) => (hasList(mine) ? mine : theirs ?? mine);
    return {
      ...pride,
      season: pride.season ?? pve?.season ?? null,
      barrel: fill(pride.barrel, wishlist?.barrel),
      mag: fill(pride.mag, wishlist?.mag),
      perk1: fill(pride.perk1, wishlist?.perk1),
      perk2: fill(pride.perk2, wishlist?.perk2),
      originTrait: pride.originTrait ?? wishlist?.originTrait ?? null,
      mw: pride.mw ?? wishlist?.mw ?? null,
    };
  }

  const base: GodRollEntry = {
    weaponType: pve?.weaponType ?? 'Other',
    season: pve?.season ?? null,
    energy: pve?.energy ?? null,
    frame: pve?.frame ?? null,
    source: pve?.source ?? null,
    barrel: [], mag: [], mw: null, perk1: [], perk2: [], originTrait: null,
    notes: null, rank: null, tier: null,
  };

  if (curated && pve) {
    return {
      ...base,
      barrel: pve.pvpBarrel ?? [],
      mag: pve.pvpMag ?? [],
      perk1: pve.pvpPerk1 ?? [],
      perk2: pve.pvpPerk2 ?? [],
      originTrait: pve.pvpOriginTrait ?? null,
      mw: pve.pvpMw ?? null,
      notes: pve.pvpNotes ?? null,
      rank: pve.pvpRank ?? null,
      tier: pve.pvpTier ?? null,
    };
  }

  return {
    ...base,
    barrel: wishlist!.barrel,
    mag: wishlist!.mag,
    perk1: wishlist!.perk1,
    perk2: wishlist!.perk2,
    originTrait: wishlist!.originTrait,
    mw: wishlist!.mw,
    notes: wishlist!.notes,
  };
}
