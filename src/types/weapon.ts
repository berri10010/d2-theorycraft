export type StatMap = Record<string, number>;
export type GameMode = 'pvp' | 'pve';
export type DamageType = 'kinetic' | 'arc' | 'solar' | 'void' | 'stasis' | 'strand';

export interface StatCurveNode {
  stat: number;
  value: number;
}

export interface PerkMod {
  statName: string;
  value: number;
}

export interface Perk {
  hash: string;
  name: string;
  icon: string;
  description: string;
  statModifiers: PerkMod[];
  isEnhanced: boolean;
  /** If set, selecting this perk auto-activates the matching buff key */
  buffKey: string | null;
  /** PvE tier from community analysis: S/A/B/C/D/E/F/G, or null if unrated */
  tier: string | null;
  /**
   * If this is a base perk that has an enhanced counterpart in the same column,
   * this holds the enhanced perk so the UI can offer an "upgrade" button in Crafted mode.
   */
  enhancedVersion: Perk | null;
}

export interface PerkColumn {
  name: string;
  perks: Perk[];
}

export interface Weapon {
  hash: string;
  name: string;
  /** Base name with variant suffix stripped, e.g. "Igneous Hammer" for all variants */
  baseName: string;
  /** Variant label, e.g. "Adept", "Timelost", "Harrowed" — null for base version */
  variantLabel: string | null;
  /** True if this is an Adept/Timelost/Harrowed variant (better stats, Adept mods) */
  isAdept: boolean;
  /** True if this weapon has a craftable pattern in the game */
  hasCraftedPattern: boolean;
  icon: string;
  /**
   * Season watermark icon path from Bungie manifest (iconWatermark field).
   * Weapons from the same season share the same watermark path, enabling season grouping.
   */
  iconWatermark: string | null;
  /**
   * Short season name derived from DestinySeasonDefinition at parse time.
   * "Season of the Haunted" → "Haunted", "Season of Arrivals" → "Arrivals",
   * "Episode: Echoes" → "Echoes". Null for base-game weapons.
   */
  seasonName: string | null;
  /** Full-width weapon artwork image (from Bungie manifest screenshot field) */
  screenshot: string | null;
  /** Italicised lore/flavor text shown on the weapon card */
  flavorText: string | null;
  /** Rarity tier label, e.g. "Legendary" or "Exotic" */
  rarity: string | null;
  itemTypeDisplayName: string;
  itemSubType: number;
  damageType: DamageType;
  rpm: number;
  baseStats: StatMap;
  /** Intrinsic frame perk (e.g. "Adaptive Frame") — separate from roll perks */
  intrinsicTrait: Perk | null;
  perkSockets: PerkColumn[];
  /** Populated from archetypes.json at parse time */
  statCurves: Record<string, StatCurveNode[]>;
}

/** A named group of weapon variants sharing the same base name */
export interface WeaponGroup {
  baseName: string;
  /** Sorted best-first: Adept > Timelost > Harrowed > base */
  variants: Weapon[];
  /** The variant shown by default (first in sorted list) */
  default: Weapon;
}

export interface CompareSnapshot {
  id: string;
  label: string;
  weapon: Weapon;
  calculatedStats: StatMap;
  selectedPerks: Record<string, string>;
  ttk: number | null;
  mode: GameMode;
}
