import {
  BaseWeaponStats, StatBlock, StatValidationError, Weapon,
} from "../types/core";

// ─────────────────────────────────────────────────────────────────────────────
// WeaponFactory — the single, validated entry point for weapon construction.
//
// Every `Weapon<T>` in the system was created here.  Callers can rely on
// any Weapon they receive being fully valid — no defensive null-checking
// or range-checking is needed downstream.
// ─────────────────────────────────────────────────────────────────────────────

export class WeaponFactory {
  /**
   * Constructs a fully validated, immutable `Weapon<TStats>`.
   *
   * @throws {StatValidationError} if any base stat or archetype stat is invalid.
   *
   * @example
   * ```ts
   * const gjallarhorn = WeaponFactory.create(
   *   {
   *     name:       "Gjallarhorn",
   *     baseDamage: 9200,
   *     weight:     8.4,
   *     durability: 100,
   *     tier:       "exotic",
   *   },
   *   new RocketLauncherStats(6.5, 45, 85, 1, 3.2),
   * );
   * ```
   */
  static create<TStats extends StatBlock>(
    base: BaseWeaponStats,
    stats: TStats,
  ): Weapon<TStats> {
    WeaponFactory.validateBase(base);
    stats.validate();
    return new Weapon(base, stats);
  }

  // ── Base stat validation ────────────────────────────────────────────────────

  private static validateBase(base: BaseWeaponStats): void {
    if (!base.name || !base.name.trim())
      throw new StatValidationError(
        "name must not be empty",
        "name", base.name,
      );

    if (base.baseDamage <= 0)
      throw new StatValidationError(
        "baseDamage must be positive",
        "baseDamage", base.baseDamage,
      );

    if (base.weight <= 0)
      throw new StatValidationError(
        "weight must be positive",
        "weight", base.weight,
      );

    if (base.durability < 0 || base.durability > 100)
      throw new StatValidationError(
        "durability must be in range 0–100",
        "durability", base.durability,
      );

    const validTiers = ["common", "rare", "legendary", "exotic"] as const;
    if (!(validTiers as readonly string[]).includes(base.tier))
      throw new StatValidationError(
        `tier must be one of: ${validTiers.join(", ")}`,
        "tier", base.tier,
      );
  }
}
