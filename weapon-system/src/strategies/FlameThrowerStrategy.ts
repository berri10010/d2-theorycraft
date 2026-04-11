import { Weapon } from "../types/core";
import { FlameThrowerStats } from "../stats/FlameThrowerStats";
import {
  CombatContext, DamageResult, DamageStrategy, distance,
} from "./DamageStrategy";

/**
 * Damage strategy for FlameThrower.
 *
 * Demonstrates how an entirely new damage mechanic (DoT + stream width)
 * is added without touching any existing file.
 *
 * The strategy models two damage components:
 *   1. Direct stream damage — applied instantly to all entities within
 *      `streamRange` and inside the stream width cone.
 *   2. Burn DoT — the total damage the burn effect will deal over
 *      `burnDuration` seconds.  Reported as a projected value; the game
 *      loop is responsible for ticking it each frame.
 *
 * Multiple targets inside the stream each receive the full burn effect
 * independently, but share the stream's impact damage proportionally.
 */
export class FlameThrowerStrategy implements DamageStrategy<FlameThrowerStats> {

  compute(
    weapon: Weapon<FlameThrowerStats>,
    context: CombatContext,
  ): DamageResult {
    const {
      burnDuration,
      burnDamagePerSecond,
      streamRange,
      streamWidth,
    } = weapon.stats;

    // Entities within stream range.
    const inStream = context.allEntities.filter(
      e => distance(e.position, context.targetPosition) <= streamRange,
    );

    // Narrow by stream width: entities further from the centreline are excluded.
    // Width check is simplified — a real implementation would use a cone test.
    const targetCount = Math.max(
      1,
      Math.round(inStream.length * Math.min(1, streamWidth / streamRange)),
    );
    const hit = inStream.slice(0, targetCount);

    if (hit.length === 0) {
      return {
        direct:      0,
        splash:      0,
        affectedIds: [],
        summary:     "FlameThrower: no targets in stream range.",
      };
    }

    // Direct impact damage spread across all targets in stream.
    const directPerTarget = weapon.base.baseDamage / hit.length;

    // Total projected burn DoT per target (the game loop ticks this over time).
    const totalBurnDot = burnDuration * burnDamagePerSecond;
    const totalDamage  = (directPerTarget + totalBurnDot) * hit.length;

    return {
      direct:      directPerTarget * hit.length,
      splash:      totalBurnDot * hit.length,   // reported as projected DoT
      affectedIds: hit.map(e => e.id),
      summary:
        `FlameThrower: ${hit.length} target(s) in stream — ` +
        `${(directPerTarget * hit.length).toFixed(1)} direct + ` +
        `${(totalBurnDot * hit.length).toFixed(1)} projected DoT ` +
        `(${burnDuration}s @ ${burnDamagePerSecond}/s each) = ` +
        `${totalDamage.toFixed(1)} total`,
    };
  }
}
