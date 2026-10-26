import buffData from '../data/buffs.json';

export type BuffCategory = 'weapon_perk' | 'subclass' | 'debuff';

/**
 * How this buff stacks with others:
 * - multiplicative: all active perk buffs multiply together
 * - empowering:     only the highest empowering buff applies (mutually exclusive)
 * - debuff:         only the highest debuff applies (mutually exclusive)
 */
export type StackType = 'multiplicative' | 'empowering' | 'debuff';

/** One level of a stackable perk buff (e.g. Rampage ×1, ×2, ×3) */
export interface BuffStack {
  /** Stack count shown in the game (e.g. 1, 2, 3 for Rampage) */
  count: number;
  /** Short display label (e.g. "×1", "×2") */
  label: string;
  /** Damage multiplier at this stack level */
  multiplier: number;
  /** Timing / crit changes at this stack level (see WeaponEffects); absent = the buff's own value. */
  critMultiplier?: number;
  shotDelayMultiplier?: number;
  chargeMultiplier?: number;
}

export type BuffMode = 'pve' | 'pvp';

export type ClassType = 'neutral' | 'hunter' | 'warlock' | 'titan';

export interface DamageBuff {
  hash: string;
  name: string;
  /** UI grouping: weapon_perk | subclass | debuff */
  category: BuffCategory;
  /** Stacking rule — see StackType */
  stackType: StackType;
  /** Which class section to display in (undefined = class-neutral empowering/debuff sections) */
  classType?: ClassType;
  /**
   * Default / max multiplier.
   * For stackable perks this is the max-stack value; the active stack is
   * resolved via the `stacks` array + `buffStacks` in the weapon store.
   */
  multiplier: number;
  description: string;
  /** Perk names that link this buff when the perk is selected */
  perkNames: string[];
  /**
   * Bungie CDN icon path (relative, without root).
   * For weapon_perk buffs this is null — the UI uses the live perk icon instead.
   * For subclass buffs this is the ability icon from the manifest.
   */
  icon?: string | null;
  /**
   * Discrete stack levels for perks that ramp (e.g. Rampage ×1/×2/×3).
   * When present the UI shows a stack selector instead of a single toggle.
   */
  stacks?: BuffStack[];
  /**
   * Flat weapon stat bonuses applied to the stat bars when this buff is active.
   * Keys are stat names (e.g. "Handling", "Reload"). Values are added on top of
   * base + perk modifiers, clamped to [0, 100].
   */
  statBonuses?: Record<string, number>;
  /**
   * Per-ammo-type damage multipliers — overrides `multiplier` when present.
   * Keys: "primary" | "special" | "power".
   * Used by Vorpal Weapon (+20% primary, +15% special, +10% power).
   */
  ammoTypeMultipliers?: Record<string, number>;
  /** Extra multiplier on crit damage only, relative to `multiplier` (see WeaponEffects). */
  critMultiplier?: number;
  /** Multiplier on the time between shots; < 1 fires faster (see WeaponEffects). */
  shotDelayMultiplier?: number;
  /** Multiplier on charge / draw time; < 1 is faster (see WeaponEffects). */
  chargeMultiplier?: number;
  /** Damage multiplier by weapon type (itemTypeDisplayName), e.g. Explosive Light on grenade launchers. */
  weaponTypeMultipliers?: Record<string, number>;
  /** The buff only applies to these weapon types (itemTypeDisplayName). */
  weaponTypes?: string[];
  /**
   * The perk only links to this buff on these weapons (by name). For exotic traits that share a name with a
   * legendary perk, e.g. Izanagi's Burden's "Honed Edge" and the sword perk of the same name.
   */
  weaponNames?: string[];
  /** The buff only applies to weapons of these damage types, e.g. Disruption Break is kinetic-only. */
  damageTypes?: string[];
  /**
   * What differs in PvP. Values here replace the PvE ones; anything not listed keeps its PvE value.
   * Most buffs are weaker in the Crucible (Radiant +25% PvE, +10% PvP).
   */
  pvp?: Partial<Pick<DamageBuff,
    'multiplier' | 'stacks' | 'ammoTypeMultipliers' | 'weaponTypeMultipliers' |
    'critMultiplier' | 'shotDelayMultiplier' | 'chargeMultiplier' | 'description'>>;
}

