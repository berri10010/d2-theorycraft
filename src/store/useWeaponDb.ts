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
      // weapons-{0,1}.json are pre-built at deploy time by scripts/build-static-data.ts.
      // The file is split into two chunks to stay under Cloudflare's 25 MiB per-file limit.
      const fetchChunk = async (name: string) => {
        const res = await fetch(name);
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + name);
        return res.json() as Promise<Weapon[]>;
      };
      const [chunk0, chunk1] = await Promise.all([
        fetchChunk('/data/weapons-0.json'),
        fetchChunk('/data/weapons-1.json'),
      ]);
      const weapons: Weapon[] = [...chunk0, ...chunk1];
      set({ weapons, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load weapons', isLoading: false });
    }
  },
}));
