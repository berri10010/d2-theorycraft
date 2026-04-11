// ─────────────────────────────────────────────────────────────────────────────
// core.ts — Foundation types shared by the entire weapon system.
//
// Rules enforced here:
//   • Every weapon has a BaseWeaponStats (universal, archetype-agnostic).
//   • Every archetype stat block implements StatBlock (validate + archetype tag).
//   • Weapon<TStats> binds the two together; TStats is resolved at the call site,
//     making cross-archetype field access a compile error, not a runtime surprise.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared error type ─────────────────────────────────────────────────────────

export class StatValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldName?: string,
    public readonly receivedValue?: unknown,
  ) {
    const detail =
      fieldName !== undefined
        ? ` (field: "${fieldName}", received: ${JSON.stringify(receivedValue)})`
        : "";
    super(`[StatValidation] ${message}${detail}`);
    this.name = "StatValidationError";
  }
}

// ── Universal base stats — every weapon carries these ─────────────────────────

export type WeaponTier = "common" | "rare" | "legendary" | "exotic";

export interface BaseWeaponStats {
  /** Display name, e.g. "Gjallarhorn". */
  readonly name: string;
  /** Raw damage value before type-specific multipliers are applied. */
  readonly baseDamage: number;
  /** Kilograms. Affects movement speed penalty when equipped. */
  readonly weight: number;
  /**
   * 0–100 durability scale.
   * 100 = brand new; 0 = broken and unusable.
   */
  readonly durability: number;
  readonly tier: WeaponTier;
}

// ── Contract every archetype stat block must fulfil ───────────────────────────

export interface StatBlock {
  /**
   * String literal tag identifying the archetype.
   * Used by CombatManager to look up the registered DamageStrategy.
   *
   * Must be declared `as const` in every implementing class so TypeScript
   * narrows the type to the literal rather than widening to `string`.
   *
   * @example
   *   readonly archetype = "rocket_launcher" as const;
   */
  readonly archetype: string;

  /**
   * Throws `StatValidationError` if any stat value is out of range or
   * logically inconsistent.  Called by WeaponFactory before the Weapon
   * is returned — invalid stat blocks can never produce a live weapon.
   */
  validate(): void;
}

// ── The weapon — generic over its specialized stat block ──────────────────────

export class Weapon<TStats extends StatBlock> {
  /** Universal stats shared by every weapon. Immutable after construction. */
  readonly base: Readonly<BaseWeaponStats>;
  /** Archetype-specific stats. Shape is fully resolved by the generic parameter. */
  readonly stats: Readonly<TStats>;

  /**
   * Do not call directly.  Use `WeaponFactory.create()` which validates
   * both `base` and `stats` before constructing the instance.
   */
  constructor(base: BaseWeaponStats, stats: TStats) {
    this.base  = Object.freeze({ ...base });
    this.stats = Object.freeze({ ...stats }) as Readonly<TStats>;
  }

  toString(): string {
    return `[${this.stats.archetype}] ${this.base.name} (${this.base.tier})`;
  }
}
