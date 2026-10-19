/**
 * Normalised on-disk format for the weapon database.
 *
 * Every weapon used to embed full copies of its perks and mods, so ~100k perk
 * objects (only ~1.4k distinct) made up 90% of a 50 MB payload.  The packed
 * format stores each perk / mod once and has weapons reference them by hash:
 *
 *   public/data/weapons.json  PackedWeapon[]   (landing page loads just this)
 *   public/data/perks.json    Record<hash, PackedPerk>
 *   public/data/mods.json     Record<hash, WeaponModOption>
 *
 * A perk's (or mod's) enhancedVersion depends on the slot it sits in (the same
 * hash can appear with and without one on a single weapon), so a slot entry is
 * either a hash or a `[hash, enhancedHash]` pair.
 *
 * `unpackWeapons` rebuilds the plain `Weapon[]` the app works with; objects are
 * shared by reference, which also cuts runtime memory.
 */

import type { Weapon, Perk, PerkColumn, WeaponModOption } from '../types/weapon';

type Upgradable = { hash: string; enhancedVersion?: Upgradable | null };

/** Hash, or [hash, enhanced hash] when the slot offers an upgrade. */
export type Ref = string | [string, string];
export type PackedPerk = Omit<Perk, 'enhancedVersion'>;
export type PackedMod = Omit<WeaponModOption, 'enhancedVersion'>;
export type PackedColumn = Omit<PerkColumn, 'perks'> & { perks: Ref[] };
export type PackedWeapon = Omit<Weapon, 'intrinsicTrait' | 'perkSockets' | 'weaponMods'> & {
  intrinsicTrait: Ref | null;
  perkSockets: PackedColumn[];
  weaponMods: Ref[];
};

export interface WeaponPack {
  weapons: PackedWeapon[];
  perks: Record<string, PackedPerk>;
  mods: Record<string, PackedMod>;
}

/** Register `value` under `hash`, refusing to merge entries that differ. */
function intern<T>(table: Record<string, T>, hash: string, value: T, what: string): void {
  const existing = table[hash];
  if (existing === undefined) {
    table[hash] = value;
  } else if (JSON.stringify(existing) !== JSON.stringify(value)) {
    throw new Error(`weaponPack: ${what} ${hash} has conflicting definitions; cannot dedupe`);
  }
}

function makePacker<T extends Upgradable>(table: Record<string, Omit<T, 'enhancedVersion'>>, what: string) {
  return (item: T): Ref => {
    const { enhancedVersion, ...rest } = item;
    intern(table, item.hash, rest, what);
    if (!enhancedVersion) return item.hash;
    if (enhancedVersion.enhancedVersion) {
      throw new Error(`weaponPack: ${what} ${item.hash} has a nested enhancedVersion chain`);
    }
    const { enhancedVersion: _none, ...enhancedRest } = enhancedVersion;
    intern(table, enhancedVersion.hash, enhancedRest, what);
    return [item.hash, enhancedVersion.hash];
  };
}

export function packWeapons(weapons: Weapon[]): WeaponPack {
  const perks: Record<string, PackedPerk> = {};
  const mods: Record<string, PackedMod> = {};
  const packPerk = makePacker<Perk>(perks, 'perk');
  const packMod = makePacker<WeaponModOption>(mods, 'mod');

  const packed = weapons.map((w): PackedWeapon => ({
    ...w,
    intrinsicTrait: w.intrinsicTrait ? packPerk(w.intrinsicTrait) : null,
    perkSockets: w.perkSockets.map((col) => ({ ...col, perks: col.perks.map(packPerk) })),
    weaponMods: w.weaponMods.map(packMod),
  }));

  return { weapons: packed, perks, mods };
}

/**
 * Builds a resolver that returns one shared object per hash (no upgrade) and one
 * per distinct [hash, enhancedHash] pair.
 */
function makeResolver<T extends Upgradable>(table: Record<string, Omit<T, 'enhancedVersion'>>, what: string) {
  const plain = new Map<string, T>();
  const upgraded = new Map<string, T>();

  const base = (hash: string): T => {
    let item = plain.get(hash);
    if (!item) {
      const def = table[hash];
      if (!def) throw new Error(`weaponPack: missing ${what} ${hash}`);
      item = { ...def, enhancedVersion: null } as unknown as T;
      plain.set(hash, item);
    }
    return item;
  };

  return (ref: Ref): T => {
    if (typeof ref === 'string') return base(ref);
    const key = ref[0] + '>' + ref[1];
    let item = upgraded.get(key);
    if (!item) {
      item = { ...base(ref[0]), enhancedVersion: base(ref[1]) };
      upgraded.set(key, item);
    }
    return item;
  };
}

export function unpackWeapons(pack: WeaponPack): Weapon[] {
  const perk = makeResolver<Perk>(pack.perks, 'perk');
  const mod = makeResolver<WeaponModOption>(pack.mods, 'mod');

  return pack.weapons.map((w) => ({
    ...w,
    intrinsicTrait: w.intrinsicTrait ? perk(w.intrinsicTrait) : null,
    perkSockets: w.perkSockets.map((col) => ({ ...col, perks: col.perks.map(perk) })),
    weaponMods: w.weaponMods.map(mod),
  }));
}
