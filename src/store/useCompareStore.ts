import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompareSnapshot } from '../types/weapon';

/** Each snapshot holds a whole weapon (about 24 KB); 12 stays far below localStorage's ~5 MB limit. */
export const MAX_SNAPSHOTS = 12;

interface CompareState {
  snapshots: CompareSnapshot[];
  addSnapshot: (snapshot: Omit<CompareSnapshot, 'id'>) => void;
  removeSnapshot: (id: string) => void;
  renameSnapshot: (id: string, label: string) => void;
  reorderSnapshot: (id: string, direction: 'left' | 'right') => void;
  clearSnapshots: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      snapshots: [],

      addSnapshot: (snapshot) =>
        set((state) => ({
          // Past the cap the oldest snapshot is dropped, so adding never fails.
          snapshots: [
            ...state.snapshots,
            {
              ...snapshot,
              // Timestamp + random suffix: collision-proof and stable across
              // reloads (a module-level counter would reset to 0 on each refresh).
              id: `${snapshot.weapon.hash}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            },
          ].slice(-MAX_SNAPSHOTS),
        })),

      removeSnapshot: (id) =>
        set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) })),

      renameSnapshot: (id, label) =>
        set((state) => ({
          snapshots: state.snapshots.map((s) => (s.id === id ? { ...s, label } : s)),
        })),

      reorderSnapshot: (id, direction) =>
        set((state) => {
          const idx = state.snapshots.findIndex((s) => s.id === id);
          if (idx === -1) return state;
          const next = [...state.snapshots];
          const target = direction === 'left' ? idx - 1 : idx + 1;
          if (target < 0 || target >= next.length) return state;
          [next[idx], next[target]] = [next[target], next[idx]];
          return { snapshots: next };
        }),

      clearSnapshots: () => set({ snapshots: [] }),
    }),
    {
      name: 'd2tc-compare',
      // Persist the full snapshots array (includes weapon objects), capped at MAX_SNAPSHOTS.
    }
  )
);
