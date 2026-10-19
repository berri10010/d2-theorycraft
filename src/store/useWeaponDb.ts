import { create } from 'zustand';
import { Weapon } from '../types/weapon';
import { unpackWeapons, type WeaponPack } from '../lib/weaponPack';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.json() as Promise<T>;
}

interface WeaponDbState {
  weapons: Weapon[];
  isLoading: boolean;
  error: string | null;
  fetchWeapons: () => Promise<void>;
}

export const useWeaponDb = create<WeaponDbState>((set) => ({
  weapons: [],
  isLoading: false,
  error: null,

  fetchWeapons: async () => {
    set({ isLoading: true, error: null });
    try {
      // Packed weapon data is pre-built at deploy time by scripts/build-static-data.ts.
      const [weapons, perks, mods] = await Promise.all([
        fetchJson<WeaponPack['weapons']>('/data/weapons.json'),
        fetchJson<WeaponPack['perks']>('/data/perks.json'),
        fetchJson<WeaponPack['mods']>('/data/mods.json'),
      ]);
      set({ weapons: unpackWeapons({ weapons, perks, mods }), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load weapons', isLoading: false });
    }
  },
}));
