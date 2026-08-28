import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DEFAULT_PVE_DATA from '../data/perkTiers.json';
import { PerkTier } from '../lib/perkTierDatabase';

export interface TierEntry {
  tier: PerkTier;
  notes: string;
}

export type TierList = Record<string, TierEntry>;

// Seed the default PvE list from the bundled JSON
const SEED_PVE: TierList = Object.fromEntries(
  Object.entries(DEFAULT_PVE_DATA).map(([name, e]) => [
    name,
    { tier: (e as { tier: string }).tier as PerkTier, notes: (e as { notes?: string }).notes ?? '' },
  ])
);

export const DEFAULT_PVE = 'PvE';
export const DEFAULT_PVP = 'PvP';

// Cycling order for tier badge clicks: S → A → B → … → G → (unrated) → S
export const TIER_CYCLE: (PerkTier | null)[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G', null];

interface TierListStore {
  lists: Record<string, TierList>;
  pveModeList: string;
  pvpModeList: string;

  /** Return the active list for the given game mode. */
  getActiveList: (mode: 'pve' | 'pvp') => TierList;
  /** Look up a perk tier in the active list for the given mode (falls back to Enhanced→base strip). */
  getPerkTier: (mode: 'pve' | 'pvp', perkName: string) => PerkTier | null;

  setActiveList: (mode: 'pve' | 'pvp', name: string) => void;
  createList: (name: string) => void;
  deleteList: (name: string) => void;
  setPerkTier: (listName: string, perkName: string, tier: PerkTier | null, notes?: string) => void;
  resetList: (listName: string) => void;
}

export const useTierListStore = create<TierListStore>()(
  persist(
    (set, get) => ({
      lists: {
        [DEFAULT_PVE]: SEED_PVE,
        [DEFAULT_PVP]: {},
      },
      pveModeList: DEFAULT_PVE,
      pvpModeList: DEFAULT_PVP,

      getActiveList: (mode) => {
        const s = get();
        const name = mode === 'pve' ? s.pveModeList : s.pvpModeList;
        return s.lists[name] ?? {};
      },

      getPerkTier: (mode, perkName) => {
        const list = get().getActiveList(mode);
        if (list[perkName]) return list[perkName].tier;
        if (perkName.startsWith('Enhanced ')) {
          const base = perkName.replace(/^Enhanced /, '');
          if (list[base]) return list[base].tier;
        }
        return null;
      },

      setActiveList: (mode, name) =>
        set(() => ({ [mode === 'pve' ? 'pveModeList' : 'pvpModeList']: name })),

      createList: (name) =>
        set((s) => ({ lists: { ...s.lists, [name]: {} } })),

      deleteList: (name) =>
        set((s) => {
          const { [name]: _removed, ...rest } = s.lists;
          const fallback = Object.keys(rest)[0] ?? DEFAULT_PVE;
          return {
            lists: rest,
            pveModeList: s.pveModeList === name ? fallback : s.pveModeList,
            pvpModeList: s.pvpModeList === name ? fallback : s.pvpModeList,
          };
        }),

      setPerkTier: (listName, perkName, tier, notes) =>
        set((s) => {
          const list = { ...(s.lists[listName] ?? {}) };
          if (tier === null) {
            delete list[perkName];
          } else {
            list[perkName] = { tier, notes: notes ?? list[perkName]?.notes ?? '' };
          }
          return { lists: { ...s.lists, [listName]: list } };
        }),

      resetList: (listName) =>
        set((s) => ({
          lists: {
            ...s.lists,
            [listName]: listName === DEFAULT_PVE ? SEED_PVE : {},
          },
        })),
    }),
    { name: 'perk-tier-lists', version: 1 }
  )
);
