'use client';

import React from 'react';
import {
  useWeaponStore,
  MASTERWORK_STATS,
  WEAPON_MODS,
  MasterworkStat,
} from '../../store/useWeaponStore';

export const MasterworkPanel: React.FC = () => {
  const {
    activeWeapon,
    masterworkStat, setMasterworkStat,
    activeMod, setActiveMod,
  } = useWeaponStore();

  if (!activeWeapon) return null;

  const isAdept = activeWeapon.isAdept;

  // Filter mods: non-adept weapons can't use Adept mods
  const availableMods = WEAPON_MODS.filter((m) => !m.adeptOnly || isAdept);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10 space-y-5">
      <h2 className="text-xl font-bold text-white">Masterwork & Mods</h2>

      {/* ── Masterwork stat selector ───────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Masterwork
          </h3>
          {isAdept && (
            <span className="text-[10px] text-amber-400 font-semibold">
              Adept: +10 chosen, +3 all others
            </span>
          )}
          {!isAdept && masterworkStat && (
            <span className="text-[10px] text-slate-500">
              +10 to {masterworkStat}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {MASTERWORK_STATS.map((stat) => {
            const isActive = masterworkStat === stat;
            return (
              <button
                key={stat}
                onClick={() => setMasterworkStat(isActive ? null : stat as MasterworkStat)}
                className={[
                  'text-xs font-semibold px-2.5 py-1 rounded-md border transition-all',
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                ].join(' ')}
              >
                {stat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Weapon mod selector ────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Weapon Mod
          {isAdept && <span className="ml-2 text-amber-400/60 normal-case tracking-normal">Adept mods available</span>}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {availableMods.map((mod) => {
            const isActive = activeMod.id === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveMod(mod)}
                title={mod.description}
                className={[
                  'text-xs font-semibold px-2.5 py-1 rounded-md border transition-all',
                  isActive
                    ? mod.adeptOnly
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                  mod.adeptOnly && !isActive ? 'border-amber-900/40 text-amber-600' : '',
                ].join(' ')}
              >
                {mod.name}
              </button>
            );
          })}
        </div>

        {activeMod.id !== 'none' && (
          <p className="text-xs text-slate-500 mt-2">{activeMod.description}</p>
        )}
      </div>

    </div>
  );
};
