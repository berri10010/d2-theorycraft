'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { interpolateStat } from '../../lib/math';

const STAT_TRANSLATIONS: Record<string, { label: string; unit: string }> = {
  Range:    { label: 'Falloff', unit: 'm' },
  Handling: { label: 'Ready',   unit: 's' },
  Reload:   { label: 'Time',    unit: 's' },
};

// Superset of all possible bar stats across weapon types.
// Each weapon only shows the subset present in its baseStats so inapplicable
// stats (e.g. Impact / Range for Rocket Launchers) are automatically hidden.
const ALL_BAR_STAT_KEYS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance'];

// Stats shown as plain numbers (no meaningful 0-100 bar)
const NUMERIC_STAT_KEYS = ['Zoom', 'Airborne Effectiveness', 'Inventory Size', 'Recoil Direction', 'Magazine'];

export const StatDisplay: React.FC = () => {
  // Narrow subscription: only re-render when stat-affecting state changes.
  // Mode, activeBuffs, surgeStacks do NOT affect getCalculatedStats — excluding
  // them prevents spurious re-renders when the user toggles PvE/PvP or buffs.
  const {
    activeWeapon,
    getCalculatedStats,
    selectedPerks,
    masterworkStat,
    isCrafted,
    activeMod,
    armorMods,
    activeEffects,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:       s.activeWeapon,
      getCalculatedStats: s.getCalculatedStats,
      selectedPerks:      s.selectedPerks,
      masterworkStat:     s.masterworkStat,
      isCrafted:          s.isCrafted,
      activeMod:          s.activeMod,
      armorMods:          s.armorMods,
      // activeEffects gates conditional perk stat mods — must be a dep so
      // toggling Effects Tab toggles correctly refreshes the stat bars.
      activeEffects:      s.activeEffects,
    }))
  );

  // Memoize so the computation only reruns when its inputs actually change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calcStats = useMemo(() => getCalculatedStats(), [
    activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods, activeEffects,
  ]);

  if (!activeWeapon) return null;

  const baseStats = activeWeapon.baseStats;

  // Only show bar stats that this weapon type actually has — hides irrelevant
  // stats like Impact/Range for Rocket Launchers or Stability/Reload for Swords.
  const barStatKeys = ALL_BAR_STAT_KEYS.filter((k) => baseStats[k] !== undefined);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-white">Weapon Stats</h2>
      <div className="flex flex-col gap-4">
        {barStatKeys.map((statName) => {
          const base    = baseStats[statName] ?? 0;
          const current = calcStats[statName] ?? base;
          const diff    = current - base;
          const curve   = activeWeapon.statCurves[statName];
          const translated = interpolateStat(current, curve);
          const info    = STAT_TRANSLATIONS[statName];

          return (
            <div key={statName} className="flex items-center text-sm md:text-base">
              <div className="w-28 md:w-32 font-medium text-slate-300 shrink-0">{statName}</div>

              <div className="flex-1 h-3 bg-black rounded-full overflow-hidden relative mx-4">
                <div
                  className="absolute top-0 left-0 h-full bg-slate-300 transition-all duration-300"
                  style={{ width: `${Math.min(base, 100)}%` }}
                />
                {diff > 0 && (
                  <div
                    className="absolute top-0 h-full bg-green-500 transition-all duration-300 opacity-90"
                    style={{ left: `${Math.min(base, 100)}%`, width: `${Math.min(diff, 100 - base)}%` }}
                  />
                )}
                {diff < 0 && (
                  <div
                    className="absolute top-0 h-full bg-red-500 transition-all duration-300 opacity-90"
                    style={{ left: `${Math.max(current, 0)}%`, width: `${Math.abs(diff)}%` }}
                  />
                )}
              </div>

              <div className="w-20 text-right font-mono flex flex-col justify-center items-end">
                <span className={
                  'font-bold ' +
                  (diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white')
                }>
                  {current}
                  {diff !== 0 && (
                    <span className="text-xs ml-1">({diff > 0 ? '+' : ''}{diff})</span>
                  )}
                </span>
                {translated !== null && info && (
                  <span className="text-xs text-amber-500">
                    {translated.toFixed(2)}{info.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Numeric-only stats */}
      {NUMERIC_STAT_KEYS.some((k) => (calcStats[k] ?? baseStats[k]) !== undefined) && (
        <>
          <div className="border-t border-white/10 mt-2 pt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Additional Stats</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {NUMERIC_STAT_KEYS.map((statName) => {
                const base    = baseStats[statName];
                const current = calcStats[statName] ?? base;
                if (current === undefined) return null;
                const diff = current - (base ?? current);
                return (
                  <div key={statName} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{statName}</span>
                    <span className={
                      'font-mono font-bold ' +
                      (diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white')
                    }>
                      {current}
                      {diff !== 0 && (
                        <span className="text-xs ml-1">({diff > 0 ? '+' : ''}{diff})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
