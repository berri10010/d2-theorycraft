import { WeaponFactory } from "../factory/WeaponFactory";
import { RocketLauncherStats } from "../stats/RocketLauncherStats";
import { ShotgunStats } from "../stats/ShotgunStats";
import { SniperRifleStats } from "../stats/SniperRifleStats";
import { SwordStats } from "../stats/SwordStats";
import { FlameThrowerStats } from "../stats/FlameThrowerStats";
import { RocketLauncherStrategy } from "../strategies/RocketLauncherStrategy";
import { ShotgunStrategy } from "../strategies/ShotgunStrategy";
import { SniperRifleStrategy } from "../strategies/SniperRifleStrategy";
import { SwordStrategy } from "../strategies/SwordStrategy";
import { FlameThrowerStrategy } from "../strategies/FlameThrowerStrategy";
import { CombatContext, Entity } from "../strategies/DamageStrategy";

// ── Shared helpers ────────────────────────────────────────────────────────────

const BASE = {
  name: "Test",
  baseDamage: 1000,
  weight: 5,
  durability: 100,
  tier: "legendary" as const,
};

function entity(id: string, x = 0, y = 0, z = 0): Entity {
  return { id, position: { x, y, z }, currentHp: 1000 };
}

const origin = { x: 0, y: 0, z: 0 };

// ── RocketLauncherStrategy ────────────────────────────────────────────────────

describe("RocketLauncherStrategy", () => {
  const strategy = new RocketLauncherStrategy();

  it("scales direct damage by velocity scalar (v=60 → scalar=1.0)", () => {
    const weapon = WeaponFactory.create(BASE, new RocketLauncherStats(5, 60, 0, 1, 3));
    const ctx: CombatContext = { targetPosition: origin, allEntities: [entity("t1")] };
    const result = strategy.compute(weapon, ctx);
    // velocity 60 / 60 = 1.0; directDamage = 1000 * 1.0
    expect(result.direct).toBeCloseTo(1000);
  });

  it("caps velocity scalar at 1.25 for very fast rockets", () => {
    const weapon = WeaponFactory.create(BASE, new RocketLauncherStats(5, 999, 0, 1, 3));
    const ctx: CombatContext = { targetPosition: origin, allEntities: [entity("t1")] };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1250);
  });

  it("applies quadratic splash falloff within blast radius", () => {
    // Two entities: one at origin (d=0), one at half-radius (d=2.5, r=5)
    const weapon = WeaponFactory.create(BASE, new RocketLauncherStats(5, 60, 0, 1, 3));
    const entities = [entity("epicenter", 0, 0, 0), entity("half", 2.5, 0, 0)];
    const ctx: CombatContext = { targetPosition: origin, allEntities: entities };
    const result = strategy.compute(weapon, ctx);

    // Epicenter: falloff = 1 - (0/5)² = 1.0 → splash = 1000 * 0.6 * 1.0 = 600
    // Half-radius: falloff = 1 - (2.5/5)² = 0.75 → splash = 1000 * 0.6 * 0.75 = 450
    expect(result.splash).toBeCloseTo(600 + 450);
    expect(result.affectedIds).toEqual(["epicenter", "half"]);
  });

  it("excludes entities outside blast radius from splash", () => {
    const weapon = WeaponFactory.create(BASE, new RocketLauncherStats(5, 60, 0, 1, 3));
    const entities = [entity("inside", 4, 0, 0), entity("outside", 10, 0, 0)];
    const ctx: CombatContext = { targetPosition: origin, allEntities: entities };
    const result = strategy.compute(weapon, ctx);
    expect(result.affectedIds).not.toContain("outside");
    expect(result.affectedIds).toContain("inside");
  });
});

// ── ShotgunStrategy ───────────────────────────────────────────────────────────

