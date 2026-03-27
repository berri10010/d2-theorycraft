'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { interpolateStat } from '../../lib/math';

const STAT_TRANSLATIONS: Record<string, { label: string; unit: string }> = {
  Range:    { label: 'Falloff', unit: 'm' },
  Handling: { label: 'Ready',   unit: 's' },
  Reload:   { label: 'Time',    unit: 's' },
};

const STAT_KEYS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance'];

export const StatDisplay: React.FC = () => {
  const { activeWeapon, getCalculatedStats } = useWeaponStore();
  if (!activeWeapon) return null;

  const baseStats  = activeWeapon.baseStats;
  const calcStats  = getCalculatedStats();

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-6 text-slate-100">Weapon Stats</h2>
      <div className="flex flex-col gap-4">
        {STAT_KEYS.map((statName) => {
          const base    = baseStats[statName] ?? 0;
          const current = calcStats[statName] ?? base;
          const diff    = current - base;
          const curve   = activeWeapon.statCurves[statName];
          const translated = interpolateStat(current, curve);
          const info    = STAT_TRANSLATIONS[statName];

          return (
            <div key={statName} className="flex items-center text-sm md:text-base">
              <div className="w-28 md:w-32 font-medium text-slate-300 shrink-0">{statName}</div>

              <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden relative mx-4">
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
                  (diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-100')
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
    </div>
  );
};
