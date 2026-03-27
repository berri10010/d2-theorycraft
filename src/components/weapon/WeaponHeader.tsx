'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useWeaponStore } from '../../store/useWeaponStore';

const BUNGIE_URL = 'https://www.bungie.net';

// Damage type colour mapping
const DAMAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  kinetic: { bg: 'bg-slate-700',  text: 'text-slate-200', dot: 'bg-slate-400' },
  arc:     { bg: 'bg-blue-900/60', text: 'text-blue-300',  dot: 'bg-blue-400'  },
  solar:   { bg: 'bg-orange-900/60', text: 'text-orange-300', dot: 'bg-orange-400' },
  void:    { bg: 'bg-purple-900/60', text: 'text-purple-300', dot: 'bg-purple-400' },
  stasis:  { bg: 'bg-cyan-900/60',  text: 'text-cyan-300',  dot: 'bg-cyan-400'  },
  strand:  { bg: 'bg-emerald-900/60', text: 'text-emerald-300', dot: 'bg-emerald-400' },
};

// Rarity colour mapping
const RARITY_COLORS: Record<string, string> = {
  Exotic:    'text-amber-400 border-amber-400/40 bg-amber-400/10',
  Legendary: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
  Rare:      'text-blue-400   border-blue-400/40   bg-blue-400/10',
  Uncommon:  'text-green-400  border-green-400/40  bg-green-400/10',
  Common:    'text-slate-400  border-slate-600      bg-slate-800',
};

export const WeaponHeader: React.FC = () => {
  const { activeWeapon } = useWeaponStore();
  const [imgError, setImgError] = useState(false);

  if (!activeWeapon) return null;

  const dmg = DAMAGE_COLORS[activeWeapon.damageType] ?? DAMAGE_COLORS.kinetic;
  const rarityClass = activeWeapon.rarity ? (RARITY_COLORS[activeWeapon.rarity] ?? RARITY_COLORS.Common) : '';
  const hasScreenshot = !!activeWeapon.screenshot && !imgError;

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800">
      {/* Weapon artwork background */}
      {hasScreenshot ? (
        <div className="relative w-full h-36 md:h-48">
          <Image
            src={activeWeapon.screenshot!}
            alt={`${activeWeapon.name} artwork`}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover object-center"
            unoptimized
            onError={() => setImgError(true)}
          />
          {/* Dark gradient overlay so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="w-full h-20 bg-slate-900" />
      )}

      {/* Content overlaid on artwork */}
      <div className={[
        'relative bg-slate-900/80 backdrop-blur-sm p-4 md:p-6',
        hasScreenshot ? '-mt-20 md:-mt-28' : '',
      ].join(' ')}>
        <div className="flex gap-4 items-start">
          {/* Weapon icon */}
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-slate-700 shrink-0 bg-slate-800">
            <Image
              src={BUNGIE_URL + activeWeapon.icon}
              alt={activeWeapon.name}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Name, type, badges */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Rarity badge */}
              {activeWeapon.rarity && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${rarityClass}`}>
                  {activeWeapon.rarity}
                </span>
              )}
              {/* Damage type badge */}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1.5 ${dmg.bg} ${dmg.text}`}>
                <span className={`w-2 h-2 rounded-full ${dmg.dot}`} />
                {activeWeapon.damageType.charAt(0).toUpperCase() + activeWeapon.damageType.slice(1)}
              </span>
              {/* RPM badge */}
              {activeWeapon.rpm > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {activeWeapon.rpm} RPM
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-amber-400 leading-tight truncate">
              {activeWeapon.name}
            </h2>
            <p className="text-slate-400 text-sm">{activeWeapon.itemTypeDisplayName}</p>
          </div>
        </div>

        {/* Intrinsic trait */}
        {activeWeapon.intrinsicTrait && (
          <div className="mt-4 flex gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/60">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-amber-600/40 shrink-0 bg-slate-800">
              <Image
                src={BUNGIE_URL + activeWeapon.intrinsicTrait.icon}
                alt={activeWeapon.intrinsicTrait.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Intrinsic</span>
                <span className="font-semibold text-sm text-amber-300">
                  {activeWeapon.intrinsicTrait.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                {activeWeapon.intrinsicTrait.description}
              </p>
            </div>
          </div>
        )}

        {/* Flavor text */}
        {activeWeapon.flavorText && (
          <p className="mt-3 text-xs italic text-slate-500 leading-relaxed border-l-2 border-slate-700 pl-3">
            {activeWeapon.flavorText}
          </p>
        )}
      </div>
    </div>
  );
};
