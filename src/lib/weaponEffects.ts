import type { WeaponStatEntry } from './weaponStats';
import type { DamageBuff } from './buffDatabase';

/**
 * Timing / crit changes from exotic traits (Business Time, Silkbound Slayer, Rat Pack, ...), on top of
 * the damage multiplier the buff system already applies. 1 = no change.
 */
export interface WeaponEffects {
  /** Extra multiplier on crit damage only (body already follows the shared damage multiplier). */
  critMult: number;
  /** Multiplier on the time between shots (< 1 = faster). */
  shotDelayMult: number;
  /** Multiplier on charge / draw time (< 1 = faster). */
  chargeMult: number;
}

export const NO_EFFECTS: WeaponEffects = { critMult: 1, shotDelayMult: 1, chargeMult: 1 };

type EffectFields = Pick<DamageBuff, 'critMultiplier' | 'shotDelayMultiplier' | 'chargeMultiplier'>;

/** Fold the effect fields of every active buff into one set of multipliers. */
export function combineEffects(buffs: EffectFields[]): WeaponEffects {
  const out = { ...NO_EFFECTS };
  for (const b of buffs) {
    out.critMult *= b.critMultiplier ?? 1;
    out.shotDelayMult *= b.shotDelayMultiplier ?? 1;
    out.chargeMult *= b.chargeMultiplier ?? 1;
  }
  return out;
}

export function isNeutral(fx: WeaponEffects | undefined): boolean {
  return !fx || (fx.critMult === 1 && fx.shotDelayMult === 1 && fx.chargeMult === 1);
}

/** The stat entry with the effects applied (the same object when there are none). */
export function applyEffects(entry: WeaponStatEntry, fx: WeaponEffects | undefined): WeaponStatEntry {
  if (!fx || isNeutral(fx)) return entry;
  return {
    ...entry,
    critDamage: entry.critDamage * fx.critMult,
    shotDelay: entry.shotDelay != null ? entry.shotDelay * fx.shotDelayMult : null,
    chargeMs: entry.chargeMs != null ? entry.chargeMs * fx.chargeMult : null,
  };
}
