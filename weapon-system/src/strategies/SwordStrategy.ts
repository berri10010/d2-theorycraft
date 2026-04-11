import { Weapon } from "../types/core";
import { SwordStats } from "../stats/SwordStats";
import {
  CombatContext, DamageResult, DamageStrategy, distance,
} from "./DamageStrategy";

/**
 * Damage strategy for Sword (melee).
 *
 * The sword can hit multiple targets simultaneously if they fall within
 * the swing arc.  Targets beyond `reach` are unaffected.
 *
 * Arc coverage is approximated as a fraction of a sphere at range `reach`.
 * Any entity within range whose angular position (simplified to distance
 * comparison here) falls inside the arc receives full damage.
 */
export class SwordStrategy implements DamageStrategy<SwordStats> {

  compute(
    weapon: Weapon<SwordStats>,
    context: CombatContext,
  ): DamageResult {
    const { swingArcDegrees, reach } = weapon.stats;

    // Entities within physical reach of the blade.
    const inReach = context.allEntities.filter(
      e => distance(e.position, context.targetPosition) <= reach,
    );

    // Arc fraction: what proportion of a 360° sweep this arc covers.
    // Entities are uniformly distributed in the simplified model; the
    // actual engine would do proper dot-product angle checking here.
    const arcFraction = swingArcDegrees / 360;
    const hit = inReach.filter((_, i) => i < Math.ceil(inReach.length * arcFraction));

    const damagePerTarget = weapon.base.baseDamage;
    const totalDamage     = damagePerTarget * hit.length;

    return {
      direct:      hit.length > 0 ? damagePerTarget : 0,
      splash:      Math.max(0, totalDamage - damagePerTarget),
      affectedIds: hit.map(e => e.id),
      summary:
        `Sword: ${hit.length} target(s) hit within ${reach}m arc ` +
        `(${swingArcDegrees}°) — ${totalDamage.toFixed(1)} total dmg`,
    };
  }
}
