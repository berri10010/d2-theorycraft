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
// Column-name → god-roll field mapping
// ──────────────────────────────────────────────────

const BARREL_PATTERNS = ['barrel', 'sight', 'bowstring', 'blade', 'guard', 'battery'];
const MAG_PATTERNS = ['magazine', 'arrow', 'projectile'];

export type GodRollField = keyof Pick<GodRollEntry, 'barrel' | 'mag' | 'perk1' | 'perk2' | 'originTrait'>;

/**
 * Given a perk-socket column name (e.g. "Barrel", "Magazine", "Trait 1", "Origin Trait"),
 * returns which field in GodRollEntry holds the recommendation(s) for it,
 * or null if this column isn't tracked.
 *
 * Note: 'originTrait' maps to a string | null (single value), all others to string[].
 */
export function godRollFieldForColumn(columnName: string): GodRollField | null {
  const lower = columnName.toLowerCase();
  if (lower === 'origin trait') return 'originTrait';
  if (BARREL_PATTERNS.some((p) => lower.includes(p))) return 'barrel';
  if (MAG_PATTERNS.some((p) => lower.includes(p))) return 'mag';
  if (lower.startsWith('trait 1')) return 'perk1';
  if (lower.startsWith('trait 2')) return 'perk2';
  return null;
}
