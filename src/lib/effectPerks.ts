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
