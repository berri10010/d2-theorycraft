import { create } from 'zustand';
import { Weapon } from '../types/weapon';

interface WeaponDbState {
  weapons: Weapon[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  manifestVersion: string | null;
  fetchWeapons: () => Promise<void>;
  forceSync: () => Promise<void>;
}

export const useWeaponDb = create<WeaponDbState>((set) => ({
  weapons: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  manifestVersion: null,

  fetchWeapons: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/weapons');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'HTTP ' + res.status);
      }
      const data = await res.json();
      set({ weapons: data.weapons, manifestVersion: data.meta?.version ?? null, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load weapons', isLoading: false });
    }
  },

  forceSync: async () => {
    set({ isSyncing: true, error: null });
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'HTTP ' + res.status);
      }
      const data = await res.json();
      const weaponsRes = await fetch('/api/weapons');
      const weaponsData = await weaponsRes.json();
      set({ weapons: weaponsData.weapons, manifestVersion: data.version ?? null, isSyncing: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sync failed', isSyncing: false });
    }
  },
}));