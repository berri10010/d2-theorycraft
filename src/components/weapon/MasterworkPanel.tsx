'use client';

import React from 'react';
import {
  useWeaponStore,
  MASTERWORK_STATS,
  WEAPON_MODS,
  MasterworkStat,
  WeaponMod,
  SURGE_PVE,
  SURGE_PVP,
} from '../../store/useWeaponStore';

export const MasterworkPanel: React.FC = () => {
  const {
    activeWeapon,
    masterworkStat, setMasterworkStat,
    activeMod, setActiveMod,
    surgeStacks, setSurgeStacks,
    mode,
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

      {/* ── Weapon Surge — shown in both modes, values differ ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Weapon Surge
          </h3>
          {surgeStacks > 0 && (
            <span className="text-[10px] font-semibold text-amber-400">
              +{(((mode === 'pve' ? SURGE_PVE : SURGE_PVP)[surgeStacks] ?? 1) - 1) * 100}% dmg
            </span>
          )}
        </div>

        <div className="flex gap-1.5">
          {([0, 1, 2, 3, 4] as const).map((stacks) => (
            <button
              key={stacks}
              onClick={() => setSurgeStacks(stacks)}
              title={stacks === 4 ? 'Stack 4 — Artifact or Exotic Armor only' : undefined}
              className={[
                'flex-1 text-xs font-bold py-2 rounded-md border transition-all',
                surgeStacks === stacks
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300',
                stacks === 4 ? 'opacity-60' : '',
              ].join(' ')}
            >
              {stacks === 0 ? 'Off' : `${stacks}×`}
            </button>
          ))}
        </div>

        {/* PvE / PvP value grid */}
        <div className="grid grid-cols-2 gap-x-3 mt-2 text-[10px] text-slate-600">
          <div>
            <span className="text-blue-400 font-bold">PvE:</span>{' '}
            {[1, 2, 3, 4].map((s) => `${((SURGE_PVE[s] - 1) * 100).toFixed(0)}%`).join(' | ')}
          </div>
          <div>
            <span className="text-red-400 font-bold">PvP:</span>{' '}
            {[1, 2, 3, 4].map((s) => `${((SURGE_PVP[s] - 1) * 100).toFixed(1)}%`).join(' | ')}
          </div>
        </div>
        <p className="text-[10px] text-slate-700 mt-0.5">×4 via Artifact or Exotic Armor only.</p>
      </div>
    </div>
  );
};
