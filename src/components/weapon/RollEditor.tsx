'use client';

import React from 'react';
import Image from 'next/image';
import { useWeaponStore } from '../../store/useWeaponStore';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { useGodRolls } from '../../lib/useGodRolls';
import { godRollFieldForColumn } from '../../lib/godRolls';

const BUNGIE_URL = 'https://www.bungie.net';

/** Border colour for an unselected perk based on its tier */
function tierBorderClass(tier: string | null): string {
  if (!tier || !(tier in TIER_CONFIG)) return 'border-slate-700 hover:border-slate-500';
  const cfg = TIER_CONFIG[tier as PerkTier];
  return cfg.border + ' opacity-70 hover:opacity-100';
}

export const RollEditor: React.FC = () => {
  const { activeWeapon, selectedPerks, selectPerk, clearPerk } = useWeaponStore();
  const { data: godRollDb } = useGodRolls();

  if (!activeWeapon) return <div className="text-slate-500 text-center p-4">No weapon loaded.</div>;

  // Look up god roll entry for this weapon
  const godRoll = godRollDb ? godRollDb[activeWeapon.name] : null;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100">Weapon Perks</h2>
        {godRoll && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">PvE Roll Guide</span>
            {godRoll.tier && (
              <span className={`text-xs font-black px-2 py-0.5 rounded leading-none ${
                godRoll.tier === 'S' ? 'bg-amber-400 text-slate-950' :
                godRoll.tier === 'A' ? 'bg-green-400 text-slate-950' :
                godRoll.tier === 'B' ? 'bg-blue-400 text-slate-950' :
                'bg-slate-600 text-slate-200'
              }`}>
                {godRoll.tier}-Tier
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 gap-6 md:pb-0">
        {activeWeapon.perkSockets.map((column) => {
          // Determine which god roll list applies to this column
          const godRollField = godRollFieldForColumn(column.name);
          const recommendedPerks = godRoll && godRollField ? godRoll[godRollField] as string[] : [];

          return (
            <div key={column.name} className="flex flex-col gap-3 min-w-[64px] items-center">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">
                {column.name}
              </h3>
              {column.perks.map((perk) => {
                const isActive = selectedPerks[column.name] === perk.hash;
                const tierCfg = perk.tier ? TIER_CONFIG[perk.tier as PerkTier] : null;
                // A perk is "god roll recommended" if its name appears in the recommendations list
                const isRecommended = recommendedPerks.some(
                  (r) => r.toLowerCase() === perk.name.toLowerCase() ||
                    (perk.isEnhanced && r.toLowerCase() === perk.name.toLowerCase().replace(/^enhanced\s+/, ''))
                );

                return (
                  <div key={perk.hash} className="relative flex flex-col items-center gap-1">
                    <button
                      onClick={() => isActive ? clearPerk(column.name) : selectPerk(column.name, perk.hash)}
                      title={`${perk.name}${perk.isEnhanced ? ' (Enhanced)' : ''}${perk.tier ? ` [${perk.tier}]` : ''}${isRecommended ? ' ★ God Roll' : ''}: ${perk.description}`}
                      aria-pressed={isActive}
                      className={[
                        'relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-200 overflow-hidden',
                        isActive
                          ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-110 opacity-100'
                          : tierCfg
                            ? `${tierCfg.border} opacity-60 hover:opacity-100`
                            : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100',
                      ].join(' ')}
                    >
                      <Image
                        src={BUNGIE_URL + perk.icon}
                        alt={perk.name}
                        fill
                        sizes="(max-width: 768px) 48px, 56px"
                        className="object-cover"
                        unoptimized
                      />
                      {/* Enhanced perk indicator — bottom-right */}
                      {perk.isEnhanced && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 rounded-full border border-slate-900" />
                      )}
                      {/* Auto-buff indicator — top-left */}
                      {perk.buffKey && (
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-slate-900" />
                      )}
                      {/* God Roll recommended indicator — top-right star */}
                      {isRecommended && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full border border-slate-900 flex items-center justify-center">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-slate-900">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Tier badge below the icon */}
                    {tierCfg && (
                      <span className={`text-[10px] font-black leading-none px-1 py-0.5 rounded ${tierCfg.badge}`}>
                        {tierCfg.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-slate-600">
        <span>Click a selected perk to deselect.</span>
        <span><span className="text-yellow-400">★</span> = god roll pick.</span>
        <span><span className="text-green-500">●</span> = auto-activates buff.</span>
        <span><span className="text-amber-400">●</span> = enhanced.</span>
        <span>
          Tier badges: <span className="text-amber-400 font-bold">S</span>{' '}
          <span className="text-green-400 font-bold">A</span>{' '}
          <span className="text-blue-400 font-bold">B</span>{' '}
          <span className="text-slate-400 font-bold">C↓</span> = PvE perk ranking.
        </span>
      </div>
    </div>
  );
};
