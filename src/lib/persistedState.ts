import { BUFF_DATABASE } from './buffDatabase';
import { PVE_HEALTH_TIERS } from './damageMath';
import { DIFFICULTY_OPTIONS } from './plDelta';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function intInRange(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined;
}

/**
 * The usable parts of the weapon store's saved state. localStorage can hold values from an older version or
 * hand-edited ones (an unknown difficulty, a null stat, a removed buff); anything unusable is left out so the
 * store's defaults apply, instead of the bad value reaching the calculators.
 */
export function sanitizePersistedWeaponState(saved: unknown): Record<string, unknown> {
  if (!isRecord(saved)) return {};
  const out: Record<string, unknown> = {};

  if (typeof saved.activeWeaponHash === 'string' || saved.activeWeaponHash === null) out.activeWeaponHash = saved.activeWeaponHash;
  if (saved.mode === 'pve' || saved.mode === 'pvp') out.mode = saved.mode;
  if (typeof saved.enemyTier === 'string' && saved.enemyTier in PVE_HEALTH_TIERS) out.enemyTier = saved.enemyTier;
  if (DIFFICULTY_OPTIONS.some((o) => o.key === saved.difficulty)) out.difficulty = saved.difficulty;

  const weaponsStat = intInRange(saved.weaponsStat, 0, 200);
  if (weaponsStat !== undefined) out.weaponsStat = weaponsStat;
  const powerDelta = intInRange(saved.powerDelta, -50, 30);
  if (powerDelta !== undefined) out.powerDelta = powerDelta;
  const surgeStacks = intInRange(saved.surgeStacks, 0, 4);
  if (surgeStacks !== undefined) out.surgeStacks = surgeStacks;

  if (Array.isArray(saved.activeBuffs)) {
    out.activeBuffs = saved.activeBuffs.filter((k): k is string => typeof k === 'string' && k in BUFF_DATABASE);
  }
  if (isRecord(saved.buffStacks)) {
    out.buffStacks = Object.fromEntries(
      Object.entries(saved.buffStacks).filter(([k, v]) => k in BUFF_DATABASE && typeof v === 'number' && Number.isFinite(v)),
    );
  }
  if (isRecord(saved.weaponRolls)) out.weaponRolls = saved.weaponRolls;
  return out;
}
