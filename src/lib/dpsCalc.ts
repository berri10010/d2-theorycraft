// DPS calculation using weaponStats timing data and reloadTimes formulas.

import { lookupWeaponStat, isChargeWeapon, isBurstWeapon } from './weaponStats';
import { calcReloadTime } from './reloadTimes';
import { getCombatantScalar } from './damageMath';

export interface DpsResult {
  /** Continuous fire, all-crit (PvP damage). */
  optimalDpsPvp: number;
  /** Mag + reload cycle, all-crit (PvP damage). */
  sustainedDpsPvp: number;
  optimalDpsPve: number;
  sustainedDpsPve: number;
  bodyDamage: number;
  critDamage: number;
  /** Projectiles per trigger pull (>1 for burst/fusion/pellet shotgun). */
  burstSize: number;
  reloadMs: number | null;
  magSize: number;
  /** RPM derived from timing data. */
  rpm: number;
}

export function calcDps(
  itemSubType: number,
  ammoType: number,
  intrinsicName: string | null,
  itemTypeDisplayName: string,
  reloadStat: number,
  magStat: number,
  enemyTier = 'Major / Elite',
): DpsResult | null {
  const entry = lookupWeaponStat(itemSubType, ammoType, intrinsicName);
  if (!entry) return null;

  const burstSize = entry.shotsPerBurst ?? 1;
  const reloadMs  = calcReloadTime(itemTypeDisplayName, ammoType, reloadStat);
  const magSize   = Math.max(1, Math.round(magStat));

  // ── Time per trigger pull (seconds) ────────────────────────────────────────
  let timePerShot_s: number;

  if (isChargeWeapon(entry)) {
    const chargeS   = (entry.chargeMs ?? 500) / 1000;
    const betweenS  = entry.shotDelay != null ? entry.shotDelay / 30 : chargeS;
    timePerShot_s   = chargeS + betweenS;
  } else if (isBurstWeapon(entry)) {
    const intra  = entry.burstDelay ?? 1;
    const inter  = entry.shotDelay  ?? 1;
    const cycleF = (burstSize - 1) * intra + inter;
    timePerShot_s = cycleF / 30;
  } else {
    timePerShot_s = (entry.shotDelay ?? 30) / 30;
  }

  const rpm = Math.round(60 / timePerShot_s);

  // ── Optimal DPS (continuous fire, all crits) ───────────────────────────────
  const pveScalar      = getCombatantScalar(itemSubType, enemyTier, ammoType);
  const critPerTrigger = entry.critDamage * burstSize;
  const optimalDpsPvp  = critPerTrigger / timePerShot_s;
  const optimalDpsPve  = optimalDpsPvp * pveScalar;

  // ── Sustained DPS (mag + reload) ───────────────────────────────────────────
  let magDuration_s: number;
  let totalDmg: number;

  if (isChargeWeapon(entry)) {
    const chargeS  = (entry.chargeMs ?? 500) / 1000;
    const betweenS = entry.shotDelay != null ? entry.shotDelay / 30 : chargeS;
    // First shot: just charge. Subsequent shots: charge + gap between shots.
    magDuration_s = chargeS + (magSize - 1) * (chargeS + betweenS);
    totalDmg      = magSize * critPerTrigger;
  } else if (isBurstWeapon(entry)) {
    // The magazine stat counts individual rounds, and every bullet in a burst
    // spends one.  Walk the magazine bullet-by-bullet instead of treating each
    // round as a full burst (which over-counted both damage and time).
    const intraF     = entry.burstDelay ?? 1;
    const interF     = entry.shotDelay  ?? 1;
    const fullBursts = Math.floor((magSize - 1) / burstSize);
    const remainder  = (magSize - 1) % burstSize;
    const frames     = fullBursts * ((burstSize - 1) * intraF + interF) + remainder * intraF;
    magDuration_s = frames / 30;
    totalDmg      = magSize * entry.critDamage;
  } else {
    magDuration_s = (magSize - 1) * timePerShot_s;
    totalDmg      = magSize * critPerTrigger;
  }

  const reloadS        = reloadMs != null ? reloadMs / 1000 : 2.0;
  const cycleTime_s    = magDuration_s + reloadS;
  const sustainedDpsPvp = totalDmg / cycleTime_s;
  const sustainedDpsPve = sustainedDpsPvp * pveScalar;

  return {
    optimalDpsPvp:  Math.round(optimalDpsPvp),
    sustainedDpsPvp: Math.round(sustainedDpsPvp),
    optimalDpsPve:  Math.round(optimalDpsPve),
    sustainedDpsPve: Math.round(sustainedDpsPve),
    bodyDamage:  Math.round(entry.bodyDamage  * burstSize * 100) / 100,
    critDamage:  Math.round(entry.critDamage  * burstSize * 100) / 100,
    burstSize,
    reloadMs,
    magSize,
    rpm,
  };
}
