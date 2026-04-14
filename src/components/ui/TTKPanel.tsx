'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calculateTTK, PVE_HEALTH_TIERS } from '../../lib/damageMath';

// PvP guardian HP is fixed at 230 in the current armor rework.
const PVP_GUARDIAN_HP = 230;

// Stable list so Object.keys() isn't called on every render
const PVE_TIERS_KEYS = Object.keys(PVE_HEALTH_TIERS);

export const TTKPanel: React.FC = () => {
  // Narrow subscription: getDamageMultiplier depends on activeBuffs, activeMod,
  // surgeStacks, mode, and weaponsStat — nothing else.
  const {
    activeWeapon,
    getDamageMultiplier,
    mode,
    weaponsStat, setWeaponsStat,
    activeBuffs,
    activeMod,
    surgeStacks,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:       s.activeWeapon,
      getDamageMultiplier: s.getDamageMultiplier,
      mode:               s.mode,
      weaponsStat:        s.weaponsStat,
      setWeaponsStat:     s.setWeaponsStat,
      activeBuffs:        s.activeBuffs,
      activeMod:          s.activeMod,
      surgeStacks:        s.surgeStacks,
    }))
  );

  const [enemyTier, setEnemyTier] = useState(PVE_TIERS_KEYS[0]);

  // Memoize the multiplier so it only recomputes when buff/mod/surge/mode inputs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const multiplier = useMemo(() => getDamageMultiplier(), [
    activeBuffs, activeMod, surgeStacks, mode, weaponsStat,
  ]);

  if (!activeWeapon) return null;

  const result = calculateTTK(
    mode,
    activeWeapon,
    multiplier,
    PVP_GUARDIAN_HP,
    enemyTier,
  );

  // PvP weapons bonus: only the 101–200 tier applies vs Guardians (0–5%)
  const pvpWeaponsBonus = Math.max(0, weaponsStat - 100) / 100 * 0.05;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Time-to-Kill</h2>
        {multiplier > 1 && (
          <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded">
            ×{multiplier.toFixed(2)} dmg
          </span>
        )}
      </div>

      {/* ── PvP controls ─────────────────────────────── */}
      {mode === 'pvp' && (
        <div className="mb-4 space-y-3">
          {/* Fixed HP callout */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Guardian HP</span>
            <span className="font-mono font-bold text-white">{PVP_GUARDIAN_HP}</span>
          </div>

          {/* Weapons Stat — PvP only cares about 100–200 (the tier 2 range) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Weapons Stat</span>
              <span className={[
                'text-xs font-bold tabular-nums',
                weaponsStat > 100 ? 'text-amber-400' : 'text-slate-500',
              ].join(' ')}>
                {weaponsStat}
                {pvpWeaponsBonus > 0
                  ? ` · +${(pvpWeaponsBonus * 100).toFixed(1)}% vs Guardians`
                  : ' · no PvP bonus'}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={200}
              value={Math.max(100, weaponsStat)}
              onChange={(e) => setWeaponsStat(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 rounded-full cursor-pointer"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[100, 120, 140, 160, 180, 200].map((v) => (
                <button
                  key={v}
                  onClick={() => setWeaponsStat(v)}
                  className={[
                    'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors',
                    weaponsStat === v
                      ? v > 100
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-white/10 border-white/20 text-slate-300'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600">
              100 = baseline (0% bonus). 200 = +5% vs Guardians. Range below 100 only affects PvE.
            </p>
          </div>
        </div>
      )}

      {/* ── PvE: enemy-type selector ──────────────────── */}
      {mode === 'pve' && (
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-1">Enemy Type</label>
          <select
            value={enemyTier}
            onChange={(e) => setEnemyTier(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {Object.entries(PVE_HEALTH_TIERS).map(([tier, hp]) => (
              <option key={tier} value={tier}>{tier} ({hp} HP)</option>
            ))}
          </select>
        </div>
      )}

      {result ? (
        <div className="space-y-3">
          {/* TTK + Shot count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
              <span className="text-sm text-slate-400 mb-1">TTK</span>
              <span className={
                'text-3xl font-mono font-bold ' + (multiplier > 1 ? 'text-amber-400' : 'text-white')
              }>
                {result.ttk === 0 ? '1st shot' : `${result.ttk.toFixed(2)}s`}
              </span>
            </div>
            <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
              <span className="text-sm text-slate-400 mb-1">Shots</span>
              <span className="text-3xl font-mono font-bold text-white">{result.shotsToKill}</span>
              <span className="text-xs text-slate-500 mt-2">to kill</span>
            </div>
          </div>

          {/* Optimal headshot / bodyshot breakdown */}
          <div className="bg-black/30 px-4 py-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 shrink-0">Optimal pattern</span>
            <div className="flex items-center gap-2 font-mono font-semibold text-sm">
              {result.crits > 0 && (
                <span className="text-amber-400">
                  {result.crits}× Head
                </span>
              )}
              {result.crits > 0 && result.bodies > 0 && (
                <span className="text-slate-600">+</span>
              )}
              {result.bodies > 0 && (
                <span className="text-slate-300">
                  {result.bodies}× Body
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 p-4 rounded-lg border border-white/10 text-center text-slate-500 text-sm">
          TTK calculation not available for this weapon type.
        </div>
      )}
    </div>
  );
};
