import type { StatMap } from '../types/weapon';
import type { TTKAmmo } from './damageMath';
import { calcReloadTime } from './reloadTimes';

/**
 * Magazine + reload speed for a weapon at its current stats, for reload-aware TTK.
 * Returns undefined when the magazine isn't known (reloads are then left out).
 */
export function ammoFromStats(
  weapon: { itemTypeDisplayName: string; ammoType: number },
  stats: StatMap,
): TTKAmmo | undefined {
  const magSize = stats['Magazine'];
  if (!magSize || magSize < 1) return undefined;
  const reloadStat = stats['Reload'];
  const reloadMs = reloadStat !== undefined
    ? calcReloadTime(weapon.itemTypeDisplayName, weapon.ammoType, reloadStat)
    : null;
  return { magSize, reloadSeconds: reloadMs === null ? null : reloadMs / 1000 };
}
