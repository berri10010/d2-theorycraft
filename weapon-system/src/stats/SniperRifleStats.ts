import { StatBlock, StatValidationError } from "../types/core";

/**
 * Stat block for Sniper Rifle archetype.
 *
 * Models precision long-range mechanics: scope, flinch resistance,
 * bolt cycle time.  None of these concepts apply to melee or explosive weapons.
 */
export class SniperRifleStats implements StatBlock {
  readonly archetype = "sniper_rifle" as const;

  constructor(
    /** Zoom multiplier when ADS. 1.0 = iron sights (no magnification). */
    readonly scopeMagnification: number,
    /**
     * Aim-assist strength, 0–100.
     * Affects bullet magnetism and target acquisition speed.
     */
    readonly aimAssist: number,
    /**
     * Resistance to camera flinch when taking damage while scoped, 0–100.
     *   0  = full flinch (camera violently kicked).
     *   100 = immune to flinch.
     */
    readonly flinchResist: number,
    /** Time in seconds between shots (chamber / bolt cycle). */
    readonly chamberTime: number,
    /** Rounds per magazine. */
    readonly magazineSize: number,
    /** Seconds to reload from empty. */
    readonly reloadTime: number,
  ) {}

  validate(): void {
    if (this.scopeMagnification < 1)
      throw new StatValidationError(
        "scopeMagnification must be ≥ 1 (1 = no zoom)",
        "scopeMagnification", this.scopeMagnification,
      );
    if (this.aimAssist < 0 || this.aimAssist > 100)
      throw new StatValidationError(
        "aimAssist must be in range 0–100",
        "aimAssist", this.aimAssist,
      );
    if (this.flinchResist < 0 || this.flinchResist > 100)
      throw new StatValidationError(
        "flinchResist must be in range 0–100",
        "flinchResist", this.flinchResist,
      );
    if (this.chamberTime <= 0)
      throw new StatValidationError(
        "chamberTime must be positive",
        "chamberTime", this.chamberTime,
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
