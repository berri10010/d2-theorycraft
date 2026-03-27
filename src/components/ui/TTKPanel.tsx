'use client';

import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calculateTTK, PVE_HEALTH_TIERS } from '../../lib/damageMath';
import { RESILIENCE_HP } from '../../lib/archetypes';

export const TTKPanel: React.FC = () => {
  const { activeWeapon, getDamageMultiplier, mode, setMode } = useWeaponStore();
  const [resilience, setResilience] = useState(0);
  const [enemyTier, setEnemyTier] = useState(Object.keys(PVE_HEALTH_TIERS)[0]);

  if (!activeWeapon) return null;

  const multiplier = getDamageMultiplier();
  const enemyHealth = PVE_HEALTH_TIERS[enemyTier] ?? 336;

  const result = calculateTTK(
    mode,
    activeWeapon.itemSubType,
    activeWeapon.rpm,
    multiplier,
    resilience,
    enemyHealth
  );

  const guardianHp = RESILIENCE_HP[String(resilience)] ?? 192;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Time-to-Kill</h2>
        <div className="flex items-center gap-2">
          {multiplier > 1 && (
            <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded">
              x{multiplier.toFixed(2)}
            </span>
          )}
          {/* PvP / PvE toggle */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setMode('pvp')}
              className={
                'px-3 py-1 text-xs rounded-md font-bold transition-colors ' +
                (mode === 'pvp' ? 'bg-slate-700 text-amber-400' : 'text-slate-500 hover:text-slate-300')
              }
            >
              PvP
            </button>
            <button
              onClick={() => setMode('pve')}
              className={
                'px-3 py-1 text-xs rounded-md font-bold transition-colors ' +
                (mode === 'pve' ? 'bg-slate-700 text-amber-400' : 'text-slate-500 hover:text-slate-300')
              }
            >
              PvE
            </button>
          </div>
        </div>
      </div>

      {/* Mode-specific controls */}
      {mode === 'pvp' && (
        <div className="mb-4">
          <label className="flex items-center justify-between text-sm text-slate-400 mb-1">
            <span>Resilience</span>
            <span className="font-mono text-slate-200">{resilience} ({guardianHp} HP)</span>
          </label>
          <input
            type="range" min={0} max={10} step={1}
            value={resilience}
            onChange={(e) => setResilience(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
      )}
      {mode === 'pve' && (
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-1">Enemy Type</label>
          <select
            value={enemyTier}
            onChange={(e) => setEnemyTier(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {Object.entries(PVE_HEALTH_TIERS).map(([tier, hp]) => (
              <option key={tier} value={tier}>{tier} ({hp} HP)</option>
            ))}
          </select>
        </div>
      )}

      {/* Result */}
      {result ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">TTK</span>
            <span className={'text-3xl font-mono font-bold ' + (multiplier > 1 ? 'text-amber-400' : 'text-slate-100')}>
              {result.ttk.toFixed(2)}s
            </span>
            <span className="text-xs text-slate-500 mt-2">
              {result.shotsToKill} shots ({result.optimalPattern})
            </span>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">Pattern</span>
            <span className="text-xl font-mono font-bold text-slate-100">{result.optimalPattern}</span>
            <span className="text-xs text-slate-500 mt-2">
              {result.shotsToKill} shot{result.shotsToKill !== 1 ? 's' : ''} to kill
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center text-slate-500 text-sm">
          Archetype not yet mapped — TTK unavailable.
          <br />
          <span className="text-xs mt-1 block">Add data to src/data/archetypes.json to enable.</span>
        </div>
      )}
    </div>
  );
};
