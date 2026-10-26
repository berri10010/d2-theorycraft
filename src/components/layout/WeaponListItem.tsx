'use client';

import React from 'react';
import type { Weapon, WeaponGroup } from '../../types/weapon';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';
import { AMMO_LABELS, bestSeasonName } from '../../lib/weaponFilters';

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-ink', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};
const AMMO_COLORS: Record<number, string> = { 1: 'text-ink-3', 2: 'text-green-400', 3: 'text-purple-400' };
const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: 'bg-amber-400', text: 'text-slate-950' },
  A: { bg: 'bg-green-400', text: 'text-slate-950' },
  B: { bg: 'bg-blue-400',  text: 'text-slate-950' },
  C: { bg: 'bg-slate-500', text: 'text-slate-50' },
  D: { bg: 'bg-slate-700', text: 'text-slate-100' },
  E: { bg: 'bg-slate-800', text: 'text-slate-200' },
  F: { bg: 'bg-red-900',   text: 'text-[#fca5a5]' },
};


export function WeaponListItem({
  group, activeWeapon, onLoad, tier,
}: {
  group: WeaponGroup;
  activeWeapon: Weapon | null;
  onLoad: (weapon: Weapon, variants?: Weapon[]) => void;
  tier?: string;
}) {
  const d          = group.default;
  const isActive   = group.variants.some((v) => v.hash === activeWeapon?.hash);
  const seasonName = bestSeasonName(group);

  return (
    <div
      className={[
        'rounded-lg overflow-hidden transition-all duration-150 border-l-2',
        isActive
          ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/15'
          : 'border-transparent hover:border-white/15 hover:bg-white/[0.04] hover:scale-[1.005]',
      ].join(' ')}
    >
      <button
        onClick={() => onLoad(group.default, group.variants)}
        aria-current={isActive ? 'true' : undefined}
        className="w-full text-left p-2 flex items-center gap-2.5 transition-all duration-150"
      >
        <div className="relative w-14 h-14 shrink-0">
          <div className="w-14 h-14 rounded overflow-hidden bg-white/5">
            {d.icon && <img src={BUNGIE_ROOT + d.icon} alt="" className="w-full h-full object-cover" />}
          </div>
          {d.iconWatermark && (
            <img src={d.iconWatermark} alt="" className="absolute top-0 left-0 w-5 h-5 object-contain" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className={[
              'text-sm font-bold truncate leading-tight',
              isActive ? 'text-amber-400' : d.rarity === 'Exotic' ? 'text-yellow-400' : 'text-ink',
            ].join(' ')}>
              {group.baseName}
            </p>
            {tier && TIER_STYLE[tier] && (
              <span className={`shrink-0 text-3xs font-black px-1.5 py-0.5 rounded leading-none ${TIER_STYLE[tier].bg} ${TIER_STYLE[tier].text}`}>
                <span aria-hidden="true">{tier}</span>
                <span className="sr-only">{tier} tier</span>
              </span>
            )}
          </div>
          <p className="text-2xs uppercase tracking-wider mt-0.5 flex items-center gap-1">
            <span className={[DAMAGE_COLORS[d.damageType] ?? 'text-ink-4'].join(' ')}>
              {d.damageType}
            </span>
            {AMMO_LABELS[d.ammoType] && (
              <>
                <span aria-hidden="true" className="text-ink-4">|</span>
                <span className={AMMO_COLORS[d.ammoType] ?? 'text-ink-4'}>{AMMO_LABELS[d.ammoType]}</span>
              </>
            )}
          </p>
          <p className="text-2xs text-ink-4 mt-0.5 truncate">
            {d.itemTypeDisplayName}
            {seasonName && <span className="text-ink-4"> · {seasonName}</span>}
          </p>
        </div>
      </button>
    </div>
  );
}
