import type { Weapon } from '../types/weapon';

/**
 * Map a set of perk hashes (base or enhanced) onto a weapon's sockets.
 * Returns one { column, hash } per socket that has a matching perk — the shape
 * `selectPerk(column, hash)` expects. Hashes that don't belong to the weapon
 * are ignored, so rolls survive a weapon's perk pool changing.
 */
export function perkSelectionFromHashes(weapon: Weapon, hashes: string[]): Array<{ column: string; hash: string }> {
  const wanted = new Set(hashes);
  const out: Array<{ column: string; hash: string }> = [];
  for (const col of weapon.perkSockets) {
    for (const perk of col.perks) {
      if (wanted.has(perk.hash)) out.push({ column: col.name, hash: perk.hash });
      if (perk.enhancedVersion && wanted.has(perk.enhancedVersion.hash)) {
        out.push({ column: col.name, hash: perk.enhancedVersion.hash });
      }
    }
  }
  return out;
}

/** Perk names for a roll, in socket order (for compact summaries). */
export function perkNamesFromHashes(weapon: Weapon, hashes: string[]): string[] {
  const wanted = new Set(hashes);
  const names: string[] = [];
  for (const col of weapon.perkSockets) {
    for (const perk of col.perks) {
      if (wanted.has(perk.hash) || (perk.enhancedVersion && wanted.has(perk.enhancedVersion.hash))) {
        names.push(perk.name);
      }
    }
  }
  return names;
}
