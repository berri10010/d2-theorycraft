import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
export const SURGE_PVE: Record<number, number> = { 0: 1.00, 1: 1.10, 2: 1.17, 3: 1.22, 4: 1.25 };
export const SURGE_PVP: Record<number, number> = { 0: 1.00, 1: 1.03, 2: 1.045, 3: 1.055, 4: 1.06 };

// ─── Per-weapon roll cache ────────────────────────────────────────────────────
//
// When you switch weapons, the current weapon's roll (perks, mods, masterwork,
// armor mods, conditional effects) is saved here keyed by weapon hash.
// Switching back to a weapon restores its roll automatically.
// Persisted to localStorage so rolls survive page reloads.
//
// Note: activeBuffs and buffStacks are intentionally global (not per-weapon)
// so subclass / exotic / empowering buff selections carry across weapons.

interface WeaponRoll {
  selectedPerks:  Record<string, string>;
  masterworkStat: MasterworkStat | null;
  isCrafted:      boolean;
  activeModId:    string;           // id field from WEAPON_MODS
  armorMods:      ArmorModState;
  activeEffects:  Record<string, number>;
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface WeaponState {
  activeWeapon:      Weapon | null;
  /** Persisted hash used to restore the active weapon on page reload. */
  activeWeaponHash:  string | null;
  variantGroup:      Weapon[];
  selectedPerks:     Record<string, string>;
  activeBuffs:       string[];
  buffStacks:        Record<string, number>;
  /**
   * Multi-state activation map for conditional perk effects (Effects Tab).
   *   0  → off (default)
   *   1  → on / first stack
   *   N  → Nth stack
   */
  activeEffects:     Record<string, number>;
  mode:              GameMode;

  masterworkStat:    MasterworkStat | null;
  isCrafted:         boolean;
  activeMod:         WeaponMod;
  surgeStacks:       0 | 1 | 2 | 3 | 4;
  weaponsStat:       number;
  armorMods:         ArmorModState;

  /** Per-weapon roll cache, keyed by weapon hash. Persisted to localStorage. */
  weaponRolls:       Record<string, WeaponRoll>;

  // Actions
  loadWeapon:        (weapon: Weapon, group?: Weapon[]) => void;
  selectPerk:        (columnName: string, perkHash: string) => void;
  clearPerk:         (columnName: string) => void;
  /** Reset all per-weapon state to defaults and remove its cached roll. */
  clearRoll:         () => void;
  toggleBuff:        (buffHash: string) => void;
  setEffectState:    (perkHash: string, state: number) => void;
  setBuffStack:      (buffHash: string, stackIndex: number) => void;
  setMode:           (mode: GameMode) => void;
  setMasterworkStat: (stat: MasterworkStat | null) => void;
  toggleCrafted:     () => void;
  setActiveMod:      (mod: WeaponMod) => void;
  setSurgeStacks:    (stacks: 0 | 1 | 2 | 3 | 4) => void;
  setWeaponsStat:    (stat: number) => void;
  setArmorMods:      (mods: Partial<ArmorModState>) => void;

  // Computed
  getCalculatedStats:  () => StatMap;
  getDamageMultiplier: () => number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pre-select every single-option perk column so their stat modifiers are
 * always active in calculations without any user interaction required.
 * Fixed-slot perks (barrel, mag, exotic intrinsics with only one choice)
 * are not real user choices — they should be auto-applied on load.
 */
function autoSelectFixedPerks(weapon: Weapon): Record<string, string> {
  const result: Record<string, string> = {};
  for (const col of weapon.perkSockets) {
    if (col.perks.length === 1) {
      result[col.name] = col.perks[0].hash;
    }
  }
  return result;
}

function captureRoll(state: WeaponState): WeaponRoll {
  return {
    selectedPerks:  state.selectedPerks,
    masterworkStat: state.masterworkStat,
    isCrafted:      state.isCrafted,
    activeModId:    state.activeMod.id,
    armorMods:      state.armorMods,
    activeEffects:  state.activeEffects,
  };
}

/**
 * Returns true if the roll has no meaningful user customisation.
 * Auto-selected fixed-column perks don't count — they're always present
 * by default and would otherwise prevent the cache-skip optimisation.
 */
function isDefaultRoll(roll: WeaponRoll, weapon: Weapon): boolean {
  const fixedKeys = new Set(
    weapon.perkSockets.filter((c) => c.perks.length === 1).map((c) => c.name),
  );
  const userSelectedKeys = Object.keys(roll.selectedPerks).filter((k) => !fixedKeys.has(k));
  return (
    userSelectedKeys.length === 0 &&
    roll.masterworkStat === null &&
    !roll.isCrafted &&
    roll.activeModId === 'none' &&
    Object.values(roll.armorMods).every((v) => v === 0) &&
    Object.keys(roll.activeEffects).length === 0
  );
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWeaponStore = create<WeaponState>()(
  persist(
    (set, get) => ({
      activeWeapon:      null,
      activeWeaponHash:  null,
      variantGroup:      [],
      selectedPerks:     {},
      activeBuffs:       [],
      buffStacks:        {},
      activeEffects:     {},
      mode:              'pve',
      masterworkStat:    null,
      isCrafted:         false,
      activeMod:         WEAPON_MODS[0],
      surgeStacks:       0,
      weaponsStat:       0,
      armorMods:         DEFAULT_ARMOR_MODS,
      weaponRolls:       {},

      // ── loadWeapon ──────────────────────────────────────────────────────────
      // Saves the outgoing weapon's roll, then restores the incoming weapon's
      // saved roll (or starts fresh if none exists).
      // Global state — activeBuffs, buffStacks, mode, weaponsStat, surgeStacks
      // — is preserved across weapon switches intentionally.
      loadWeapon: (weapon, group) => {
        const state = get();

        // Save current weapon's roll before switching
        let weaponRolls = state.weaponRolls;
        if (state.activeWeapon && state.activeWeapon.hash !== weapon.hash) {
          const roll = captureRoll(state);
          if (!isDefaultRoll(roll, state.activeWeapon)) {
            weaponRolls = { ...weaponRolls, [state.activeWeapon.hash]: roll };
          }
        }

        // Restore saved roll for the new weapon (or use defaults).
        // Always seed with auto-selected fixed perks first so single-option
        // columns are always active — saved user choices overlay on top.
        const saved      = weaponRolls[weapon.hash];
        const fixedPerks = autoSelectFixedPerks(weapon);
        const newMod = saved
          ? (WEAPON_MODS.find((m) => m.id === saved.activeModId) ?? WEAPON_MODS[0])
          : WEAPON_MODS[0];

        set({
          activeWeapon:     weapon,
          activeWeaponHash: weapon.hash,
          variantGroup:     group ?? [weapon],
          weaponRolls,
          selectedPerks:    saved ? { ...fixedPerks, ...saved.selectedPerks } : fixedPerks,
          masterworkStat:   saved?.masterworkStat ?? null,
          isCrafted:        saved?.isCrafted      ?? false,
          activeMod:        newMod,
          armorMods:        saved?.armorMods      ?? DEFAULT_ARMOR_MODS,
          activeEffects:    saved?.activeEffects  ?? {},
          // activeBuffs / buffStacks intentionally preserved (global)
        });
      },

      // ── clearRoll ───────────────────────────────────────────────────────────
      // Resets all per-weapon state to defaults and removes the cached roll so
      // switching away and back starts fresh too.
      clearRoll: () => {
        const { activeWeapon, weaponRolls } = get();
        if (!activeWeapon) return;
        const { [activeWeapon.hash]: _removed, ...remainingRolls } = weaponRolls;
        set({
          selectedPerks:  autoSelectFixedPerks(activeWeapon),
          masterworkStat: null,
          isCrafted:      false,
          activeMod:      WEAPON_MODS[0],
          armorMods:      DEFAULT_ARMOR_MODS,
          activeEffects:  {},
          weaponRolls:    remainingRolls,
        });
      },

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
            return column.perks.find((p) => p.enhancedVersion?.hash === hash) ?? null;
          };

          const oldPerk = resolvePerk(state.selectedPerks[columnName]);

          let activeBuffs = [...state.activeBuffs];
          let buffStacks  = { ...state.buffStacks };
          if (oldPerk?.buffKey && activeBuffs.includes(oldPerk.buffKey)) {
            activeBuffs = activeBuffs.filter((b) => b !== oldPerk.buffKey);
            const { [oldPerk.buffKey]: _removed, ...restStacks } = buffStacks;
            buffStacks = restStacks;
          }

          const { [state.selectedPerks[columnName]]: _oldEffect, ...activeEffects } = state.activeEffects;
          return { selectedPerks: { ...state.selectedPerks, [columnName]: perkHash }, activeBuffs, buffStacks, activeEffects };
        }),

      clearPerk: (columnName) =>
        set((state) => {
          if (!state.activeWeapon) return state;
          const column = state.activeWeapon.perkSockets.find((c) => c.name === columnName);
          const oldPerkHash = state.selectedPerks[columnName];

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
            const { [buffHash]: _removed, ...restStacks } = state.buffStacks;
            return {
              activeBuffs: state.activeBuffs.filter((h) => h !== buffHash),
              buffStacks: restStacks,
            };
          }
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
            const { [perkHash]: _removed, ...rest } = s.activeEffects;
            return { activeEffects: rest };
          }
          return { activeEffects: { ...s.activeEffects, [perkHash]: state } };
        }),

      setMode:           (mode)   => set({ mode }),
      setMasterworkStat: (stat)   => set({ masterworkStat: stat }),
      toggleCrafted:     ()       => set((s) => ({ isCrafted: !s.isCrafted })),
      setActiveMod:      (mod)    => set({ activeMod: mod }),
      setSurgeStacks:    (stacks) => set({ surgeStacks: stacks }),
      setWeaponsStat:    (stat)   => set({ weaponsStat: Math.max(0, Math.min(200, stat)) }),
      setArmorMods:      (mods)   => set((s) => ({ armorMods: { ...s.armorMods, ...mods } })),

      getCalculatedStats: () => {
        const { activeWeapon, selectedPerks, activeEffects, masterworkStat, isCrafted, activeMod, armorMods } = get();
        if (!activeWeapon) return {};

        const finalStats: StatMap = { ...activeWeapon.baseStats };

        // Perk stat modifiers.
        for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
          const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
          if (!column) continue;

          let perk = column.perks.find((p) => p.hash === perkHash) ?? null;
          const basePerk = perk ?? column.perks.find((p) => p.enhancedVersion?.hash === perkHash) ?? null;
          if (!perk && basePerk) perk = basePerk.enhancedVersion ?? null;
          if (!perk) continue;

          const effectState    = activeEffects[perkHash] ?? 0;
          const isEffectActive = effectState > 0;

          for (const mod of perk.statModifiers) {
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

        // Weapon mod stat changes
        for (const [stat, delta] of Object.entries(activeMod.statChanges)) {
          if (delta && finalStats[stat] !== undefined) {
            finalStats[stat] = Math.max(0, Math.min(100, finalStats[stat] + delta));
          }
        }

        // Armor mod stat bonuses
        for (const [stat, delta] of Object.entries(armorModStatDeltas(armorMods))) {
          if (delta && finalStats[stat] !== undefined) {
            finalStats[stat] = Math.max(0, Math.min(100, finalStats[stat] + delta));
          }
        }

        // isCrafted is tracked in state; stat impact is via perk slot availability
        void isCrafted;

        return finalStats;
      },

      getDamageMultiplier: () => {
        const { activeWeapon, selectedPerks, activeEffects, activeBuffs, buffStacks, activeMod, surgeStacks, mode, weaponsStat } = get();

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

            effectBuffEntries.push({ key: buffKey, stackIndex: effectState - 1 });
          }
        }

        const seenBuffKeys     = new Set<string>();
        const allActiveBuffs:  string[] = [];
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

        let multiplicative = 1;
        let maxEmpowering  = 1;
        let maxDebuff      = 1;

        for (const hash of allActiveBuffs) {
          const buff = BUFF_DATABASE[hash];
          if (!buff) continue;
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
        multiplier *= activeMod.damageMultiplier;

        if (mode === 'pve') {
          multiplier *= SURGE_PVE[surgeStacks] ?? 1;
          const tier1 = Math.min(weaponsStat, 100) / 100;
          const tier2 = Math.max(0, weaponsStat - 100) / 100;
          multiplier *= (1 + tier1 * 0.15 + tier2 * 0.15);
        } else if (mode === 'pvp') {
          multiplier *= SURGE_PVP[surgeStacks] ?? 1;
          const pvpTier = Math.max(0, weaponsStat - 100) / 100;
          multiplier *= (1 + pvpTier * 0.05);
        }

        return multiplier;
      },
    }),
    {
      name: 'd2tc-weapon',
      // Only persist fields meaningful across reloads.
      // activeWeapon is NOT persisted (large object); it's restored from the DB
      // using activeWeaponHash when weapons load.
      partialize: (state) => ({
        activeWeaponHash: state.activeWeaponHash,
        weaponRolls:      state.weaponRolls,
        mode:             state.mode,
        weaponsStat:      state.weaponsStat,
        surgeStacks:      state.surgeStacks,
        activeBuffs:      state.activeBuffs,
        buffStacks:       state.buffStacks,
      }),
    }
  )
);

// Silence unused import — WeaponGroup is used by callers that import from this module.
export type { WeaponGroup };
