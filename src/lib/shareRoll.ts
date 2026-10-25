import type { Weapon, GameMode } from '../types/weapon';

export interface RollState {
  weapon: Weapon;
  /** column name → selected perk hash */
  selectedPerks: Record<string, string>;
  mode: GameMode;
  masterworkStat: string | null;
  weaponsStat: number;
  activeBuffs: string[];
  weaponTier: number;
  /** An exotic's catalyst is marked complete. */
  catalystActive?: boolean;
}

/**
 * Query params that fully describe a roll. Used for permalinks and for keeping the
 * address bar in sync. The editor reads these back (w, p, m, mw, ws, b, tier, cat).
 */
export function buildRollParams(roll: RollState): URLSearchParams {
  const { weapon, selectedPerks, mode, masterworkStat, weaponsStat, activeBuffs, weaponTier, catalystActive } = roll;
  const params = new URLSearchParams({ w: weapon.hash });
  // Human-readable slug makes shared URLs legible (e.g. ?w=123&name=the-messenger).
  // The slug is decorative — the editor always resolves via the hash.
  params.set('name', weapon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const perkHashes = Object.values(selectedPerks);
  if (perkHashes.length) params.set('p', perkHashes.join(','));
  params.set('m', mode);
  if (masterworkStat) params.set('mw', masterworkStat);
  if (weaponsStat !== 0) params.set('ws', String(weaponsStat));
  if (activeBuffs.length) params.set('b', activeBuffs.join(','));
  if (weaponTier !== 1) params.set('tier', String(weaponTier));
  if (catalystActive && weapon.catalyst) params.set('cat', '1');
  return params;
}

/**
 * A DIM wishlist line (plus a notes comment) for the given perks.
 * DIM expects perks ordered from the rightmost trait column back to the left,
 * with origin traits last.
 */
export function buildDimWishlistEntry(weapon: Weapon, perkHashes: string[]): string {
  const meta = new Map<string, { idx: number; isOrigin: boolean }>();
  weapon.perkSockets.forEach((col, idx) => {
    const isOrigin = col.columnType === 'origin';
    for (const p of col.perks) {
      meta.set(p.hash, { idx, isOrigin });
      if (p.enhancedVersion) meta.set(p.enhancedVersion.hash, { idx, isOrigin });
    }
  });

  const sorted = [...perkHashes].sort((a, b) => {
    const ma = meta.get(a), mb = meta.get(b);
    const aOrigin = ma?.isOrigin ?? false, bOrigin = mb?.isOrigin ?? false;
    if (aOrigin !== bOrigin) return aOrigin ? 1 : -1;
    return (mb?.idx ?? 0) - (ma?.idx ?? 0);
  });

  let entry = `dimwishlist:item=${weapon.hash}`;
  if (sorted.length) entry += `&perks=${sorted.join(',')}`;
  entry += `\n//notes:${weapon.name} — via D2 Theorycraft`;
  return entry;
}
