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
}

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
}

export const BUFF_DATABASE = buffData as Record<string, DamageBuff>;

/** Returns the buff key for a given perk name, or null if none. */
export function getBuffKeyForPerk(perkName: string): string | null {
  for (const [key, buff] of Object.entries(BUFF_DATABASE)) {
    if (buff.perkNames.includes(perkName)) return key;
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