describe("ShotgunStrategy", () => {
  const strategy = new ShotgunStrategy();

  it("deals full damage at 0° spread within effective range", () => {
    // 0° spread → accuracy = 1.0; within range → rangeFalloff = 1.0
    const weapon = WeaponFactory.create(
      BASE, new ShotgunStats(8, 0, 20, 4, 2.5, "shell-by-shell"),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1", 5, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    // All 8 pellets land; damagePerPellet = 1000/8 = 125; direct = 125*8 = 1000
    expect(result.direct).toBeCloseTo(1000);
    expect(result.splash).toBe(0);
  });

  it("returns zero damage when there are no entities", () => {
    const weapon = WeaponFactory.create(
      BASE, new ShotgunStats(8, 10, 20, 4, 2.5, "full-mag"),
    );
    const ctx: CombatContext = { targetPosition: origin, allEntities: [] };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBe(0);
    expect(result.affectedIds).toHaveLength(0);
  });

  it("applies linear range falloff beyond effective range", () => {
    const weapon = WeaponFactory.create(
      BASE, new ShotgunStats(8, 0, 10, 4, 2.5, "shell-by-shell"),
    );
    // Target at 15m; effectiveRange = 10m; falloff = 1 - (15-10)/10 = 0.5
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("far", 15, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1000 * 0.5);
  });

  it("floors range falloff at 10% beyond 2× effective range", () => {
    const weapon = WeaponFactory.create(
      BASE, new ShotgunStats(8, 0, 10, 4, 2.5, "shell-by-shell"),
    );
    // Target at 100m, way beyond floor
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("vfar", 100, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1000 * 0.1);
  });
});

// ── SniperRifleStrategy ───────────────────────────────────────────────────────

describe("SniperRifleStrategy", () => {
  const strategy = new SniperRifleStrategy();

  it("deals baseDamage with no bonuses at aimAssist=50, scopeMagnification=1", () => {
    const weapon = WeaponFactory.create(
      BASE, new SniperRifleStats(1, 50, 60, 1.5, 5, 3.8),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1")],
    };
    const result = strategy.compute(weapon, ctx);
    // aimBonus = max(0, (50-50)/1000) = 0; scopeBonus = (1-1)*0.025 = 0
    expect(result.direct).toBeCloseTo(1000);
  });

  it("applies scope magnification bonus up to +10%", () => {
    // scopeMagnification = 5 → scopeBonus = min(0.10, (5-1)*0.025) = min(0.10, 0.10) = 0.10
    const weapon = WeaponFactory.create(
      BASE, new SniperRifleStats(5, 50, 60, 1.5, 5, 3.8),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1")],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1100);
  });

  it("applies aim assist bonus up to +5%", () => {
    // aimAssist = 100 → aimBonus = min(0.05, (100-50)/1000) = min(0.05, 0.05) = 0.05
    const weapon = WeaponFactory.create(
      BASE, new SniperRifleStats(1, 100, 60, 1.5, 5, 3.8),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1")],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1050);
  });

  it("returns zero damage with no entities", () => {
    const weapon = WeaponFactory.create(
      BASE, new SniperRifleStats(3, 70, 60, 1.5, 5, 3.8),
    );
    const ctx: CombatContext = { targetPosition: origin, allEntities: [] };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBe(0);
  });

  it("never deals splash damage", () => {
    const weapon = WeaponFactory.create(
      BASE, new SniperRifleStats(3, 70, 60, 1.5, 5, 3.8),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1"), entity("t2", 1, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.splash).toBe(0);
    expect(result.affectedIds).toHaveLength(1);
  });
});

// ── SwordStrategy ─────────────────────────────────────────────────────────────

describe("SwordStrategy", () => {
  const strategy = new SwordStrategy();

  it("hits a single target within reach", () => {
    const weapon = WeaponFactory.create(
      BASE, new SwordStats(90, 50, 1.0, 60, 3),
    );
    // Entity at 2m, reach = 3 → in range
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1", 2, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1000);
    expect(result.affectedIds).toContain("t1");
  });

  it("does not hit entities beyond reach", () => {
    const weapon = WeaponFactory.create(
      BASE, new SwordStats(360, 50, 1.0, 60, 2),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("far", 5, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBe(0);
    expect(result.affectedIds).toHaveLength(0);
  });

  it("hits multiple targets within reach and arc", () => {
    // 360° arc hits all in-reach targets
    const weapon = WeaponFactory.create(
      BASE, new SwordStats(360, 50, 1.0, 60, 5),
    );
    const entities = [
      entity("t1", 1, 0, 0),
      entity("t2", 2, 0, 0),
      entity("t3", 3, 0, 0),
    ];
    const ctx: CombatContext = { targetPosition: origin, allEntities: entities };
    const result = strategy.compute(weapon, ctx);
    expect(result.affectedIds).toHaveLength(3);
    // direct = 1000 (first target), splash = 2000 (remaining 2)
    expect(result.direct).toBeCloseTo(1000);
    expect(result.splash).toBeCloseTo(2000);
  });
});

// ── FlameThrowerStrategy ──────────────────────────────────────────────────────

describe("FlameThrowerStrategy", () => {
  const strategy = new FlameThrowerStrategy();

  it("deals direct + DoT to a single target in stream", () => {
    // burnDuration=3, burnDPS=200 → totalBurnDot = 600
    // baseDamage=1000, 1 target → directPerTarget = 1000
    // direct = 1000, splash (projected DoT) = 600
    const weapon = WeaponFactory.create(
      BASE, new FlameThrowerStats(3, 200, 10, 100, 4, 5),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("t1", 3, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1000);
    expect(result.splash).toBeCloseTo(600);
    expect(result.affectedIds).toContain("t1");
  });

  it("returns zero damage when no targets are in stream range", () => {
    const weapon = WeaponFactory.create(
      BASE, new FlameThrowerStats(3, 200, 10, 100, 4, 5),
    );
    const ctx: CombatContext = {
      targetPosition: origin,
      allEntities: [entity("far", 50, 0, 0)],
    };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBe(0);
    expect(result.affectedIds).toHaveLength(0);
  });

  it("splits direct damage across multiple targets in stream", () => {
    // 2 targets → directPerTarget = 1000 / 2 = 500 each → total direct = 1000
    const weapon = WeaponFactory.create(
      BASE, new FlameThrowerStats(2, 100, 10, 100, 4, 10),
    );
    const entities = [entity("t1", 2, 0, 0), entity("t2", 3, 0, 0)];
    const ctx: CombatContext = { targetPosition: origin, allEntities: entities };
    const result = strategy.compute(weapon, ctx);
    expect(result.direct).toBeCloseTo(1000);
  });
});
