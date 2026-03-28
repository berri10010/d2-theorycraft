'use client';

import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calculateTTK, PVE_HEALTH_TIERS } from '../../lib/damageMath';
import { RESILIENCE_HP } from '../../lib/archetypes';

export const TTKPanel: React.FC = () => {
  const { activeWeapon, getDamageMultiplier, mode } = useWeaponStore();
  const [resilience, setResilience] = useState(0);
  const [enemyTier, setEnemyTier]   = useState(Object.keys(PVE_HEALTH_TIERS)[0]);

  if (!activeWeapon) return null;

  const multiplier  = getDamageMultiplier();
  const enemyHealth = PVE_HEALTH_TIERS[enemyTier] ?? 336;

  const result = calculateTTK(
    mode,
    activeWeapon.itemSubType,
    activeWeapon.rpm,
    multiplier,
    resilience,
    enemyHealth,
  );

  const guardianHp = RESILIENCE_HP[String(resilience)] ?? 192;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Time-to-Kill</h2>
        {multiplier > 1 && (
          <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded">
            ×{multiplier.toFixed(2)} dmg
          </span>
        )}
      </div>

      {/* PvP: resilience slider */}
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
            className="w-full accent-blue-500"
          />
        </div>
      )}

      {/* PvE: enemy-type selector */}
      {mode === 'pve' && (
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-1">Enemy Type</label>
          <select
            value={enemyTier}
            onChange={(e) => setEnemyTier(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-green-500"
          >
            {Object.entries(PVE_HEALTH_TIERS).map(([tier, hp]) => (
              <option key={tier} value={tier}>{tier} ({hp} HP)</option>
            ))}
          </select>
        </div>
      )}

      {result ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">TTK</span>
            <span className={
              'text-3xl font-mono font-bold ' + (multiplier > 1 ? 'text-amber-400' : 'text-slate-100')
            }>
              {result.ttk.toFixed(2)}s
            </span>
            <span className="text-xs text-slate-500 mt-2">{result.optimalPattern}</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <span className="text-sm text-slate-400 mb-1">Shots</span>
            <span className="text-3xl font-mono font-bold text-slate-100">{result.shotsToKill}</span>
            <span className="text-xs text-slate-500 mt-2">to kill</span>
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
