import { Weapon } from "../types/core";
import { RocketLauncherStats } from "../stats/RocketLauncherStats";
import {
  CombatContext, DamageResult, DamageStrategy, distance,
} from "./DamageStrategy";

/**
 * Damage strategy for Rocket Launcher.
 *
 * Implements quadratic AoE falloff — full damage at the epicentre,
 * tapering to zero at the edge of blastRadius.
 * Projectile velocity scales direct damage (faster = harder impact).
 * Blast-radius logic is fully contained here; CombatManager knows nothing of it.
 */
export class RocketLauncherStrategy
  implements DamageStrategy<RocketLauncherStats> {

  compute(
    weapon: Weapon<RocketLauncherStats>,
    context: CombatContext,
  ): DamageResult {
    const { blastRadius, projectileVelocity } = weapon.stats;

    // Velocity scalar — rockets with higher travel speed hit harder on impact.
    // Capped at 1.25× to prevent runaway scaling on extreme values.
    const velocityScalar = Math.min(projectileVelocity / 60, 1.25);
    const directDamage   = weapon.base.baseDamage * velocityScalar;

    // Collect all entities within the blast sphere.
    const inBlast = context.allEntities.filter(
      e => distance(e.position, context.targetPosition) <= blastRadius,
    );

    // Quadratic falloff: damage = base × (1 − (d / r)²) × 0.6
    // Outer 0.6 factor ensures splash never exceeds 60% of direct.
    const splashHits = inBlast.map(e => {
      const d       = distance(e.position, context.targetPosition);
      const falloff = 1 - (d / blastRadius) ** 2;
      return { id: e.id, dmg: directDamage * 0.6 * falloff };
    });

    const totalSplash = splashHits.reduce((sum, h) => sum + h.dmg, 0);

    return {
      direct:      directDamage,
      splash:      totalSplash,
      affectedIds: splashHits.map(h => h.id),
      summary:
        `RocketLauncher: ${directDamage.toFixed(1)} direct ` +
        `+ ${totalSplash.toFixed(1)} splash across ${splashHits.length} targets ` +
        `(r=${blastRadius}m, v=${projectileVelocity}m/s)`,
    };
  }
}
