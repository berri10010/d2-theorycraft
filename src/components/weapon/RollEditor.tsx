'use client';

import React from 'react';
import Image from 'next/image';
import { useWeaponStore } from '../../store/useWeaponStore';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';

const BUNGIE_URL = 'https://www.bungie.net';

/** Border colour for an unselected perk based on its tier */
function tierBorderClass(tier: string | null): string {
  if (!tier || !(tier in TIER_CONFIG)) return 'border-slate-700 hover:border-slate-500';
  const cfg = TIER_CONFIG[tier as PerkTier];
  // Use a dimmed version of the tier colour when inactive
  return cfg.border + ' opacity-70 hover:opacity-100';
}

export const RollEditor: React.FC = () => {
  const { activeWeapon, selectedPerks, selectPerk, clearPerk } = useWeaponStore();
  if (!activeWeapon) return <div className="text-slate-500 text-center p-4">No weapon loaded.</div>;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-6 text-slate-100">Weapon Perks</h2>
      <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 gap-6 md:pb-0">
        {activeWeapon.perkSockets.map((column) => (
          <div key={column.name} className="flex flex-col gap-3 min-w-[64px] items-center">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap">
              {column.name}
            </h3>
            {column.perks.map((perk) => {
              const isActive = selectedPerks[column.name] === perk.hash;
              const tierCfg = perk.tier ? TIER_CONFIG[perk.tier as PerkTier] : null;

              return (
                <div key={perk.hash} className="relative flex flex-col items-center gap-1">
                  <button
                    onClick={() => isActive ? clearPerk(column.name) : selectPerk(column.name, perk.hash)}
                    title={`${perk.name}${perk.isEnhanced ? ' (Enhanced)' : ''}${perk.tier ? ` [${perk.tier}]` : ''}: ${perk.description}`}
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
        ))}
      </div>
      <p className="text-xs text-slate-600 mt-4">
        Click a selected perk to deselect.{' '}
        <span className="text-green-500">●</span> = auto-activates buff.{' '}
        <span className="text-amber-400">●</span> = enhanced.{' '}
        Tier badges: <span className="text-amber-400 font-bold">S</span>{' '}
        <span className="text-green-400 font-bold">A</span>{' '}
        <span className="text-blue-400 font-bold">B</span>{' '}
        <span className="text-slate-400 font-bold">C↓</span> = PvE ranking.
      </p>
    </div>
  );
};
