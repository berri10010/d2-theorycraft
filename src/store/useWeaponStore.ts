import { create } from 'zustand';
import { Weapon, StatMap, GameMode, WeaponGroup } from '../types/weapon';
import { BUFF_DATABASE } from '../lib/buffDatabase';

// ─── Weapon Mods ────────────────────────────────────────────────────────────

export interface WeaponMod {
  id: string;
  name: string;
  description: string;
  /** Stat changes this mod applies */
  statChanges: Partial<Record<string, number>>;
  /** PvE damage multiplier this mod provides (1.0 = none) */
  damageMultiplier: number;
  /** Whether this is an Adept-only mod */
  adeptOnly: boolean;
}

export const WEAPON_MODS: WeaponMod[] = [
  {
    id: 'none',
    name: 'No Mod',
    description: 'No weapon mod equipped.',
    statChanges: {},
    damageMultiplier: 1.0,
    adeptOnly: false,
  },
  {
    id: 'major_spec',
    name: 'Major Spec',
    description: '+7.7% damage to Majors, Ultras, and Bosses.',
    statChanges: {},
    damageMultiplier: 1.077,
    adeptOnly: false,
  },
  {
    id: 'minor_spec',
    name: 'Minor Spec',
    description: '+7.7% damage to Minors.',
    statChanges: {},
    damageMultiplier: 1.077,
    adeptOnly: false,
  },
  {
    id: 'backup_mag',
    name: 'Backup Mag',
    description: 'Increases magazine size. -10 Reload.',
    statChanges: { Reload: -10 },
    damageMultiplier: 1.0,
    adeptOnly: false,
  },
  {
    id: 'icarus_grip',
    name: 'Icarus Grip',
    description: '+20 Airborne Effectiveness, -5 Handling.',
    statChanges: { 'Airborne Effectiveness': 20, Handling: -5 },
    damageMultiplier: 1.0,
    adeptOnly: false,
  },
  {
    id: 'radar_tuner',
    name: 'Radar Tuner',
    description: '+50 Airborne Effectiveness while airborne.',
    statChanges: { 'Airborne Effectiveness': 50 },
    damageMultiplier: 1.0,
    adeptOnly: false,
  },
  {
    id: 'adept_impact',
    name: 'Adept Impact',
    description: '+3 Impact.',
    statChanges: { Impact: 3 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
  {
    id: 'adept_range',
    name: 'Adept Range',
    description: '+3 Range.',
    statChanges: { Range: 3 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
  {
    id: 'adept_stability',
    name: 'Adept Stability',
    description: '+3 Stability.',
    statChanges: { Stability: 3 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
  {
    id: 'adept_handling',
    name: 'Adept Handling',
    description: '+3 Handling.',
    statChanges: { Handling: 3 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
  {
    id: 'adept_reload',
    name: 'Adept Reload',
    description: '+3 Reload.',
    statChanges: { Reload: 3 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
  {
    id: 'adept_mag',
    name: 'Adept Mag',
    description: '+10 Magazine.',
    statChanges: { Magazine: 10 },
    damageMultiplier: 1.0,
    adeptOnly: true,
  },
];

// ─── Masterwork stats ────────────────────────────────────────────────────────

export const MASTERWORK_STATS = [
  'Impact', 'Range', 'Stability', 'Handling', 'Reload',
  'Aim Assistance', 'Magazine',
] as const;

export type MasterworkStat = typeof MASTERWORK_STATS[number];

/** Surge stack → approximate damage multiplier (stacks multiplicatively, ~6% each) */
const SURGE_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.06,
  2: 1.1236,
  3: 1.191,
};

// ─── Store interface ─────────────────────────────────────────────────────────

interface WeaponState {
  activeWeapon: Weapon | null;
  /** All variants in the active weapon's family */
  variantGroup: Weapon[];
  selectedPerks: Record<string, string>;
  activeBuffs: string[];
  mode: GameMode;

  // Roll customisation
  masterworkStat: MasterworkStat | null;
  isCrafted: boolean;
  activeMod: WeaponMod;
  surgeStacks: 0 | 1 | 2 | 3;
  /**
   * Guardian "Weapons" armor stat (formerly Mobility), range 1–200.
   * PvE only — scales weapon damage vs combatants.
   * 1–100: 0–15% vs minors/majors (Primary/Special), 0–10% (Heavy)
   * 101–200: additional 0–15% vs bosses (Primary/Special), 0–10% (Heavy)
   */
  weaponsStat: number;

  // Actions
  loadWeapon: (weapon: Weapon, group?: Weapon[]) => void;
  selectPerk: (columnName: string, perkHash: string) => void;
  clearPerk: (columnName: string) => void;
  toggleBuff: (buffHash: string) => void;
  setMode: (mode: GameMode) => void;
  setMasterworkStat: (stat: MasterworkStat | null) => void;
  toggleCrafted: () => void;
  setActiveMod: (mod: WeaponMod) => void;
  setSurgeStacks: (stacks: 0 | 1 | 2 | 3) => void;
  setWeaponsStat: (stat: number) => void;

  // Computed
  getCalculatedStats: () => StatMap;
  getDamageMultiplier: () => number;
}

export const useWeaponStore = create<WeaponState>((set, get) => ({
  activeWeapon: null,
  variantGroup: [],
  selectedPerks: {},
  activeBuffs: [],
  mode: 'pvp',

  masterworkStat: null,
  isCrafted: false,
  activeMod: WEAPON_MODS[0], // 'none'
  surgeStacks: 0,
  weaponsStat: 70, // ~equivalent to old Mobility 100, a reasonable default

  loadWeapon: (weapon, group) =>
    set({
      activeWeapon: weapon,
      variantGroup: group ?? [weapon],
      selectedPerks: {},
      activeBuffs: [],
      masterworkStat: null,
      isCrafted: false,
      activeMod: WEAPON_MODS[0],
    }),

  selectPerk: (columnName, perkHash) =>
    set((state) => {
      if (!state.activeWeapon) return state;

      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
      const oldPerkHash = state.selectedPerks[columnName];
      const oldPerk = column?.perks.find((p) => p.hash === oldPerkHash);
      const newPerk = column?.perks.find((p) => p.hash === perkHash);

      let activeBuffs = [...state.activeBuffs];
      if (oldPerk?.buffKey && activeBuffs.includes(oldPerk.buffKey)) {
        activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
      }
      if (newPerk?.buffKey && !activeBuffs.includes(newPerk.buffKey)) {
        activeBuffs = [...activeBuffs, newPerk.buffKey];
      }

      return { selectedPerks: { ...state.selectedPerks, [columnName]: perkHash }, activeBuffs };
    }),

  clearPerk: (columnName) =>
    set((state) => {
      if (!state.activeWeapon) return state;
      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
      const oldPerkHash = state.selectedPerks[columnName];
      const oldPerk = column?.perks.find((p) => p.hash === oldPerkHash);

      let activeBuffs = [...state.activeBuffs];
      if (oldPerk?.buffKey) activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);

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
  setMasterworkStat: (stat) => set({ masterworkStat: stat }),
  toggleCrafted: () => set((s) => ({ isCrafted: !s.isCrafted })),
  setActiveMod: (mod) => set({ activeMod: mod }),
  setSurgeStacks: (stacks) => set({ surgeStacks: stacks }),
  setWeaponsStat: (stat) => set({ weaponsStat: Math.max(1, Math.min(200, stat)) }),

  getCalculatedStats: () => {
    const { activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod } = get();
    if (!activeWeapon) return {};

    const finalStats: StatMap = { ...activeWeapon.baseStats };

    // Perk stat modifiers
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

    // Masterwork: +10 to chosen stat; if Adept, +3 to all other base stats
    if (masterworkStat) {
      if (activeWeapon.isAdept) {
        for (const stat of Object.keys(finalStats)) {
          if (stat === masterworkStat) {
            finalStats[stat] = Math.min(100, finalStats[stat] + 10);
          } else {
            finalStats[stat] = Math.min(100, finalStats[stat] + 3);
          }
        }
      } else {
        if (finalStats[masterworkStat] !== undefined) {
          finalStats[masterworkStat] = Math.min(100, finalStats[masterworkStat] + 10);
        }
      }
    }

    // Crafted Level-20 Enhanced Intrinsic: +2 to every stat NOT already boosted by Masterwork.
    // If no masterwork is slotted, +2 applies to all stats.
    if (isCrafted) {
      for (const stat of Object.keys(finalStats)) {
        if (stat !== masterworkStat) {
          finalStats[stat] = Math.min(100, finalStats[stat] + 2);
        }
      }
    }

    // Weapon mod stat changes
    for (const [stat, delta] of Object.entries(activeMod.statChanges)) {
      if (delta && finalStats[stat] !== undefined) {
        finalStats[stat] = Math.max(0, Math.min(100, finalStats[stat] + delta));
      }
    }

    return finalStats;
  },

  getDamageMultiplier: () => {
    const { activeBuffs, activeMod, surgeStacks, mode, weaponsStat } = get();
    let multiplier = activeBuffs.reduce((total, hash) => {
      const buff = BUFF_DATABASE[hash];
      return buff ? total * buff.multiplier : total;
    }, 1);
    // Weapon mod damage bonus
    multiplier *= activeMod.damageMultiplier;

    if (mode === 'pve') {
      // PvE surge stacks
      multiplier *= SURGE_MULTIPLIERS[surgeStacks];
      // Weapons stat PvE bonus (formerly Mobility):
      //   1–100:   0–15% vs minors/majors (Primary/Special)
      //   101–200: additional 0–15% vs bosses
      const tier1 = Math.min(weaponsStat, 100) / 100;
      const tier2 = Math.max(0, weaponsStat - 100) / 100;
      multiplier *= (1 + tier1 * 0.15 + tier2 * 0.15);
    } else if (mode === 'pvp') {
      // Weapons stat PvP bonus:
      //   1–100:   no bonus vs Guardians (PvE targets only)
      //   101–200: 0–5% bonus damage vs Guardians
      const pvpTier = Math.max(0, weaponsStat - 100) / 100;   // 0.0 → 1.0
      multiplier *= (1 + pvpTier * 0.05);
    }

    return multiplier;
  },
}));
