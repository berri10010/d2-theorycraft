import { create } from 'zustand';
import { CompareSnapshot } from '../types/weapon';

interface CompareState {
  snapshots: CompareSnapshot[];
  addSnapshot: (snapshot: Omit<CompareSnapshot, 'id'>) => void;
  removeSnapshot: (id: string) => void;
  renameSnapshot: (id: string, label: string) => void;
  clearSnapshots: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  snapshots: [],

  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [
        ...state.snapshots,
        { ...snapshot, id: `${snapshot.weapon.hash}-${Date.now()}` },
      ],
    })),

  removeSnapshot: (id) =>
    set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) })),

  renameSnapshot: (id, label) =>
    set((state) => ({
      snapshots: state.snapshots.map((s) => (s.id === id ? { ...s, label } : s)),
    })),

  clearSnapshots: () => set({ snapshots: [] }),
}));
