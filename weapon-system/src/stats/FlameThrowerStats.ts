import { StatBlock, StatValidationError } from "../types/core";

/**
 * Stat block for Flamethrower archetype.
 *
 * Demonstrates how the system handles entirely new weapon mechanics
 * (DoT, fuel stream) without touching any existing class.
 *
 * This file + FlameThrowerStrategy.ts + one `register()` call is the
 * complete cost of adding a new weapon type to the system.
 */
export class FlameThrowerStats implements StatBlock {
  readonly archetype = "flamethrower" as const;

  constructor(
    /** How many seconds the burn DoT persists after the stream stops. */
    readonly burnDuration: number,
    /** Damage dealt per second while the target is burning. */
    readonly burnDamagePerSecond: number,
    /** Maximum range of the fire stream in metres. */
    readonly streamRange: number,
    /**
     * Total fuel units (analogous to ammo).
     * The stream consumes 1 unit per second of continuous fire.
     */
    readonly fuelCapacity: number,
    /** Seconds to fully refuel from empty. */
    readonly refuelTime: number,
    /**
     * Width of the fire stream cone at maximum range, in metres.
     * Wider cones hit more targets but deal reduced per-target damage.
     */
    readonly streamWidth: number,
  ) {}

  validate(): void {
    if (this.burnDuration <= 0)
      throw new StatValidationError(
        "burnDuration must be positive",
        "burnDuration", this.burnDuration,
      );
    if (this.burnDamagePerSecond <= 0)
      throw new StatValidationError(
        "burnDamagePerSecond must be positive",
        "burnDamagePerSecond", this.burnDamagePerSecond,
      );
    if (this.streamRange <= 0)
      throw new StatValidationError(
        "streamRange must be positive",
        "streamRange", this.streamRange,
      );
    if (this.fuelCapacity < 1)
      throw new StatValidationError(
        "fuelCapacity must be at least 1",
        "fuelCapacity", this.fuelCapacity,
      );
    if (this.refuelTime <= 0)
      throw new StatValidationError(
        "refuelTime must be positive",
        "refuelTime", this.refuelTime,
      );
    if (this.streamWidth <= 0)
      throw new StatValidationError(
        "streamWidth must be positive",
        "streamWidth", this.streamWidth,
      );
  }
}
