import type { PvpWishlistEntry } from './pvpWishlist';

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

/**
 * Look up a god roll entry for a weapon using the family hierarchy:
 *   1. Exact weapon name (version-specific override)
 *   2. baseName (applies to the whole weapon family)
 * Returns null if neither exists.
 */
export function lookupGodRoll(
  db: GodRollDatabase,
  weapon: { name: string; baseName: string },
): GodRollEntry | null {
  return db[weapon.name] ?? db[weapon.baseName] ?? null;
}

// ──────────────────────────────────────────────────
// PvP view
// ──────────────────────────────────────────────────


const hasList = (a?: string[]) => !!a && a.length > 0;

/**
 * The PvP recommendation for a weapon, shaped like a PvE entry so the god-roll UI can render it
 * unchanged. Hand-curated PvP fields on a god-roll entry (the admin editor writes these) win;
 * otherwise the r/CrucibleGuidebook community wishlist is used. Returns null when neither exists.
 */
export function pvpGodRoll(
  pve: GodRollEntry | null,
  wishlist: PvpWishlistEntry | null,
): GodRollEntry | null {
  const curated = !!pve && (hasList(pve.pvpBarrel) || hasList(pve.pvpMag) || hasList(pve.pvpPerk1) || hasList(pve.pvpPerk2));

  if (!curated && !wishlist) return null;

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
