import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompareSnapshot } from '../types/weapon';

interface CompareState {
  snapshots: CompareSnapshot[];
  addSnapshot: (snapshot: Omit<CompareSnapshot, 'id'>) => void;
  removeSnapshot: (id: string) => void;
  renameSnapshot: (id: string, label: string) => void;
  clearSnapshots: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      snapshots: [],

      addSnapshot: (snapshot) =>
        set((state) => ({
          snapshots: [
            ...state.snapshots,
            {
              ...snapshot,
              // Timestamp + random suffix: collision-proof and stable across
              // reloads (a module-level counter would reset to 0 on each refresh).
              id: `${snapshot.weapon.hash}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            },
          ],
        })),

      removeSnapshot: (id) =>
        set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) })),

      renameSnapshot: (id, label) =>
        set((state) => ({
          snapshots: state.snapshots.map((s) => (s.id === id ? { ...s, label } : s)),
        })),

      clearSnapshots: () => set({ snapshots: [] }),
    }),
    {
      name: 'd2tc-compare',
      // Persist the full snapshots array (includes weapon objects).
      // Each snapshot is ~5–20 KB; a handful of snapshots is well within
      // localStorage's ~5 MB per-origin limit.
    }
  )
);
