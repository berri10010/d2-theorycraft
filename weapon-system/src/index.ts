// ─────────────────────────────────────────────────────────────────────────────
// index.ts — Public API, bootstrap wiring, and usage examples.
//
// Import from this file exclusively; never import from internal modules
// directly in consumer code.
// ─────────────────────────────────────────────────────────────────────────────

// ── Public re-exports ────────────────────────────────────────────────────────

export { Weapon, StatValidationError }    from "./types/core";
export type { BaseWeaponStats, StatBlock, WeaponTier } from "./types/core";

export { RocketLauncherStats }            from "./stats/RocketLauncherStats";
export { ShotgunStats }                   from "./stats/ShotgunStats";
export { SniperRifleStats }               from "./stats/SniperRifleStats";
export { SwordStats }                     from "./stats/SwordStats";
export { FlameThrowerStats }              from "./stats/FlameThrowerStats";

export type { DamageStrategy, DamageResult, CombatContext, Entity, Vector3 }
  from "./strategies/DamageStrategy";

export { WeaponFactory }                  from "./factory/WeaponFactory";
export { CombatManager }                  from "./combat/CombatManager";

// ── Bootstrap: pre-wired singleton ───────────────────────────────────────────
//
// `combat` is the ready-to-use global instance.  All five archetypes are
// registered.  Import and call `combat.resolveHit(weapon, context)` from
// anywhere in your game code.

import { CombatManager }           from "./combat/CombatManager";
import { RocketLauncherStrategy }  from "./strategies/RocketLauncherStrategy";
import { ShotgunStrategy }         from "./strategies/ShotgunStrategy";
import { SniperRifleStrategy }     from "./strategies/SniperRifleStrategy";
import { SwordStrategy }           from "./strategies/SwordStrategy";
import { FlameThrowerStrategy }    from "./strategies/FlameThrowerStrategy";

export const combat = new CombatManager()
  .register("rocket_launcher", new RocketLauncherStrategy())
  .register("shotgun",         new ShotgunStrategy())
  .register("sniper_rifle",    new SniperRifleStrategy())
  .register("sword",           new SwordStrategy())
  .register("flamethrower",    new FlameThrowerStrategy());

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES (safe to delete — here for documentation)
// ─────────────────────────────────────────────────────────────────────────────

import { StatValidationError as SVE } from "./types/core";
import { WeaponFactory }           from "./factory/WeaponFactory";
import { RocketLauncherStats }     from "./stats/RocketLauncherStats";
import { ShotgunStats }            from "./stats/ShotgunStats";
import { SniperRifleStats }        from "./stats/SniperRifleStats";
import { SwordStats }              from "./stats/SwordStats";
import { FlameThrowerStats }       from "./stats/FlameThrowerStats";

function buildExampleWeapons() {
  // ── Rocket Launcher ─────────────────────────────────────────────────────────
  const gjallarhorn = WeaponFactory.create(
    { name: "Gjallarhorn", baseDamage: 9200, weight: 8.4, durability: 100, tier: "exotic" },
    new RocketLauncherStats(
      6.5,   // blastRadius (metres)
      45,    // projectileVelocity (m/s)
      85,    // trackingStrength
      1,     // magazineSize
      3.2,   // reloadTime (seconds)
    ),
  );
  // TypeScript knows this is Weapon<RocketLauncherStats>
  // gjallarhorn.stats.blastRadius  ← fully typed ✓
  // gjallarhorn.stats.pelletCount  ← compile error ✗

  // ── Shotgun ─────────────────────────────────────────────────────────────────
  const trenchgun = WeaponFactory.create(
    { name: "Trench Shotgun Mk.II", baseDamage: 620, weight: 4.1, durability: 87, tier: "rare" },
    new ShotgunStats(
      12,             // pelletCount
      18,             // spreadAngle (degrees)
      20,             // effectiveRange (metres)
      8,              // magazineSize
      2.4,            // reloadTime
      "shell-by-shell",
    ),
  );

  // ── Sniper Rifle ────────────────────────────────────────────────────────────
  const longwatch = WeaponFactory.create(
    { name: "Longwatch SR-7", baseDamage: 4400, weight: 6.2, durability: 92, tier: "legendary" },
    new SniperRifleStats(
      8,    // scopeMagnification
      72,   // aimAssist
      65,   // flinchResist
      1.1,  // chamberTime (seconds)
      5,    // magazineSize
      3.8,  // reloadTime
    ),
  );

  // ── Sword ───────────────────────────────────────────────────────────────────
  const dawnblade = WeaponFactory.create(
    { name: "Dawnblade", baseDamage: 1800, weight: 2.3, durability: 100, tier: "exotic" },
    new SwordStats(
      120,   // swingArcDegrees
      80,    // guardEfficiency
      1.15,  // chargeMoveSpeed
      60,    // ammoCapacity (swings)
      2.1,   // reach (metres)
    ),
  );

  // ── FlameThrower ────────────────────────────────────────────────────────────
  const pyrowave = WeaponFactory.create(
    { name: "Pyrowave MkIII", baseDamage: 350, weight: 9.0, durability: 75, tier: "rare" },
    new FlameThrowerStats(
      5,     // burnDuration (seconds)
      80,    // burnDamagePerSecond
      12,    // streamRange (metres)
      30,    // fuelCapacity (seconds)
      4.5,   // refuelTime
      2.5,   // streamWidth (metres)
    ),
  );

  return { gjallarhorn, trenchgun, longwatch, dawnblade, pyrowave };
}

function runExampleCombat() {
  const { gjallarhorn, trenchgun, dawnblade } = buildExampleWeapons();

  const mockEntities = [
    { id: "enemy_01", position: { x:  0, y: 0, z:  0 }, currentHp: 500 },
    { id: "enemy_02", position: { x:  3, y: 0, z:  1 }, currentHp: 300 },
    { id: "enemy_03", position: { x: 10, y: 0, z: -2 }, currentHp: 300 },
  ];

  const blastEpicenter = { x: 0, y: 0, z: 0 };
  const context = { targetPosition: blastEpicenter, allEntities: mockEntities };

  const rocketResult = combat.resolveHit(gjallarhorn, context);
  console.log(rocketResult.summary);
  // "RocketLauncher: 1916.7 direct + 1380.0 splash across 2 targets (r=6.5m, v=45m/s)"

  const shotgunResult = combat.resolveHit(trenchgun, context);
  console.log(shotgunResult.summary);
  // "Shotgun: 8/12 pellets landed on enemy_01 = 413.3 dmg (range falloff: 100%, spread: 18°)"

  const swordResult = combat.resolveHit(dawnblade, context);
  console.log(swordResult.summary);
  // "Sword: 1 target(s) hit within 2.1m arc (120°) — 1800.0 total dmg"
}

// ── Validation guard example ─────────────────────────────────────────────────

function showValidationGuard() {
  try {
    WeaponFactory.create(
      { name: "Broken Launcher", baseDamage: 500, weight: 3, durability: 100, tier: "common" },
      new RocketLauncherStats(
        -5,   // ← invalid: blast radius cannot be negative
        30, 50, 1, 2,
      ),
    );
  } catch (e) {
    if (e instanceof SVE) {
      console.error(e.message);
      // "[StatValidation] blastRadius must be positive (field: "blastRadius", received: -5)"
    }
  }
}
