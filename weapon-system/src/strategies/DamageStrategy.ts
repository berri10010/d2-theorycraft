import { StatBlock, Weapon } from "../types/core";

// ─────────────────────────────────────────────────────────────────────────────
// DamageStrategy — shared interfaces for the combat layer.
//
// The global CombatManager never inspects a stat block directly.
// Instead it delegates to whichever DamageStrategy was registered for
// that archetype.  All type-specific math lives in the strategy, not here.
// ─────────────────────────────────────────────────────────────────────────────

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  id: string;
  position: Vector3;
  currentHp: number;
}

export interface CombatContext {
  /** Position the projectile/attack lands (or originates for melee). */
  readonly targetPosition: Vector3;
  /**
   * Every entity currently loaded in the scene, used by AoE strategies
   * to find secondary targets within blast / stream range.
   */
  readonly allEntities: readonly Entity[];
}

export interface DamageResult {
  /** Damage dealt to the primary target. */
  readonly direct: number;
  /**
   * Sum of splash damage to all secondary targets.
   * Zero for weapons that cannot hit multiple targets.
   */
  readonly splash: number;
  /** IDs of every entity that received damage this hit. */
  readonly affectedIds: readonly string[];
  /** Human-readable description of how damage was calculated. */
  readonly summary: string;
}

/** Euclidean distance between two 3D points. */
export function distance(a: Vector3, b: Vector3): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2,
  );
}

/**
 * Contract every damage strategy must fulfil.
 *
 * Strategies are stateless — all computation is pure given the weapon
 * and context.  This makes them trivially testable in isolation.
 */
export interface DamageStrategy<TStats extends StatBlock> {
  compute(weapon: Weapon<TStats>, context: CombatContext): DamageResult;
}
