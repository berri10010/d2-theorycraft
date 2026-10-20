import fs from 'fs';
import path from 'path';
import { unpackWeapons, type WeaponPack } from '../lib/weaponPack';
import type { Weapon } from '../types/weapon';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const read = <T,>(file: string) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as T;

let cache: { pack: WeaponPack; weapons: Weapon[] } | null = null;

/** The committed production data, unpacked — tests run against real weapons. */
export function loadRealData() {
  if (!cache) {
    const pack: WeaponPack = {
      weapons: read('weapons.json'),
      perks: read('perks.json'),
      mods: read('mods.json'),
    };
    cache = { pack, weapons: unpackWeapons(pack) };
  }
  return cache;
}

/** First weapon matching a predicate, or throws — keeps tests honest about their fixtures. */
export function findWeapon(pred: (w: Weapon) => boolean): Weapon {
  const w = loadRealData().weapons.find(pred);
  if (!w) throw new Error('No weapon in public/data matches the test fixture predicate');
  return w;
}
