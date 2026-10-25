import { CATALYST_EFFECTS } from '../data/catalystEffects';
import type { Perk, Weapon } from '../types/weapon';

/** Column name the Effects panel shows for a weapon's intrinsic trait. */
export const INTRINSIC_COLUMN = 'Intrinsic';

/**
 * The weapon's intrinsic trait when it carries a modelled effect (exotic frames such as Hawkmoon's Paracausal
 * Shot or Tarrabah's Ravenous Beast). Unlike the roll's perks the intrinsic is never "selected", so the Effects
 * panel and the damage maths have to ask for it explicitly.
 */
export function intrinsicEffectPerk(weapon: Weapon | null | undefined): Perk | null {
  const perk = weapon?.intrinsicTrait;
  return perk && perk.buffKey ? perk : null;
}

/** Buff keys of the damage effects a completed catalyst adds to this weapon (see data/catalystEffects.ts). */
export function catalystEffectKeys(weapon: Weapon | null | undefined): string[] {
  return weapon?.catalyst ? CATALYST_EFFECTS[weapon.name] ?? [] : [];
}

/** Where a catalyst effect's on/off (or stack) state lives in the store's activeEffects map. */
export const catalystEffectId = (buffKey: string): string => `catalyst:${buffKey}`;
