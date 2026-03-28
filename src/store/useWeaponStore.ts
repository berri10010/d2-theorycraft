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

// ─── Armor Mods ──────────────────────────────────────────────────────────────

export type ArmorModTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface ArmorModState {
  /** Targeting (Aim Assistance): 0-5 stacks, each +10 Aim Assist */
  targeting: ArmorModTier;
  /** Loader (Reload): 0-5 stacks, each +10 Reload */
  loader: ArmorModTier;
  /**
   * Dexterity (Handling / ready+stow speed): 0-5 stacks.
   * D2 frame data: each tier reduces ready+stow frames by ~3 frames (at 60fps).
   * Tier 5 ≈ -15 frames total ≈ -0.25s at 60fps.
   * We model this as +6 Handling per tier (approximate; real effect is animation-frame based).
   */
  dexterity: ArmorModTier;
  /**
   * Unflinching (flinch resistance): 0-5 stacks.
   * Reduces flinch received — no stat bar equivalent, shown as a readout only.
   * Each tier ≈ 10% flinch reduction, max -50%.
   */
  unflinching: ArmorModTier;
}

export const DEFAULT_ARMOR_MODS: ArmorModState = {
  targeting: 0,
  loader: 0,
  dexterity: 0,
  unflinching: 0,
};

/** Compute stat bonuses from armor mods */
export function armorModStatDeltas(mods: ArmorModState): Partial<Record<string, number>> {
  return {
    'Aim Assistance': mods.targeting * 10,
    'Reload':         mods.loader    * 10,
    'Handling':       mods.dexterity * 6,
  };
}

/** Human-readable summary of Dexterity frame reduction */
export function dexterityFrameReduction(tier: ArmorModTier): string {
  if (tier === 0) return '';
  const frames = tier * 3;
  const ms     = ((frames / 60) * 1000).toFixed(0);
  return `-${frames} frames (−${ms}ms ready/stow)`;
}

/** Human-readable summary of Unflinching flinch reduction */
export function unflinchingReduction(tier: ArmorModTier): string {
  if (tier === 0) return '';
  return `-${tier * 10}% flinch received`;
}

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

  /** Armor mod tiers (Targeting / Loader / Dexterity / Unflinching) */
  armorMods: ArmorModState;

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
  setArmorMods: (mods: Partial<ArmorModState>) => void;

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
  armorMods: DEFAULT_ARMOR_MODS,

  loadWeapon: (weapon, group) =>
    set({
      activeWeapon: weapon,
      variantGroup: group ?? [weapon],
      selectedPerks: {},
      activeBuffs: [],
      masterworkStat: null,
      isCrafted: false,
      activeMod: WEAPON_MODS[0],
      armorMods: DEFAULT_ARMOR_MODS,
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
  setArmorMods: (mods) => set((s) => ({ armorMods: { ...s.armorMods, ...mods } })),

  getCalculatedStats: () => {
    const { activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods } = get();
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

    // Crafted weapons with Enhanced perks selected get +2 only on the stats those
    // enhanced perks boost (same stats as the base perk but with an extra +2 bonus).
    // A crafted weapon with NO enhanced perks selected provides no blanket bonus.
    if (isCrafted) {
      for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
        const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
        if (!column) continue;
        // Find the base perk whose enhancedVersion hash matches the selected hash
        for (const basePerk of column.perks) {
          if (basePerk.enhancedVersion?.hash === perkHash) {
            // This perk is in its enhanced state — apply +2 to its stat mods
            for (const mod of basePerk.statModifiers) {
              if (finalStats[mod.statName] !== undefined) {
                finalStats[mod.statName] = Math.min(100, finalStats[mod.statName] + 2);
              }
            }
            break; // only one perk can own this enhanced hash
          }
        }
      }
    }

    // Weapon mod stat changes
    for (const [stat, delta] of Object.entries(activeMod.statChanges)) {
      if (delta && finalStats[stat] !== undefined) {
        finalStats[stat] = Math.max(0, Math.min(100, finalStats[stat] + delta));
      }
    }

    // Armor mod stat bonuses (Targeting, Loader, Dexterity)
    for (const [stat, delta] of Object.entries(armorModStatDeltas(armorMods))) {
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
