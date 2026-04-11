import { StatBlock, Weapon } from "../types/core";
import {
  CombatContext, DamageResult, DamageStrategy,
} from "../strategies/DamageStrategy";

// ─────────────────────────────────────────────────────────────────────────────
// CombatManager — type-agnostic combat dispatch.
//
// The manager holds a registry that maps an archetype string to the
// strategy responsible for that archetype's damage math.
//
// The manager itself contains ZERO weapon-specific logic.
// Adding a new weapon type means calling `register()` once at startup —
// the manager's source code is never modified.
// ─────────────────────────────────────────────────────────────────────────────

export class CombatManager {
  // Map<archetype string, strategy>
  private readonly registry = new Map<
    string,
    DamageStrategy<StatBlock>
  >();

  /**
   * Registers a damage strategy for a given archetype.
   *
   * Call this once per archetype at application startup (see index.ts).
   * Registering the same archetype twice overwrites the previous strategy.
   *
   * @example
   * ```ts
   * combat.register("rocket_launcher", new RocketLauncherStrategy());
   * combat.register("shotgun",         new ShotgunStrategy());
   * ```
   */
  register<TStats extends StatBlock>(
    archetype: TStats["archetype"],
    strategy: DamageStrategy<TStats>,
  ): this {
    this.registry.set(archetype, strategy as DamageStrategy<StatBlock>);
    return this;   // fluent chaining for cleaner wiring
  }

  /**
   * Resolves a hit: looks up the registered strategy for this weapon's
   * archetype and delegates all damage calculation to it.
   *
   * @throws {Error} if no strategy has been registered for the weapon's archetype.
   */
  resolveHit<TStats extends StatBlock>(
    weapon: Weapon<TStats>,
    context: CombatContext,
  ): DamageResult {
    const archetype = weapon.stats.archetype;
    const strategy  = this.registry.get(archetype);

    if (!strategy) {
      throw new Error(
        `[CombatManager] No strategy registered for archetype "${archetype}". ` +
        `Did you forget to call combat.register("${archetype}", ...)?`,
      );
    }

    return strategy.compute(weapon as Weapon<StatBlock>, context);
  }

  /** Returns the list of all registered archetype keys (useful for debugging). */
  registeredArchetypes(): string[] {
    return [...this.registry.keys()];
  }
}
