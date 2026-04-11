import { StatBlock, StatValidationError } from "../types/core";

/**
 * Stat block for Shotgun archetype.
 *
 * Models the multi-pellet spread mechanics that are unique to shotguns.
 * A rocket launcher or sniper rifle will never carry these fields.
 */
export class ShotgunStats implements StatBlock {
  readonly archetype = "shotgun" as const;

  constructor(
    /** Number of pellets fired per shell. Each pellet deals baseDamage / pelletCount. */
    readonly pelletCount: number,
    /**
     * Half-angle of the shot cone in degrees.
     *   0  = perfectly tight (slug).
     *   45 = maximum legal spread.
     */
    readonly spreadAngle: number,
    /** Distance in metres at which pellet damage begins to fall off. */
    readonly effectiveRange: number,
    /** Shells held before reload. */
    readonly magazineSize: number,
    /** Seconds to fully reload from empty. */
    readonly reloadTime: number,
    /**
     * Whether the shotgun reloads one shell at a time (pump/lever)
     * or all shells simultaneously (break-action / box mag).
     */
    readonly reloadStyle: "shell-by-shell" | "full-mag",
  ) {}

  validate(): void {
    if (this.pelletCount < 1)
      throw new StatValidationError(
        "pelletCount must be at least 1",
        "pelletCount", this.pelletCount,
      );
    if (this.spreadAngle < 0 || this.spreadAngle > 45)
      throw new StatValidationError(
        "spreadAngle must be in range 0–45 degrees",
        "spreadAngle", this.spreadAngle,
      );
    if (this.effectiveRange <= 0)
      throw new StatValidationError(
        "effectiveRange must be positive",
        "effectiveRange", this.effectiveRange,
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
