import { Weapon } from "../types/core";
import { ShotgunStats } from "../stats/ShotgunStats";
import {
  CombatContext, DamageResult, DamageStrategy, distance,
} from "./DamageStrategy";

/**
 * Damage strategy for Shotgun.
 *
 * Models the two governing mechanics of a spread-fire weapon:
 *   1. Each shell fires `pelletCount` independent projectiles.
 *   2. Damage per pellet falls off linearly beyond `effectiveRange`.
 *
 * Spread accuracy is approximated via the cone half-angle:
 *   expected_pellets_on_target ≈ pelletCount × (1 − spreadAngle / 45)
 * At 0° spread, every pellet hits; at 45° spread, ~0 pellets hit.
 * A random jitter term could replace this in a full simulation.
 */
export class ShotgunStrategy implements DamageStrategy<ShotgunStats> {

  compute(
    weapon: Weapon<ShotgunStats>,
    context: CombatContext,
  ): DamageResult {
    const { pelletCount, spreadAngle, effectiveRange } = weapon.stats;

    // Find the closest entity to targetPosition as the primary target.
    const primary = context.allEntities
      .slice()
      .sort(
        (a, b) =>
          distance(a.position, context.targetPosition) -
          distance(b.position, context.targetPosition),
      )[0];

    if (!primary) {
      return {
        direct:      0,
        splash:      0,
        affectedIds: [],
        summary:     "Shotgun: no targets in range.",
      };
    }

    const distToTarget = distance(primary.position, context.targetPosition);

    // Linear range falloff beyond effectiveRange; floors at 10% so the
    // weapon still deals some damage at long range (slugs, etc.).
    const rangeFalloff =
      distToTarget <= effectiveRange
        ? 1.0
        : Math.max(0.1, 1 - (distToTarget - effectiveRange) / effectiveRange);

    // Spread accuracy: fraction of pellets expected to land on target.
    const accuracy = Math.max(0, 1 - spreadAngle / 45);

    const damagePerPellet   = weapon.base.baseDamage / pelletCount;
    const pelletsLanded     = Math.round(pelletCount * accuracy);
    const directDamage      = damagePerPellet * pelletsLanded * rangeFalloff;

    return {
      direct:      directDamage,
      splash:      0,   // shotguns don't splash
      affectedIds: [primary.id],
      summary:
        `Shotgun: ${pelletsLanded}/${pelletCount} pellets landed on ${primary.id} ` +
        `= ${directDamage.toFixed(1)} dmg ` +
        `(range falloff: ${(rangeFalloff * 100).toFixed(0)}%, spread: ${spreadAngle}°)`,
    };
  }
}
