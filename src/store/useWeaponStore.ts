import { create } from 'zustand';
import { Weapon, StatMap, GameMode } from '../types/weapon';
import { BUFF_DATABASE } from '../lib/buffDatabase';

interface WeaponState {
  activeWeapon: Weapon | null;
  selectedPerks: Record<string, string>;
  activeBuffs: string[];
  mode: GameMode;

  loadWeapon: (weapon: Weapon) => void;
  selectPerk: (columnName: string, perkHash: string) => void;
  clearPerk: (columnName: string) => void;
  toggleBuff: (buffHash: string) => void;
  setMode: (mode: GameMode) => void;
  getCalculatedStats: () => StatMap;
  getDamageMultiplier: () => number;
}

export const useWeaponStore = create<WeaponState>((set, get) => ({
  activeWeapon: null,
  selectedPerks: {},
  activeBuffs: [],
  mode: 'pvp',

  loadWeapon: (weapon) => set({ activeWeapon: weapon, selectedPerks: {}, activeBuffs: [] }),

  selectPerk: (columnName, perkHash) =>
    set((state) => {
      if (!state.activeWeapon) return state;

      // Find the old perk in this column (to remove its buff if any)
      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
      const oldPerkHash = state.selectedPerks[columnName];
      const oldPerk = column?.perks.find((p) => p.hash === oldPerkHash);
      const newPerk = column?.perks.find((p) => p.hash === perkHash);

      let activeBuffs = [...state.activeBuffs];

      // Remove old perk's auto-buff if it was auto-added
      if (oldPerk?.buffKey && activeBuffs.includes(oldPerk.buffKey)) {
        activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
      }

      // Add new perk's auto-buff if it has one and it isn't already active
      if (newPerk?.buffKey && !activeBuffs.includes(newPerk.buffKey)) {
        activeBuffs = [...activeBuffs, newPerk.buffKey];
      }

      return {
        selectedPerks: { ...state.selectedPerks, [columnName]: perkHash },
        activeBuffs,
      };
    }),

  clearPerk: (columnName) =>
    set((state) => {
      if (!state.activeWeapon) return state;
      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
      const oldPerkHash = state.selectedPerks[columnName];
      const oldPerk = column?.perks.find((p) => p.hash === oldPerkHash);

      let activeBuffs = [...state.activeBuffs];
      if (oldPerk?.buffKey) {
        activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
      }

      const { [columnName]: _removed, ...rest } = state.selectedPerks;
      return { selectedPerks: rest, activeBuffs };
    }),

  toggleBuff: (buffHash) =>
    set((state) => ({
      activeBuffs: state.activeBuffs.includes(buffHash)
        ? state.activeBuffs.filter((h) => h !== buffHash)
        : [...state.activeBuffs, buffHash],
    })),

  setMode: (mode) => set({ mode }),

  getCalculatedStats: () => {
    const { activeWeapon, selectedPerks } = get();
    if (!activeWeapon) return {};
    const finalStats: StatMap = { ...activeWeapon.baseStats };
    for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
      const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
      if (!column) continue;
      const perk = column.perks.find((p) => p.hash === perkHash);
      if (!perk) continue;
      for (const mod of perk.statModifiers) {
        if (finalStats[mod.statName] !== undefined) {
          finalStats[mod.statName] = Math.max(0, Math.min(100, finalStats[mod.statName] + mod.value));
        }
      }
    }
    return finalStats;
  },

  getDamageMultiplier: () => {
    const { activeBuffs } = get();
    return activeBuffs.reduce((total, hash) => {
      const buff = BUFF_DATABASE[hash];
      return buff ? total * buff.multiplier : total;
    }, 1);
  },
}));
