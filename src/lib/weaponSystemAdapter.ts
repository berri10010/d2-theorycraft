/**
 * weaponSystemAdapter.ts
 *
 * Bridge between the site's Bungie-manifest weapon data and the weapon-system
 * module.  Maps itemSubType + D2 stat bars (0–100) to weapon-system stat blocks,
 * runs combat.resolveHit() with a representative sample scenario, and returns a
 * typed DamageProfileResult for the DamageProfilePanel to render.
 *
 * Supported archetypes:
 *   Rocket Launcher (10)  → RocketLauncherStats
 *   Shotgun        (7,45) → ShotgunStats
 *   Sniper Rifle  (12,44) → SniperRifleStats
 *   Sword         (34,48) → SwordStats
 *   Trace Rifle      (29) → FlameThrowerStats  (stream-weapon analogue)
 */

import type { Weapon as D2Weapon, StatMap, GameMode } from '../types/weapon';
import { getArchetype } from './archetypes';
import { lookupWeaponStat } from './weaponStats';
import {
  Weapon,
  WeaponFactory,
  StatValidationError,
  RocketLauncherStats,
  ShotgunStats,
  SniperRifleStats,
  SwordStats,
  FlameThrowerStats,
  combat,
} from 'weapon-system';
import type { StatBlock, CombatContext, DamageResult, Entity } from 'weapon-system';

// ── Public types ──────────────────────────────────────────────────────────────

export type SupportedArchetype =
  | 'rocket_launcher'
  | 'shotgun'
  | 'sniper_rifle'
  | 'sword'
  | 'flamethrower';

export interface KeyStat {
  label: string;
  value: string;
}

export interface DamageProfileResult {
  archetype: SupportedArchetype;
  archetypeLabel: string;
  result: DamageResult;
  scenarioLabel: string;
  keyStats: KeyStat[];
}

// ── Archetype detection ───────────────────────────────────────────────────────

const ROCKET_SUBTYPES  = new Set([10]);
const SHOTGUN_SUBTYPES = new Set([7, 45]);
const SNIPER_SUBTYPES  = new Set([12, 44]);
const SWORD_SUBTYPES   = new Set([34, 48]);
const TRACE_SUBTYPES   = new Set([29]);

export function detectArchetype(itemSubType: number): SupportedArchetype | null {
  if (ROCKET_SUBTYPES.has(itemSubType))  return 'rocket_launcher';
  if (SHOTGUN_SUBTYPES.has(itemSubType)) return 'shotgun';
  if (SNIPER_SUBTYPES.has(itemSubType))  return 'sniper_rifle';
  if (SWORD_SUBTYPES.has(itemSubType))   return 'sword';
  if (TRACE_SUBTYPES.has(itemSubType))   return 'flamethrower';
  return null;
}