export const BUFF_DATABASE = buffData as Record<string, DamageBuff>;

/** Returns the buff key for a given perk name (on the named weapon, for buffs limited by `weaponNames`), or null. */
export function getBuffKeyForPerk(perkName: string, weaponName?: string): string | null {
  for (const [key, buff] of Object.entries(BUFF_DATABASE)) {
    if (!buff.perkNames.includes(perkName)) continue;
    if (buff.weaponNames && !(weaponName && buff.weaponNames.includes(weaponName))) continue;
    return key;
  }
  return null;
}

/**
 * Returns the effective multiplier for a buff, accounting for the active stack level.
 * @param buff        The buff definition
 * @param stackIndex  0-based index into buff.stacks (from buffStacks store state). Defaults to last (max).
 */
export function getBuffMultiplier(buff: DamageBuff, stackIndex?: number): number {
  if (!buff.stacks?.length) return buff.multiplier;
  const idx = stackIndex ?? buff.stacks.length - 1;
  return buff.stacks[Math.max(0, Math.min(idx, buff.stacks.length - 1))]?.multiplier ?? buff.multiplier;
}

/** The buff as it behaves in a game mode: PvP overrides replace the PvE values. */
export function buffForMode(buff: DamageBuff, mode: BuffMode): DamageBuff {
  return mode === 'pvp' && buff.pvp ? { ...buff, ...buff.pvp } : buff;
}

/** The weapon fields a buff can be restricted by. */
export interface BuffWeapon { itemTypeDisplayName?: string; damageType?: string; ammoType?: number }

/** Whether the buff applies to this weapon at all (weapon-type and damage-type restrictions). */
export function buffApplies(buff: DamageBuff, weapon: BuffWeapon | null | undefined): boolean {
  if (!weapon) return true;
  if (buff.weaponTypes?.length && !buff.weaponTypes.includes(weapon.itemTypeDisplayName ?? '')) return false;
  if (buff.damageTypes?.length && !buff.damageTypes.includes((weapon.damageType ?? '').toLowerCase())) return false;
  return true;
}

const AMMO_SLOT: Record<number, string> = { 1: 'primary', 2: 'special', 3: 'power' };

/**
 * The damage multiplier a buff gives this weapon in this mode: 1 when it doesn't apply, otherwise the
 * per-ammo or per-weapon-type value if there is one, else the (stack-aware) general value.
 */
export function resolveBuffMultiplier(
  buff: DamageBuff,
  mode: BuffMode,
  weapon: BuffWeapon | null | undefined,
  stackIndex?: number,
): number {
  const b = buffForMode(buff, mode);
  if (!buffApplies(b, weapon)) return 1;
  if (b.ammoTypeMultipliers) return b.ammoTypeMultipliers[AMMO_SLOT[weapon?.ammoType ?? 1]] ?? b.multiplier;
  const byType = weapon?.itemTypeDisplayName ? b.weaponTypeMultipliers?.[weapon.itemTypeDisplayName] : undefined;
  if (byType !== undefined) return byType;
  return getBuffMultiplier(b, stackIndex);
}

/** The timing / crit fields of a buff at a stack level, for combineEffects. */
export function resolveBuffEffects(
  buff: DamageBuff,
  mode: BuffMode,
  weapon: BuffWeapon | null | undefined,
  stackIndex?: number,
): Pick<DamageBuff, 'critMultiplier' | 'shotDelayMultiplier' | 'chargeMultiplier'> {
  const b = buffForMode(buff, mode);
  if (!buffApplies(b, weapon)) return {};
  const st = b.stacks?.length ? b.stacks[Math.max(0, Math.min(stackIndex ?? b.stacks.length - 1, b.stacks.length - 1))] : undefined;
  return {
    critMultiplier: st?.critMultiplier ?? b.critMultiplier,
    shotDelayMultiplier: st?.shotDelayMultiplier ?? b.shotDelayMultiplier,
    chargeMultiplier: st?.chargeMultiplier ?? b.chargeMultiplier,
  };
}
