'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calculateTTK, PVE_HEALTH_TIERS } from '../../lib/damageMath';
import { useState } from 'react';

// PvP guardian HP is fixed at 230 in the current armor rework.
const PVP_GUARDIAN_HP = 230;

export const TTKPanel: React.FC = () => {
  const {
    activeWeapon,
    getDamageMultiplier,
    mode,
    weaponsStat, setWeaponsStat,
  } = useWeaponStore();

  const [enemyTier, setEnemyTier] = useState(Object.keys(PVE_HEALTH_TIERS)[0]);

  if (!activeWeapon) return null;

  const multiplier  = getDamageMultiplier();
  const enemyHealth = PVE_HEALTH_TIERS[enemyTier] ?? 336;

  const result = calculateTTK(
    mode,
    activeWeapon.itemSubType,
    activeWeapon.rpm,
    multiplier,
    PVP_GUARDIAN_HP,
    enemyHealth,
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

          {/* Weapons Stat — 101–200 tier only applies to PvP */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Weapons Stat
                <span className="text-slate-600 text-xs ml-1">(101–200 tier)</span>
              </span>
              <span className={[
                'text-xs font-bold tabular-nums',
                weaponsStat > 100 ? 'text-amber-400' : 'text-slate-600',
              ].join(' ')}>
                {weaponsStat}
                {pvpWeaponsBonus > 0
                  ? ` · +${(pvpWeaponsBonus * 100).toFixed(1)}% vs Guardians`
                  : ' · no PvP bonus'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              value={weaponsStat}
              onChange={(e) => setWeaponsStat(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 rounded-full cursor-pointer"
            />
            {/* Quick presets around the 100 threshold */}
            <div className="flex gap-1.5 flex-wrap">
              {[70, 100, 120, 150, 170, 200].map((v) => (
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
              1–100 boosts PvE damage only. 101–200 adds up to +5% vs Guardians.
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
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-green-500"
          >
            {Object.entries(PVE_HEALTH_TIERS).map(([tier, hp]) => (
              <option key={tier} value={tier}>{tier} ({hp} HP)</option>
            ))}
          </select>
        </div>
      )}

      {result ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">TTK</span>
            <span className={
              'text-3xl font-mono font-bold ' + (multiplier > 1 ? 'text-amber-400' : 'text-white')
            }>
              {result.ttk.toFixed(2)}s
            </span>
            <span className="text-xs text-slate-500 mt-2">{result.optimalPattern}</span>
          </div>
          <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">Shots</span>
            <span className="text-3xl font-mono font-bold text-white">{result.shotsToKill}</span>
            <span className="text-xs text-slate-500 mt-2">to kill</span>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 p-4 rounded-lg border border-white/10 text-center text-slate-500 text-sm">
          Archetype not yet mapped — TTK unavailable.
          <br />
          <span className="text-xs mt-1 block">Add data to src/data/archetypes.json to enable.</span>
        </div>
      )}
    </div>
  );
};
