import { StatBlock, StatValidationError } from "../types/core";

/**
 * Stat block for Sword (melee) archetype.
 *
 * No projectile fields, no magazine, no reload time.
 * A sword is structurally incompatible with every ranged weapon — this
 * class makes that incompatibility explicit and compile-time enforced.
 */
export class SwordStats implements StatBlock {
  readonly archetype = "sword" as const;

  constructor(
    /**
     * Arc width of the melee hitbox in degrees.
     * Higher = wider sweep that catches more targets per swing.
     *   Range: 1–360.
     */
    readonly swingArcDegrees: number,
    /**
     * Percentage of incoming damage absorbed while actively blocking, 0–100.
     *   0  = no guard (blocking does nothing).
     *   100 = perfect parry (absorbs all damage).
     */
    readonly guardEfficiency: number,
    /**
     * Movement speed multiplier during a charged (heavy) attack.
     * Values > 1 mean the user charges forward; < 1 means slowed.
     */
    readonly chargeMoveSpeed: number,
    /** Number of swings before the weapon needs to be "recharged" (ammo). */
    readonly ammoCapacity: number,
    /**
     * Reach of the blade in metres.
     * Determines maximum distance at which the hitbox connects.
     */
    readonly reach: number,
  ) {}

  validate(): void {
    if (this.swingArcDegrees <= 0 || this.swingArcDegrees > 360)
      throw new StatValidationError(
        "swingArcDegrees must be in range 1–360",
        "swingArcDegrees", this.swingArcDegrees,
      );
    if (this.guardEfficiency < 0 || this.guardEfficiency > 100)
      throw new StatValidationError(
        "guardEfficiency must be in range 0–100",
        "guardEfficiency", this.guardEfficiency,
      );
    if (this.chargeMoveSpeed <= 0)
      throw new StatValidationError(
        "chargeMoveSpeed must be positive",
        "chargeMoveSpeed", this.chargeMoveSpeed,
      );
    if (this.ammoCapacity < 1)
      throw new StatValidationError(
        "ammoCapacity must be at least 1",
        "ammoCapacity", this.ammoCapacity,
      );
    if (this.reach <= 0)
      throw new StatValidationError(
        "reach must be positive",
        "reach", this.reach,
      );
  }
}
