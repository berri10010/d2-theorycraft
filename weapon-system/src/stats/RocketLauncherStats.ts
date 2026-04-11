import { StatBlock, StatValidationError } from "../types/core";

/**
 * Stat block for Rocket Launcher archetype.
 *
 * Encapsulates every heavy-projectile property.  None of these fields
 * exist on any other weapon type — there is no `blastRadius: 0` padding
 * elsewhere in the system.
 */
export class RocketLauncherStats implements StatBlock {
  readonly archetype = "rocket_launcher" as const;

  constructor(
    /** Explosion radius in metres.  Controls AoE falloff curve. */
    readonly blastRadius: number,
    /** Projectile travel speed in m/s.  Affects time-to-target and damage scalar. */
    readonly projectileVelocity: number,
    /**
     * Homing strength, 0–100.
     *   0  = no tracking (dumb-fire).
     *   100 = perfect lock-on.
     */
    readonly trackingStrength: number,
    /** Rounds held before reload. */
    readonly magazineSize: number,
    /** Seconds to fully reload from empty. */
    readonly reloadTime: number,
  ) {}

  validate(): void {
    if (this.blastRadius <= 0)
      throw new StatValidationError(
        "blastRadius must be positive",
        "blastRadius", this.blastRadius,
      );
    if (this.projectileVelocity <= 0)
      throw new StatValidationError(
        "projectileVelocity must be positive",
        "projectileVelocity", this.projectileVelocity,
      );
    if (this.trackingStrength < 0 || this.trackingStrength > 100)
      throw new StatValidationError(
        "trackingStrength must be in range 0–100",
        "trackingStrength", this.trackingStrength,
      );
    if (this.magazineSize < 1)
      throw new StatValidationError(
        "magazineSize must be at least 1",
        "magazineSize", this.magazineSize,
      );
    if (this.reloadTime <= 0)
      throw new StatValidationError(
        "reloadTime must be positive",
        "reloadTime", this.reloadTime,
      );
  }
}
