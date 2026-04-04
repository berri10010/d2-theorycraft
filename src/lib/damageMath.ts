import { GameMode } from '../types/weapon';
import { getArchetype } from './archetypes';

export interface TTKResult {
  ttk: number;
  shotsToKill: number;
  /** Headshot (crit) count in the optimal kill pattern */
  crits: number;
  /** Bodyshot count in the optimal kill pattern */
  bodies: number;
  optimalPattern: string;
}

/** PvE enemy health tiers — add more as needed */
export const PVE_HEALTH_TIERS: Record<string, number> = {
  'Minor (Dreg/Grunt)': 336,
  'Major (Elite)': 1344,
  'Champion': 3024,
};

export function calculateTimePerShot(rpm: number): number {
  return 60 / rpm;
}

export function calculateShotsToKill(damagePerShot: number, targetHealth: number): number {
  return Math.ceil(targetHealth / damagePerShot);
}

/**
 * Time between consecutive trigger pulls for a given weapon.
 * For single-fire weapons (burstSize === 1) this equals 60/rpm.
 * For burst weapons the cadence between pulls is longer:
 *   e.g. a 390 RPM 3-burst fires 390 rounds/min total, but only 130 bursts/min,
 *   so the interval between pulls = 60 * 3 / 390 ≈ 0.46 s (not 60/390 ≈ 0.15 s).
 */
export function timePerBurst(rpm: number, burstSize: number): number {
  return (60 * burstSize) / rpm;
}

/**
 * Find the fewest shots (expressed as individual rounds) whose optimal
 * crit-heavy combination meets or exceeds `targetHealth`.
 * Returns [totalRounds, crits, bodies] or null if none found within the cap.
 *
 * Iterates in multiples of burstSize so partial bursts are never counted.
 */
function findOptimalPattern(
  scaledCrit: number,
  scaledBody: number,
  burstSize: number,
  targetHealth: number,
  maxBursts = 50,
): [totalRounds: number, crits: number, bodies: number] | null {
  for (let rounds = burstSize; rounds <= maxBursts * burstSize; rounds += burstSize) {
    // Maximise crits first (fewest shots + most crit-forward pattern)
    for (let crits = rounds; crits >= 0; crits--) {
      const bodies = rounds - crits;
      if (crits * scaledCrit + bodies * scaledBody >= targetHealth) {
        return [rounds, crits, bodies];
      }
    }
  }
  return null;
}

/** Format a crit/body pattern as "2× Head + 1× Body", "3× Head", etc. */
function fmtPattern(crits: number, bodies: number): string {
  const parts: string[] = [];
  if (crits > 0) parts.push(`${crits}× Head`);
  if (bodies > 0) parts.push(`${bodies}× Body`);
  return parts.join(' + ') || '—';
}

/**
 * Calculates PvP TTK against a guardian at the given HP value.
 * hp is passed directly (use the RESILIENCE_HP table in the UI layer, not here).
 * Returns null if the archetype is unknown.
 */
export function calculatePvpTTK(
  subType: number,
  rpm: number,
  hp: number,
  damageMultiplier: number,
): TTKResult | null {
  const archetype = getArchetype(subType, rpm);
  if (!archetype) return null;

  const { crit, body, burstSize } = archetype.pvp;
  const scaledCrit = crit * damageMultiplier;
  const scaledBody = body * damageMultiplier;

  const found = findOptimalPattern(scaledCrit, scaledBody, burstSize, hp);
  if (!found) return null;

  const [totalRounds, crits, bodies] = found;
  const realShots = totalRounds / burstSize; // number of trigger pulls / bursts
  const ttk = (realShots - 1) * timePerBurst(rpm, burstSize);

  return {
    ttk: Math.round(ttk * 1000) / 1000,
    shotsToKill: realShots,
    crits,
    bodies,
    optimalPattern: fmtPattern(crits, bodies),
  };
}

/**
 * Calculates PvE TTK against a given enemy health tier.
 * Uses the same optimal crit-heavy algorithm as PvP, so the result
 * reflects the minimum number of headshots needed (not "all crits" assumed).
 * Returns null if the archetype is unknown.
 */
export function calculatePveTTK(
  subType: number,
  rpm: number,
  enemyHealth: number,
  damageMultiplier: number,
): TTKResult | null {
  const archetype = getArchetype(subType, rpm);
  if (!archetype) return null;

  const { crit, body, burstSize } = archetype.pve;
  const scaledCrit = crit * damageMultiplier;
  const scaledBody = body * damageMultiplier;

  const found = findOptimalPattern(scaledCrit, scaledBody, burstSize, enemyHealth);
  if (!found) return null;

  const [totalRounds, crits, bodies] = found;
  const realShots = totalRounds / burstSize;
  const ttk = (realShots - 1) * timePerBurst(rpm, burstSize);

  return {
    ttk: Math.round(ttk * 1000) / 1000,
    shotsToKill: realShots,
    crits,
    bodies,
    optimalPattern: fmtPattern(crits, bodies),
  };
}

export function calculateTTK(
  mode: GameMode,
  subType: number,
  rpm: number,
  damageMultiplier: number,
  /** PvP: direct guardian HP (192–230). PvE: unused. */
  guardianHpOrResilience: number,
  enemyHealth: number,
): TTKResult | null {
  if (mode === 'pvp') {
    return calculatePvpTTK(subType, rpm, guardianHpOrResilience, damageMultiplier);
  }
  return calculatePveTTK(subType, rpm, enemyHealth, damageMultiplier);
}
