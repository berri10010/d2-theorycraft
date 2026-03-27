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
}

export interface PerkColumn {
  name: string;
  perks: Perk[];
}

export interface Weapon {
  hash: string;
  name: string;
  icon: string;
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

export interface CompareSnapshot {
  id: string;
  label: string;
  weapon: Weapon;
  calculatedStats: StatMap;
  selectedPerks: Record<string, string>;
  ttk: number | null;
  mode: GameMode;
}
