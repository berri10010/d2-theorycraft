import { GameMode } from '../types/weapon';
import { getArchetype, ArchetypeDamage } from './archetypes';

export interface TTKResult {
  ttk: number;
  shotsToKill: number;
  crits: number;
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
 * Calculates PvP TTK against a guardian at the given HP value.
 * hp is passed directly (use the RESILIENCE_HP table in the UI layer, not here).
 * Returns null if the archetype is unknown.
 */
export function calculatePvpTTK(
  subType: number,
  rpm: number,
  hp: number,
  damageMultiplier: number
): TTKResult | null {
  const archetype = getArchetype(subType, rpm);
  if (!archetype) return null;

  const { crit, body, burstSize } = archetype.pvp;

  const scaledCrit = crit * damageMultiplier;
  const scaledBody = body * damageMultiplier;

  // Find fewest shots with optimal crit-heavy pattern
  for (let totalShots = burstSize; totalShots <= 20 * burstSize; totalShots += burstSize) {
    for (let crits = totalShots; crits >= 0; crits--) {
      const bodies = totalShots - crits;
      const totalDamage = crits * scaledCrit + bodies * scaledBody;
      if (totalDamage >= hp) {
        const realShots = totalShots / burstSize;
        const ttk = (realShots - 1) * calculateTimePerShot(rpm);
        const critStr = crits > 0 ? `${crits}C` : '';
        const bodyStr = bodies > 0 ? `${bodies}B` : '';
        return {
          ttk: Math.round(ttk * 1000) / 1000,
          shotsToKill: realShots,
          crits,
          bodies,
          optimalPattern: [critStr, bodyStr].filter(Boolean).join('+'),
        };
      }
    }
  }

  return null;
}

/**
 * Calculates PvE TTK against a given enemy health tier.
 * Returns null if the archetype is unknown.
 */
export function calculatePveTTK(
  subType: number,
  rpm: number,
  enemyHealth: number,
  damageMultiplier: number
): TTKResult | null {
  const archetype = getArchetype(subType, rpm);
  if (!archetype) return null;

  const { crit, body, burstSize } = archetype.pve;
  const scaledCrit = crit * damageMultiplier;
  const scaledBody = body * damageMultiplier;

  const critsNeeded = Math.ceil(enemyHealth / scaledCrit);
  const totalDamageAllCrits = critsNeeded * scaledCrit;
  const realShots = Math.ceil(critsNeeded / burstSize);
  const ttk = (realShots - 1) * calculateTimePerShot(rpm);

  return {
    ttk: Math.round(ttk * 1000) / 1000,
    shotsToKill: realShots,
    crits: critsNeeded,
    bodies: 0,
    optimalPattern: `${critsNeeded}C (all crits)`,
  };
}

export function calculateTTK(
  mode: GameMode,
  subType: number,
  rpm: number,
  damageMultiplier: number,
  /** PvP: direct guardian HP (192–230). PvE: unused. */
  guardianHpOrResilience: number,
  enemyHealth: number
): TTKResult | null {
  if (mode === 'pvp') {
    return calculatePvpTTK(subType, rpm, guardianHpOrResilience, damageMultiplier);
  }
  return calculatePveTTK(subType, rpm, enemyHealth, damageMultiplier);
}
