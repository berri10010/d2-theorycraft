import { create } from 'zustand';
import { Weapon, StatMap, GameMode, WeaponGroup } from '../types/weapon';
import { BUFF_DATABASE, getBuffMultiplier } from '../lib/buffDatabase';

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
//
// All mods have 3 effective tiers (1 copy, 2 copies, 3 copies).
// Tier 0 = none equipped.

export type ArmorModTier = 0 | 1 | 2 | 3;

// Per-tier values sourced from in-game mod descriptions.
const TARGETING_AA:    [number, number, number, number] = [0,  5,  8, 10];
const LOADER_RELOAD:   [number, number, number, number] = [0, 10, 15, 18];
const DEXTERITY_MULT:  [string, string, string, string] = ['', '0.80×', '0.75×', '0.70×'];
const UNFLINCHING_PCT: [number, number, number, number] = [0, 25, 30, 35];
const INFLIGHT_AE:     [number, number, number, number] = [0, 15, 25, 30];
const AMMO_GEN:        [number, number, number, number] = [0, 20, 40, 50];

// Dexterity → approximate flat Handling bonus for the stat bar.
// The real effect is a 0.8x/0.75x/0.7x ready/stow duration multiplier,
// but we map it to Handling so changes show in the stat display.
const DEXTERITY_HANDLING: [number, number, number, number] = [0, 8, 10, 12];

export interface ArmorModState {
  /** Targeting: +5 | +8 | +10 Aim Assist (after ~1s, element-matching) */
  targeting: ArmorModTier;
  /** Loader: +10 | +15 | +18 Reload Speed + 0.85× duration (after ~0.5s, element-matching) */
  loader: ArmorModTier;
  /** Dexterity: 0.80× | 0.75× | 0.70× Ready/Stow Duration (element-matching) */
  dexterity: ArmorModTier;
  /** Unflinching Aim: 25% | 30% | 35% Flinch Resistance while ADS (element-matching) */
  unflinching: ArmorModTier;
  /** In-Flight Compensator: +15 | +25 | +30 Airborne Effectiveness (3-energy each) */
  inFlight: ArmorModTier;
  /** Ammo Generation: +20 | +40 | +50 Ammo Generation stat (element-matching) */
  ammoGeneration: ArmorModTier;
}

export const DEFAULT_ARMOR_MODS: ArmorModState = {
  targeting: 0, loader: 0, dexterity: 0,
  unflinching: 0, inFlight: 0, ammoGeneration: 0,
};

/** Compute stat bonuses from armor mods (reflected in stat bars) */
export function armorModStatDeltas(mods: ArmorModState): Partial<Record<string, number>> {
  return {
    'Aim Assistance':        TARGETING_AA[mods.targeting],
    'Reload':                LOADER_RELOAD[mods.loader],
    'Handling':              DEXTERITY_HANDLING[mods.dexterity],
    'Airborne Effectiveness': INFLIGHT_AE[mods.inFlight],
  };
}

/** Human-readable Dexterity multiplier */
export function dexterityReadout(tier: ArmorModTier): string {
  return tier === 0 ? '' : `${DEXTERITY_MULT[tier]} ready/stow`;
}

/** Human-readable Unflinching flinch resistance */
export function unflinchingReduction(tier: ArmorModTier): string {
  if (tier === 0) return '';
  return `${UNFLINCHING_PCT[tier]}% flinch resist`;
}

/** Ammo Generation stat value for current tier */
export function ammoGenReadout(tier: ArmorModTier): string {
  if (tier === 0) return '';
  return `+${AMMO_GEN[tier]} ammo gen`;
}

// Re-export tier tables for use in UI components
export { TARGETING_AA, LOADER_RELOAD, DEXTERITY_MULT, UNFLINCHING_PCT, INFLIGHT_AE, AMMO_GEN };

// ─── Masterwork stats ────────────────────────────────────────────────────────

export const MASTERWORK_STATS = [
  'Impact', 'Range', 'Stability', 'Handling', 'Reload',
  'Aim Assistance', 'Magazine',
] as const;

export type MasterworkStat = typeof MASTERWORK_STATS[number];

// Weapon Surge multipliers — actual in-game values from Weapon Surge mod description.
// Stacks 1-3 available from regular armor; stack 4 only via Artifact or Exotic Armor.
export const SURGE_PVE: Record<number, number> = { 0: 1.00, 1: 1.10, 2: 1.17, 3: 1.22, 4: 1.25 };
export const SURGE_PVP: Record<number, number> = { 0: 1.00, 1: 1.03, 2: 1.045, 3: 1.055, 4: 1.06 };

