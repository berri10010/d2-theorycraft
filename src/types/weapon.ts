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
  /**
   * True when the Bungie manifest marks this stat investment as conditionally
   * active (isConditionallyActive).  Examples: Eye of the Storm grants Handling
   * only when the player is at low health.  These mods are gated in
   * getCalculatedStats on the perk's activeEffects state being > 0.
   */
  isConditional?: boolean;
}

/**
 * Activation timing data sourced from the perkAudit.json (Clarity-powered).
 * Describes how and when a conditional perk activates.
 */
export interface PerkActivation {
  /** Plain-English description of what triggers the buff (e.g. "Kill", "Reload after kill") */
  trigger: string;
  /**
   * Broad timing category used for UI badge and filtering.
   * Kill-Proc | Reload-Proc | Wind-Up | State-Based | Shot-Proc |
   * Instant-Always | Melee-Proc | Orb-Proc | Ability-Proc | Ammo-Proc | Conditional State
   */
  ttaCategory: string;
  /** Estimated seconds from combat start to first activation (e.g. "12", "~3-5", "0") */
  estTtaSeconds: string;
  /** How long the buff lasts once active (e.g. "5s", "Permanent", "4.5s per stack") */
  duration: string;
}

export interface Perk {
  hash: string;
  name: string;
  icon: string;
  description: string;
  statModifiers: PerkMod[];
  isEnhanced: boolean;
  /**
   * True when this perk's effects require an in-game activation condition
   * (e.g. Kill Clip needs a reload after kill).  Conditional perks appear in
   * the Effects Tab with a toggle; their stat modifiers and damage buff are
   * only applied while that toggle is ON.  Passive perks (barrels, magazines,
   * always-on traits) have isConditional: false and apply immediately.
   */
  isConditional: boolean;
  /** If set, selecting this perk auto-activates the matching buff key */
  buffKey: string | null;
  /** PvE tier from community analysis: S/A/B/C/D/E/F/G, or null if unrated */
  tier: string | null;
  /**
   * Primary activation timing from perkAudit.json (Clarity-sourced).
   * Null for passive/always-on perks.
   */
  activation: PerkActivation | null;
  /**
   * Second independent trigger, if the perk has two distinct activation paths
   * (e.g. Cascade Point: kill OR precision hits with a different weapon).
   */
  activation2: PerkActivation | null;
  /**
   * If this is a base perk that has an enhanced counterpart in the same column,
   * this holds the enhanced perk so the UI can offer an "upgrade" button in Crafted mode.
   */
  enhancedVersion: Perk | null;
}

/** Semantic slot type — used for column labelling and UI rendering */
export type ColumnType = 'barrel' | 'mag' | 'perk' | 'origin';

export interface PerkColumn {
  /** Human-readable label shown in the UI (e.g. "Barrel", "Perk 1", "Origin Trait") */
  name: string;
  /** Semantic slot type so the UI can treat barrels/mags differently from trait perks */
  columnType: ColumnType;
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
  /**
   * Season number from DestinySeasonDefinition (1 = Red War, increases each season).
   * Used for chronological sorting in the sidebar. Null for base-game weapons.
   */
  seasonNumber: number | null;
  /** Full-width weapon artwork image (from Bungie manifest screenshot field) */
  screenshot: string | null;
  /** Italicised lore/flavor text shown on the weapon card */
  flavorText: string | null;
  /** Rarity tier label, e.g. "Legendary" or "Exotic" */
  rarity: string | null;
  itemTypeDisplayName: string;
  itemSubType: number;
  damageType: DamageType;
  /** 1 = Primary, 2 = Special, 3 = Heavy */
  ammoType: number;
  rpm: number;
  baseStats: StatMap;
  /** Intrinsic frame perk (e.g. "Adaptive Frame") — separate from roll perks */
  intrinsicTrait: Perk | null;
  perkSockets: PerkColumn[];
  /** Populated from archetypes.json at parse time */
  statCurves: Record<string, StatCurveNode[]>;
  /**
   * Human-readable acquisition source from Bungie's DestinyCollectibleDefinition.
   * Examples: "Complete the Deep Stone Crypt raid.", "Sold by Banshee-44, Gunsmith."
   * Null for weapons without a collectible entry (e.g. sunset / unobtainable).
   */
  source: string | null;
  /**
   * Masterwork stat options available for this weapon, derived from its
   * masterwork socket plug set in the Bungie manifest.
   * Empty for exotics / weapons where no masterwork socket was found.
   * UI falls back to the generic MASTERWORK_STATS list when empty.
   */
  masterworkOptions: string[];
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
  /** Combined damage multiplier (perks, buffs, mods, surge) at snapshot time. */
  multiplier: number;
}
