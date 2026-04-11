import { Weapon } from "../types/core";
import { SniperRifleStats } from "../stats/SniperRifleStats";
import { CombatContext, DamageResult, DamageStrategy } from "./DamageStrategy";

/**
 * Damage strategy for Sniper Rifle.
 *
 * Sniper rifles deal precision single-target damage.  The only modifier
 * applied here is a scope magnification bonus — higher zoom = slightly
 * harder hit, representing the accuracy advantage at long range.
 *
 * Flinch resistance and chamber time are mechanical stats consumed by
 * the simulation loop; they don't affect per-shot damage.  They are
 * exposed on the stat block for the simulation layer to read directly.
 */
export class SniperRifleStrategy implements DamageStrategy<SniperRifleStats> {

  compute(
    weapon: Weapon<SniperRifleStats>,
    context: CombatContext,
  ): DamageResult {
    const { scopeMagnification, aimAssist } = weapon.stats;

    // Aim-assist gives a minor damage bonus by improving hit placement.
    // Each 10 points above 50 grants +1% (caps at +5%).
    const aimBonus   = Math.min(0.05, Math.max(0, (aimAssist - 50) / 1000));

    // Scope magnification grants up to +10% for high-zoom optics.
    const scopeBonus = Math.min(0.10, (scopeMagnification - 1) * 0.025);

    const totalDamage = weapon.base.baseDamage * (1 + aimBonus + scopeBonus);

    // Find the closest entity as primary target.
    const primary = context.allEntities[0];

    if (!primary) {
      return {
        direct:      0,
        splash:      0,
        affectedIds: [],
        summary:     "SniperRifle: no target.",
      };
    }

    return {
      direct:      totalDamage,
      splash:      0,
      affectedIds: [primary.id],
      summary:
        `SniperRifle: ${totalDamage.toFixed(1)} dmg to ${primary.id} ` +
        `(scope ×${scopeMagnification}, aim +${(aimBonus * 100).toFixed(1)}%)`,
    };
  }
}