// ─── Store interface ─────────────────────────────────────────────────────────

interface WeaponState {
  activeWeapon: Weapon | null;
  /** All variants in the active weapon's family */
  variantGroup: Weapon[];
  selectedPerks: Record<string, string>;
  activeBuffs: string[];
  /** 0-based stack index per stackable buff hash (e.g. "rampage" → 2 = ×3) */
  buffStacks: Record<string, number>;
  /**
   * Multi-state activation map for conditional perk effects (Effects Tab).
   *
   * Key:   selected perk hash (string)
   * Value: activation state
   *   0  → off (default — perk is equipped but effect not activated)
   *   1  → on / first stack
   *   2  → second stack (e.g. Rampage ×2)
   *   N  → Nth stack
   *
   * For boolean perks (Kill Clip) only 0/1 are used.
   * For stackable perks (Rampage, Swashbuckler) N maps to stacks[N-1] in the
   * buff database.
   */
  activeEffects: Record<string, number>;
  mode: GameMode;

  // Roll customisation
  masterworkStat: MasterworkStat | null;
  isCrafted: boolean;
  activeMod: WeaponMod;
  surgeStacks: 0 | 1 | 2 | 3 | 4;
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
  /**
   * Set the activation state for a conditional perk effect.
   * Pass 0 to deactivate.  Pass 1 for on/first-stack, 2 for second stack, etc.
   * This replaces the old toggleEffect — callers compute the desired next state.
   */
  setEffectState: (perkHash: string, state: number) => void;
  /** Set the active stack index (0-based) for a stackable buff */
  setBuffStack: (buffHash: string, stackIndex: number) => void;
  setMode: (mode: GameMode) => void;
  setMasterworkStat: (stat: MasterworkStat | null) => void;
  toggleCrafted: () => void;
  setActiveMod: (mod: WeaponMod) => void;
  setSurgeStacks: (stacks: 0 | 1 | 2 | 3 | 4) => void;
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
  buffStacks: {},
  activeEffects: {},
  mode: 'pve',

  masterworkStat: null,
  isCrafted: false,
  activeMod: WEAPON_MODS[0], // 'none'
  surgeStacks: 0,
  weaponsStat: 0,
  armorMods: DEFAULT_ARMOR_MODS,

  loadWeapon: (weapon, group) =>
    set({
      activeWeapon: weapon,
      variantGroup: group ?? [weapon],
      selectedPerks: {},
      activeBuffs: [],
      buffStacks: {},
      activeEffects: {},
      masterworkStat: null,
      isCrafted: false,
      activeMod: WEAPON_MODS[0],
      armorMods: DEFAULT_ARMOR_MODS,
    }),

