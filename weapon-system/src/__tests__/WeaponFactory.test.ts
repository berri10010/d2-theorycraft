import { WeaponFactory } from "../factory/WeaponFactory";
import { StatValidationError } from "../types/core";
import { RocketLauncherStats } from "../stats/RocketLauncherStats";
import { ShotgunStats } from "../stats/ShotgunStats";
import { SniperRifleStats } from "../stats/SniperRifleStats";
import { SwordStats } from "../stats/SwordStats";
import { FlameThrowerStats } from "../stats/FlameThrowerStats";

const validBase = {
  name: "Test Weapon",
  baseDamage: 1000,
  weight: 5.0,
  durability: 100,
  tier: "legendary" as const,
};

const validRocketStats = () =>
  new RocketLauncherStats(6.5, 45, 85, 1, 3.2);

describe("WeaponFactory.create()", () => {
  describe("base stat validation", () => {
    it("creates a valid weapon", () => {
      const w = WeaponFactory.create(validBase, validRocketStats());
      expect(w.base.name).toBe("Test Weapon");
      expect(w.stats.archetype).toBe("rocket_launcher");
    });

    it("throws on empty name", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, name: "" }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on whitespace-only name", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, name: "   " }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on zero baseDamage", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, baseDamage: 0 }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on negative baseDamage", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, baseDamage: -1 }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on zero weight", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, weight: 0 }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on durability above 100", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, durability: 101 }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("throws on negative durability", () => {
      expect(() =>
        WeaponFactory.create({ ...validBase, durability: -1 }, validRocketStats()),
      ).toThrow(StatValidationError);
    });

    it("allows durability = 0 (broken weapon)", () => {
      const w = WeaponFactory.create({ ...validBase, durability: 0 }, validRocketStats());
      expect(w.base.durability).toBe(0);
    });

    it("throws on invalid tier", () => {
      expect(() =>
        WeaponFactory.create(
          { ...validBase, tier: "mythic" as never },
          validRocketStats(),
        ),
      ).toThrow(StatValidationError);
    });
  });

  describe("archetype stat validation delegation", () => {
    it("throws StatValidationError for invalid RocketLauncherStats (blastRadius ≤ 0)", () => {
      expect(() =>
        WeaponFactory.create(validBase, new RocketLauncherStats(0, 45, 85, 1, 3.2)),
      ).toThrow(StatValidationError);
    });

    it("throws StatValidationError for invalid ShotgunStats (pelletCount < 1)", () => {
      expect(() =>
        WeaponFactory.create(validBase, new ShotgunStats(0, 10, 15, 4, 2.5, "shell-by-shell")),
      ).toThrow(StatValidationError);
    });

    it("throws StatValidationError for invalid SniperRifleStats (scopeMagnification < 1)", () => {
      expect(() =>
        WeaponFactory.create(validBase, new SniperRifleStats(0.5, 70, 60, 1.5, 5, 3.8)),
      ).toThrow(StatValidationError);
    });

    it("throws StatValidationError for invalid SwordStats (swingArcDegrees = 0)", () => {
      expect(() =>
        WeaponFactory.create(validBase, new SwordStats(0, 50, 1.0, 60, 2.5)),
      ).toThrow(StatValidationError);
    });

    it("throws StatValidationError for invalid FlameThrowerStats (burnDuration ≤ 0)", () => {
      expect(() =>
        WeaponFactory.create(validBase, new FlameThrowerStats(0, 50, 10, 100, 4.0, 3)),
      ).toThrow(StatValidationError);
    });
  });

  describe("weapon immutability", () => {
    it("base stats are frozen", () => {
      const w = WeaponFactory.create(validBase, validRocketStats());
      expect(() => {
        (w.base as { name: string }).name = "mutated";
      }).toThrow();
    });
  });
});