export const ARCHETYPE_LABELS: Record<SupportedArchetype, string> = {
  rocket_launcher: 'Rocket Launcher',
  shotgun:         'Shotgun',
  sniper_rifle:    'Sniper Rifle',
  sword:           'Sword',
  flamethrower:    'Trace Rifle',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Safe stat read with fallback */
function st(stats: StatMap, key: string, fallback: number): number {
  return stats[key] ?? fallback;
}

/**
 * Resolve a representative crit damage value for the weapon.
 *
 * Priority:
 *   1. archetypes.json  — has per-frame PvE/PvP crit values (shotgun, sniper, trace)
 *   2. weaponStats.json — per-tick/per-round crit (used for trace DPS calculation)
 *   3. Impact-stat fallback — for rocket launchers and swords
 */
function resolveBaseDamage(
  weapon: D2Weapon,
  mode: GameMode,
  multiplier: number,
): number {
  // 1. Archetype table (subtypes 7, 12, 29 are covered here)
  const archData = getArchetype(weapon.itemSubType, weapon.rpm);
  if (archData) {
    const crit = mode === 'pve' ? archData.pve.crit : archData.pvp.crit;
    return crit * multiplier;
  }

  // 2. WeaponStats lookup (covers trace rifles when archetype table misses)
  const entry = lookupWeaponStat(
    weapon.itemSubType,
    weapon.ammoType,
    weapon.intrinsicTrait?.name ?? null,
  );
  if (entry) {
    const pveScalar = mode === 'pve' ? 3.0 : 1.0;
    // For trace rifles: multiply per-tick crit by ticks-per-second (rpm / 60)
    const ticksPerSec = TRACE_SUBTYPES.has(weapon.itemSubType)
      ? Math.max(1, weapon.rpm / 60)
      : 1;
    return entry.critDamage * ticksPerSec * pveScalar * multiplier;
  }

  // 3. Impact-stat proxy for rockets and swords
  const impact     = st(weapon.baseStats, 'Impact', 50);
  const pveScalar  = mode === 'pve' ? 3.0 : 1.0;

  if (ROCKET_SUBTYPES.has(weapon.itemSubType)) {
    return (100 + impact * 8) * pveScalar * multiplier;
  }
  if (SWORD_SUBTYPES.has(weapon.itemSubType)) {
    return (50 + impact * 4) * pveScalar * multiplier;
  }

  return 100 * pveScalar * multiplier;
}

// ── Stat-block builders ───────────────────────────────────────────────────────

function buildRocketStats(stats: StatMap): RocketLauncherStats {
  return new RocketLauncherStats(
    clamp(1 + st(stats, 'Blast Radius', 50) / 100 * 12, 0.5, 13),      // 0.5–13 m
    clamp(15 + st(stats, 'Velocity', 50) / 100 * 65, 1, 80),            // 1–80 m/s
    clamp(st(stats, 'Tracking', 0), 0, 100),                            // 0–100
    Math.max(1, Math.round(st(stats, 'Magazine', 1))),                   // ≥1
    clamp(5.5 - st(stats, 'Reload Speed', 50) / 100 * 3.5, 0.5, 5.5),  // 0.5–5.5 s
  );
}

function buildShotgunStats(weapon: D2Weapon, stats: StatMap): ShotgunStats {
  // Pellet count from the weapon-stat database; fall back to 8 (common default)
  const entry   = lookupWeaponStat(weapon.itemSubType, weapon.ammoType, weapon.intrinsicTrait?.name ?? null);
  const pellets = Math.max(1, entry?.shotsPerBurst ?? 8);
  return new ShotgunStats(
    pellets,
    clamp((1 - st(stats, 'Stability', 50) / 100) * 35, 0, 44),          // 0–44°
    clamp(3 + st(stats, 'Range', 50) / 100 * 22, 0.5, 25),              // 0.5–25 m
    Math.max(1, Math.round(st(stats, 'Magazine', 4))),                   // ≥1
    clamp(5.5 - st(stats, 'Reload Speed', 50) / 100 * 3.5, 0.5, 5.5),  // 0.5–5.5 s
    'shell-by-shell',
  );
}

function buildSniperStats(weapon: D2Weapon, stats: StatMap): SniperRifleStats {
  const entry       = lookupWeaponStat(weapon.itemSubType, weapon.ammoType, weapon.intrinsicTrait?.name ?? null);
  const chamberTime = entry?.shotDelay ? clamp(entry.shotDelay / 30, 0.1, 3) : 0.8;
  return new SniperRifleStats(
    clamp(st(stats, 'Zoom', 20) / 10, 1, 8),                            // 1–8×
    clamp(st(stats, 'Aim Assistance', 50), 0, 100),                     // 0–100
    clamp(st(stats, 'Recoil Direction', 70), 0, 100),                   // 0–100
    chamberTime,
    Math.max(1, Math.round(st(stats, 'Magazine', 3))),                   // ≥1
    clamp(5 - st(stats, 'Reload Speed', 50) / 100 * 3, 0.5, 5),        // 0.5–5 s
  );
}

function buildSwordStats(stats: StatMap): SwordStats {
  const swingSpeed = st(stats, 'Swing Speed', st(stats, 'Handling', 50));
  return new SwordStats(
    clamp(60 + swingSpeed / 100 * 180, 1, 360),                                         // 60–240°
    clamp(st(stats, 'Guard Efficiency', 60), 0, 100),                                   // 0–100
    clamp(0.8 + swingSpeed / 100 * 0.5, 0.1, 2),                                       // 0.8–1.3×
    Math.max(1, Math.round(st(stats, 'Ammo Capacity', st(stats, 'Magazine', 40)))),     // ≥1
    clamp(1.5 + st(stats, 'Impact', 50) / 100 * 3, 0.5, 5),                            // 0.5–5 m
  );
}

function buildFlameThrowerStats(stats: StatMap, baseDamage: number): FlameThrowerStats {
  return new FlameThrowerStats(
    clamp(1.5 + st(stats, 'Stability', 50) / 100 * 3.5, 0.5, 5),       // 0.5–5 s burn
    clamp(baseDamage * 0.12, 1, 1e6),                                   // 12% DPS as DoT
    clamp(10 + st(stats, 'Range', 50) / 100 * 25, 1, 35),              // 1–35 m
    Math.max(1, Math.round(st(stats, 'Magazine', 25))),                  // ≥1
    clamp(5 - st(stats, 'Reload Speed', 50) / 100 * 3, 0.5, 5),        // 0.5–5 s
    clamp(0.5 + st(stats, 'Stability', 50) / 100 * 2.5, 0.1, 5),       // 0.1–3 m width
  );
}

// ── Combat context builders ───────────────────────────────────────────────────

function makeEntities(positions: [number, number, number][]): Entity[] {
  return positions.map((pos, i) => ({
    id: `enemy_${String(i + 1).padStart(2, '0')}`,
    position: { x: pos[0], y: pos[1], z: pos[2] },
    currentHp: 500,
  }));
}

function rocketCtx(r: number): CombatContext {
  return {
    targetPosition: { x: 0, y: 0, z: 0 },
    allEntities: makeEntities([[0, 0, 0], [r * 0.5, 0, 0], [r * 0.85, 0, 0]]),
  };
}

function shotgunCtx(effectiveRange: number): CombatContext {
  const d = effectiveRange * 0.5;
  return {
    targetPosition: { x: d, y: 0, z: 0 },
    allEntities: makeEntities([[d, 0, 0]]),
  };
}

function sniperCtx(): CombatContext {
  return {
    targetPosition: { x: 50, y: 0, z: 0 },
    allEntities: makeEntities([[50, 0, 0]]),
  };
}

function swordCtx(reach: number): CombatContext {
  return {
    targetPosition: { x: 0, y: 0, z: 0 },
    allEntities: makeEntities([[reach * 0.3, 0, 0], [reach * 0.8, 0, 0]]),
  };
}

function traceCtx(streamRange: number): CombatContext {
  return {
    targetPosition: { x: 0, y: 0, z: 0 },
    allEntities: makeEntities([[streamRange * 0.4, 0, 0], [streamRange * 0.75, 0, 0]]),
  };
}

// ── Key stat summaries ────────────────────────────────────────────────────────

function rocketKeyStats(s: RocketLauncherStats): KeyStat[] {
  return [
    { label: 'Blast Radius', value: `${s.blastRadius.toFixed(1)} m`     },
    { label: 'Velocity',     value: `${s.projectileVelocity.toFixed(0)} m/s` },
    { label: 'Tracking',     value: `${s.trackingStrength.toFixed(0)}%` },
    { label: 'Reload',       value: `${s.reloadTime.toFixed(1)} s`      },
  ];
}

function shotgunKeyStats(s: ShotgunStats): KeyStat[] {
  return [
    { label: 'Pellets',  value: `${s.pelletCount}`                      },
    { label: 'Spread',   value: `${s.spreadAngle.toFixed(1)}°`          },
    { label: 'Range',    value: `${s.effectiveRange.toFixed(1)} m`      },
    { label: 'Magazine', value: `${s.magazineSize}`                     },
  ];
}

function sniperKeyStats(s: SniperRifleStats): KeyStat[] {
  return [
    { label: 'Scope',      value: `${s.scopeMagnification.toFixed(1)}×` },
    { label: 'Aim Assist', value: `${s.aimAssist.toFixed(0)}`           },
    { label: 'Chamber',    value: `${s.chamberTime.toFixed(2)} s`       },
    { label: 'Magazine',   value: `${s.magazineSize}`                   },
  ];
}

function swordKeyStats(s: SwordStats): KeyStat[] {
  return [
    { label: 'Arc',       value: `${s.swingArcDegrees.toFixed(0)}°`    },
    { label: 'Guard',     value: `${s.guardEfficiency.toFixed(0)}%`     },
    { label: 'Reach',     value: `${s.reach.toFixed(1)} m`              },
    { label: 'Capacity',  value: `${s.ammoCapacity}`                    },
  ];
}

function traceKeyStats(s: FlameThrowerStats): KeyStat[] {
  return [
    { label: 'DoT/s',    value: `${s.burnDamagePerSecond.toFixed(0)}`  },
    { label: 'Duration', value: `${s.burnDuration.toFixed(1)} s`       },
    { label: 'Range',    value: `${s.streamRange.toFixed(1)} m`        },
    { label: 'Width',    value: `${s.streamWidth.toFixed(1)} m`        },
  ];
}

// ── D2WeaponTier helper ───────────────────────────────────────────────────────

function resolveWeaponTier(rarity: string | null): 'common' | 'rare' | 'legendary' | 'exotic' {
  const r = rarity?.toLowerCase() ?? '';
  if (r === 'exotic')    return 'exotic';
  if (r === 'legendary') return 'legendary';
  if (r === 'rare')      return 'rare';
  return 'common';
}

// ── Main public function ──────────────────────────────────────────────────────

/**
 * Build a DamageProfileResult for the given D2 weapon, or null if the archetype
 * is not supported by the weapon-system module.
 *
 * All stat-block values are derived from D2's 0-100 stat bars and scaled to
 * physically meaningful units.  The combat result reflects active perk/buff
 * multipliers via the `multiplier` parameter.
 */
export function buildDamageProfile(
  d2Weapon: D2Weapon,
  calcStats: StatMap,
  mode: GameMode,
  multiplier: number,
): DamageProfileResult | null {
  const archetype = detectArchetype(d2Weapon.itemSubType);
  if (!archetype) return null;

  const baseDamage = resolveBaseDamage(d2Weapon, mode, multiplier);
  if (baseDamage <= 0) return null;

  const base = {
    name:       d2Weapon.name,
    baseDamage,
    weight:     5,
    durability: 100,
    tier:       resolveWeaponTier(d2Weapon.rarity),
  } as const;

  try {
    if (archetype === 'rocket_launcher') {
      const ws = buildRocketStats(calcStats);
      const w  = WeaponFactory.create(base, ws);
      const r  = combat.resolveHit(w as Weapon<StatBlock>, rocketCtx(ws.blastRadius));
      return {
        archetype,
        archetypeLabel: ARCHETYPE_LABELS.rocket_launcher,
        result:         r,
        scenarioLabel:  `Direct hit + 2 targets in ${ws.blastRadius.toFixed(1)} m blast`,
        keyStats:       rocketKeyStats(ws),
      };
    }

    if (archetype === 'shotgun') {
      const ws = buildShotgunStats(d2Weapon, calcStats);
      const w  = WeaponFactory.create(base, ws);
      const r  = combat.resolveHit(w as Weapon<StatBlock>, shotgunCtx(ws.effectiveRange));
      return {
        archetype,
        archetypeLabel: ARCHETYPE_LABELS.shotgun,
        result:         r,
        scenarioLabel:  `Single target at ${(ws.effectiveRange * 0.5).toFixed(1)} m (half effective range)`,
        keyStats:       shotgunKeyStats(ws),
      };
    }

    if (archetype === 'sniper_rifle') {
      const ws = buildSniperStats(d2Weapon, calcStats);
      const w  = WeaponFactory.create(base, ws);
      const r  = combat.resolveHit(w as Weapon<StatBlock>, sniperCtx());
      return {
        archetype,
        archetypeLabel: ARCHETYPE_LABELS.sniper_rifle,
        result:         r,
        scenarioLabel:  'Single target at 50 m (scoped)',
        keyStats:       sniperKeyStats(ws),
      };
    }

    if (archetype === 'sword') {
      const ws = buildSwordStats(calcStats);
      const w  = WeaponFactory.create(base, ws);
      const r  = combat.resolveHit(w as Weapon<StatBlock>, swordCtx(ws.reach));
      return {
        archetype,
        archetypeLabel: ARCHETYPE_LABELS.sword,
        result:         r,
        scenarioLabel:  `${ws.swingArcDegrees.toFixed(0)}° swing, 2 enemies within ${ws.reach.toFixed(1)} m`,
        keyStats:       swordKeyStats(ws),
      };
    }

    // flamethrower / trace rifle
    const ws = buildFlameThrowerStats(calcStats, baseDamage);
    const w  = WeaponFactory.create(base, ws);
    const r  = combat.resolveHit(w as Weapon<StatBlock>, traceCtx(ws.streamRange));
    return {
      archetype:      'flamethrower',
      archetypeLabel: ARCHETYPE_LABELS.flamethrower,
      result:         r,
      scenarioLabel:  `2 targets in ${ws.streamRange.toFixed(1)} m stream (${ws.burnDuration.toFixed(1)} s DoT)`,
      keyStats:       traceKeyStats(ws),
    };

  } catch (err) {
    if (err instanceof StatValidationError) {
      console.warn('[DamageProfile] StatValidationError:', err.message);
    }
    return null;
  }
}