  selectPerk: (columnName, perkHash) =>
    set((state) => {
      if (!state.activeWeapon) return state;

      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);

      /**
       * Resolve a perk hash to the perk that owns the buffKey.
       * Enhanced version hashes are NOT in column.perks directly — they live on
       * basePerk.enhancedVersion.  In that case we return the base perk so that
       * buffKey (which always lives on the base) is correctly found.
       */
      const resolvePerk = (hash: string) => {
        if (!column) return null;
        const direct = column.perks.find((p) => p.hash === hash);
        if (direct) return direct;
        // Hash belongs to an enhanced version → return the base perk
        return column.perks.find((p) => p.enhancedVersion?.hash === hash) ?? null;
      };

      const oldPerk = resolvePerk(state.selectedPerks[columnName]);
      const newPerk = resolvePerk(perkHash);

      let activeBuffs = [...state.activeBuffs];
      let buffStacks  = { ...state.buffStacks };
      // When a perk is deselected/replaced, remove its buff from activeBuffs.
      if (oldPerk?.buffKey && activeBuffs.includes(oldPerk.buffKey)) {
        activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
        const { [oldPerk.buffKey]: _removed, ...restStacks } = buffStacks;
        buffStacks = restStacks;
      }
      // Do NOT auto-enable the new perk's buff — user enables manually in Damage Buffs panel.

      // Also deactivate any conditional effect tied to the old perk
      const { [state.selectedPerks[columnName]]: _oldEffect, ...activeEffects } = state.activeEffects;
      return { selectedPerks: { ...state.selectedPerks, [columnName]: perkHash }, activeBuffs, buffStacks, activeEffects };
    }),

  clearPerk: (columnName) =>
    set((state) => {
      if (!state.activeWeapon) return state;
      const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
      const oldPerkHash = state.selectedPerks[columnName];

      // Resolve enhanced hashes the same way as selectPerk
      const oldPerk = oldPerkHash
        ? (column?.perks.find((p) => p.hash === oldPerkHash)
            ?? column?.perks.find((p) => p.enhancedVersion?.hash === oldPerkHash)
            ?? null)
        : null;

      let activeBuffs = [...state.activeBuffs];
      let buffStacks  = { ...state.buffStacks };
      if (oldPerk?.buffKey) {
        activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
        const { [oldPerk.buffKey]: _removed, ...restStacks } = buffStacks;
        buffStacks = restStacks;
      }

      const { [columnName]: _removed, ...rest } = state.selectedPerks;
      const { [oldPerkHash ?? '']: _oldEffect, ...activeEffects } = state.activeEffects;
      return { selectedPerks: rest, activeBuffs, buffStacks, activeEffects };
    }),

  toggleBuff: (buffHash) =>
    set((state) => {
      const isActive = state.activeBuffs.includes(buffHash);
      if (isActive) {
        // Deactivate — also clear the saved stack index
        const { [buffHash]: _removed, ...restStacks } = state.buffStacks;
        return {
          activeBuffs: state.activeBuffs.filter((h) => h !== buffHash),
          buffStacks: restStacks,
        };
      }
      // Activate — default stackable buffs to max stack (last index)
      const buff = BUFF_DATABASE[buffHash];
      const buffStacks = { ...state.buffStacks };
      if (buff?.stacks?.length) {
        buffStacks[buffHash] = buff.stacks.length - 1;
      }
      return { activeBuffs: [...state.activeBuffs, buffHash], buffStacks };
    }),

  setBuffStack: (buffHash, stackIndex) =>
    set((state) => ({
      buffStacks: { ...state.buffStacks, [buffHash]: stackIndex },
    })),

  setEffectState: (perkHash, state) =>
    set((s) => {
      if (state <= 0) {
        // Remove the key entirely when turning off
        const { [perkHash]: _removed, ...rest } = s.activeEffects;
        return { activeEffects: rest };
      }
      return { activeEffects: { ...s.activeEffects, [perkHash]: state } };
    }),

  setMode: (mode) => set({ mode }),
  setMasterworkStat: (stat) => set({ masterworkStat: stat }),
  toggleCrafted: () => set((s) => ({ isCrafted: !s.isCrafted })),
  setActiveMod: (mod) => set({ activeMod: mod }),
  setSurgeStacks: (stacks) => set({ surgeStacks: stacks }),
  setWeaponsStat: (stat) => set({ weaponsStat: Math.max(0, Math.min(200, stat)) }),
  setArmorMods: (mods) => set((s) => ({ armorMods: { ...s.armorMods, ...mods } })),

  getCalculatedStats: () => {
    const { activeWeapon, selectedPerks, activeEffects, masterworkStat, isCrafted, activeMod, armorMods } = get();
    if (!activeWeapon) return {};

    const finalStats: StatMap = { ...activeWeapon.baseStats };

    // Perk stat modifiers.
    // Enhanced perk hashes are stored on basePerk.enhancedVersion — they don't appear
    // directly in column.perks.  When the direct lookup misses, fall back to the
    // enhancedVersion object so its statModifiers are always applied.
    //
    // Each PerkMod carries an optional isConditional flag (e.g. Eye of the Storm's
    // Handling bonus only applies at low health).  Conditionally-active mods are
    // gated on the perk having a non-zero state in activeEffects.  Always-on mods
    // (isConditional = false/undefined) apply regardless of the toggle state.
    for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
      const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
      if (!column) continue;

      // Resolve to the actual perk object (handles enhanced hash look-up)
      let perk = column.perks.find((p) => p.hash === perkHash) ?? null;
      const basePerk = perk ?? column.perks.find((p) => p.enhancedVersion?.hash === perkHash) ?? null;
      if (!perk && basePerk) perk = basePerk.enhancedVersion ?? null;
      if (!perk) continue;

      const effectState = activeEffects[perkHash] ?? 0;
      const isEffectActive = effectState > 0;

      for (const mod of perk.statModifiers) {
        // Conditionally-active mods only apply when the Effects Tab toggle is on
        if ((mod.isConditional ?? false) && !isEffectActive) continue;
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

    // Enhanced perks: the manifest already stores the correct stat values for
    // enhanced variants (e.g. +12 vs +10 Range).  The first loop above applies
    // the selected perk's statModifiers directly, so no additional +2 is needed.
    // The old +2 loop was removed — it caused double-counting for enhanced perks.

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
    const { activeWeapon, selectedPerks, activeEffects, activeBuffs, buffStacks, activeMod, surgeStacks, mode, weaponsStat } = get();

    // Collect buff keys + their effective stack index from conditional perk
    // effects that are toggled ON in the Effects Tab.
    //
    // activeEffects[perkHash] encodes both on/off and stack level:
    //   0         → off, skip
    //   1         → on at first stack (stacks[0]) or full multiplier if no stacks
    //   N         → Nth stack (stacks[N-1])
    const effectBuffEntries: Array<{ key: string; stackIndex: number }> = [];
    if (activeWeapon) {
      for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
        const effectState = activeEffects[perkHash] ?? 0;
        if (effectState === 0) continue;

        const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
        if (!column) continue;
        const basePerk = column.perks.find((p) => p.hash === perkHash)
          ?? column.perks.find((p) => p.enhancedVersion?.hash === perkHash)
          ?? null;
        const buffKey = basePerk?.buffKey ?? null;
        if (!buffKey) continue;

        // Map state value → 0-based stack index (state 1 → index 0)
        effectBuffEntries.push({ key: buffKey, stackIndex: effectState - 1 });
      }
    }

    // Build combined active-buff list for multiplicative/empowering/debuff math.
    // activeBuffs = subclass + external manual buffs (no weapon_perk entries
    // remain there after the BuffToggle cleanup).
    // effectBuffEntries = perk buffs activated via Effects Tab.
    // Deduplicate by key so a buff can't be counted twice.
    const seenBuffKeys = new Set<string>();
    const allActiveBuffs: string[] = [];
    // Add effect-activated perk buffs first so their stack index wins
    const effectStackByKey: Record<string, number> = {};
    for (const { key, stackIndex } of effectBuffEntries) {
      if (!seenBuffKeys.has(key)) {
        seenBuffKeys.add(key);
        allActiveBuffs.push(key);
        effectStackByKey[key] = stackIndex;
      }
    }
    for (const hash of activeBuffs) {
      if (!seenBuffKeys.has(hash)) {
        seenBuffKeys.add(hash);
        allActiveBuffs.push(hash);
      }
    }

    // Weapon perk buffs stack multiplicatively with each other.
    // Empowering buffs are mutually exclusive — only the highest applies.
    // Debuffs are mutually exclusive — only the highest applies.
    let multiplicative = 1;
    let maxEmpowering  = 1;
    let maxDebuff      = 1;

    for (const hash of allActiveBuffs) {
      const buff = BUFF_DATABASE[hash];
      if (!buff) continue;
      // For effect-activated perk buffs, use the stack index derived from
      // activeEffects state; for manual buffs, fall back to buffStacks.
      const stackIdx = hash in effectStackByKey ? effectStackByKey[hash] : buffStacks[hash];
      const mult = getBuffMultiplier(buff, stackIdx);
      if (buff.stackType === 'multiplicative') {
        multiplicative *= mult;
      } else if (buff.stackType === 'empowering') {
        if (mult > maxEmpowering) maxEmpowering = mult;
      } else if (buff.stackType === 'debuff') {
        if (mult > maxDebuff) maxDebuff = mult;
      }
    }

    let multiplier = multiplicative * maxEmpowering * maxDebuff;
    // Weapon mod damage bonus
    multiplier *= activeMod.damageMultiplier;

    if (mode === 'pve') {
      // PvE Weapon Surge (element-matching armor surge mod)
      multiplier *= SURGE_PVE[surgeStacks] ?? 1;
      // Weapons stat PvE bonus (formerly Mobility):
      //   1–100:   0–15% vs minors/majors (Primary/Special)
      //   101–200: additional 0–15% vs bosses
      const tier1 = Math.min(weaponsStat, 100) / 100;
      const tier2 = Math.max(0, weaponsStat - 100) / 100;
      multiplier *= (1 + tier1 * 0.15 + tier2 * 0.15);
    } else if (mode === 'pvp') {
      // PvP Weapon Surge (lower values — 3%/4.5%/5.5%/6%)
      multiplier *= SURGE_PVP[surgeStacks] ?? 1;
      // Weapons stat PvP bonus:
      //   1–100:   no bonus vs Guardians (PvE targets only)
      //   101–200: 0–5% bonus damage vs Guardians
      const pvpTier = Math.max(0, weaponsStat - 100) / 100;   // 0.0 → 1.0
      multiplier *= (1 + pvpTier * 0.05);
    }

    return multiplier;
  },
}));
