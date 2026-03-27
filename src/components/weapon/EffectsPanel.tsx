'use client';

import React from 'react';
import Image from 'next/image';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE } from '../../lib/buffDatabase';

const BUNGIE_URL = 'https://www.bungie.net';

function StatDelta({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={
        'font-mono text-xs font-bold ' +
        (positive ? 'text-green-400' : 'text-red-400')
      }
    >
      {positive ? '+' : ''}{value}
    </span>
  );
}

export const EffectsPanel: React.FC = () => {
  const { activeWeapon, selectedPerks, activeBuffs, clearPerk, toggleBuff } = useWeaponStore();

  if (!activeWeapon) return null;

  // Collect active perks
  const activePerkEntries: Array<{
    columnName: string;
    perkHash: string;
    name: string;
    icon: string;
    description: string;
    isEnhanced: boolean;
    buffKey: string | null;
    statModifiers: Array<{ statName: string; value: number }>;
  }> = [];

  for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
    const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
    const perk = column?.perks.find((p) => p.hash === perkHash);
    if (perk) {
      activePerkEntries.push({ columnName, perkHash, ...perk });
    }
  }

  // Active manual buffs (not auto-activated by perks — those already appear in perks section)
  const autoBuff = new Set(activePerkEntries.map((p) => p.buffKey).filter(Boolean));
  const manualBuffEntries = activeBuffs
    .filter((hash) => !autoBuff.has(hash))
    .map((hash) => BUFF_DATABASE[hash])
    .filter(Boolean);

  const isEmpty = activePerkEntries.length === 0 && manualBuffEntries.length === 0;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-slate-100">Effects</h2>

      {isEmpty ? (
        <p className="text-slate-600 text-sm text-center py-6">
          No perks or buffs active. Select perks above to see their effects here.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Active perks */}
          {activePerkEntries.map(({ columnName, perkHash, name, icon, description, isEnhanced, buffKey, statModifiers }) => (
            <div
              key={perkHash}
              className="flex gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 group"
            >
              {/* Icon */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shrink-0">
                {icon && (
                  <Image
                    src={BUNGIE_URL + icon}
                    alt={name}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                )}
                {isEnhanced && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900" />
                )}
                {buffKey && (
                  <div className="absolute top-0 left-0 w-2 h-2 bg-green-400 rounded-full border border-slate-900" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-amber-400 truncate block">
                      {name}
                      {isEnhanced && (
                        <span className="ml-1.5 text-xs text-amber-300 font-normal">(Enhanced)</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">{columnName}</span>
                  </div>

                  {/* Stat deltas */}
                  {statModifiers.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-end shrink-0">
                      {statModifiers.map((mod) => (
                        <div key={mod.statName} className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">{mod.statName}</span>
                          <StatDelta value={mod.value} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                  {description}
                </p>

                {/* Auto-buff indicator */}
                {buffKey && BUFF_DATABASE[buffKey] && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-green-500">
                      Auto-activates {BUFF_DATABASE[buffKey].name} (x{BUFF_DATABASE[buffKey].multiplier.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => clearPerk(columnName)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 shrink-0 self-start mt-0.5"
                aria-label={`Deselect ${name}`}
                title="Deselect perk"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}

          {/* Manual buffs */}
          {manualBuffEntries.map((buff) => (
            <div
              key={buff.hash}
              className="flex gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-blue-400 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm text-blue-400 block">{buff.name}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Buff</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                    x{buff.multiplier.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{buff.description}</p>
              </div>

              <button
                onClick={() => toggleBuff(buff.hash)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 shrink-0 self-start mt-0.5"
                aria-label={`Deactivate ${buff.name}`}
                title="Deactivate buff"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
