import { create } from 'zustand';
import { Weapon } from '../types/weapon';

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
      // weapons.json is pre-built at deploy time by scripts/build-static-data.ts
      const res = await fetch('/data/weapons.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const weapons = await res.json() as Weapon[];
      set({ weapons, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load weapons', isLoading: false });
    }
  },
}));
