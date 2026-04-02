'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { isLegacyVariant } from '../../lib/weaponGroups';
import { BUNGIE_URL } from '../../lib/bungieUrl';

const DAMAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  kinetic: { bg: 'bg-slate-700',      text: 'text-slate-200',   dot: 'bg-slate-400'   },
  arc:     { bg: 'bg-blue-900/60',    text: 'text-blue-300',    dot: 'bg-blue-400'    },
  solar:   { bg: 'bg-orange-900/60',  text: 'text-orange-300',  dot: 'bg-orange-400'  },
  void:    { bg: 'bg-purple-900/60',  text: 'text-purple-300',  dot: 'bg-purple-400'  },
  stasis:  { bg: 'bg-cyan-900/60',    text: 'text-cyan-300',    dot: 'bg-cyan-400'    },
  strand:  { bg: 'bg-emerald-900/60', text: 'text-emerald-300', dot: 'bg-emerald-400' },
};

const RARITY_COLORS: Record<string, string> = {
  Exotic:    'text-amber-400 border-amber-400/40 bg-amber-400/10',
  Legendary: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
  Rare:      'text-blue-400 border-blue-400/40 bg-blue-400/10',
  Uncommon:  'text-green-400 border-green-400/40 bg-green-400/10',
  Common:    'text-slate-400 border-slate-600 bg-slate-800',
};

const VARIANT_COLORS: Record<string, string> = {
  Adept:    'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Timelost: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Harrowed: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  Brave:    'bg-blue-500/20 text-blue-300 border-blue-500/40',
};

/** Card border changes based on crafted state, variant type, or rarity */
function cardBorderClass(
  weapon: { rarity: string | null; variantLabel: string | null; isAdept: boolean },
  isCrafted: boolean,
): string {
  if (isCrafted)                        return 'border-red-500/60';
  if (weapon.rarity === 'Exotic')       return 'border-yellow-500/50';
  if (weapon.variantLabel === 'Adept' || weapon.isAdept) return 'border-amber-500/40';
  if (weapon.variantLabel === 'Timelost') return 'border-purple-500/40';
  if (weapon.variantLabel === 'Harrowed') return 'border-rose-500/40';
  if (weapon.variantLabel === 'Brave')    return 'border-blue-500/40';
  return 'border-white/10';
}

export const WeaponHeader: React.FC = () => {
  const { activeWeapon, variantGroup, loadWeapon, isCrafted, toggleCrafted } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:  s.activeWeapon,
      variantGroup:  s.variantGroup,
      loadWeapon:    s.loadWeapon,
      isCrafted:     s.isCrafted,
      toggleCrafted: s.toggleCrafted,
    }))
  );
  const [imgError, setImgError] = useState(false);

  // Memoize derived values so they don't recompute on every unrelated store change.
  const isLegacy = useMemo(() => {
    if (!activeWeapon) return false;
    return isLegacyVariant(activeWeapon, {
      baseName: activeWeapon.baseName,
      variants: variantGroup,
      default:  variantGroup[0] ?? activeWeapon,
    });
  }, [activeWeapon, variantGroup]);

  if (!activeWeapon) return null;

  const dmg = DAMAGE_COLORS[activeWeapon.damageType] ?? DAMAGE_COLORS.kinetic;
  const rarityClass = activeWeapon.rarity ? (RARITY_COLORS[activeWeapon.rarity] ?? RARITY_COLORS.Common) : '';
  const hasScreenshot = !!activeWeapon.screenshot && !imgError;
  const hasVariants = variantGroup.length > 1;

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10">
      {/* Weapon artwork banner — full width, natural aspect ratio, no cropping */}
      {hasScreenshot && (
        <div className="relative w-full bg-black" style={{ aspectRatio: '16/6' }}>
          <Image
            src={activeWeapon.screenshot!}
            alt={`${activeWeapon.name} artwork`}
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-contain object-center"
            unoptimized
            onError={() => setImgError(true)}
          />
          {/* Fade edges so content below blends in */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}

      {/* Content — sits below the banner, no negative-margin overlap */}
      <div className="relative bg-black/90 backdrop-blur-sm p-4 md:p-6">
        <div className="flex gap-4 items-start">
          {/* Weapon icon — border color matches card border */}
          <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 shrink-0 bg-white/5 transition-colors duration-300 ${cardBorderClass(activeWeapon, isCrafted)}`}>
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
            {/* Badge row */}
            <div className="flex flex-wrap items-center gap-2">
              {activeWeapon.rarity && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${rarityClass}`}>
                  {activeWeapon.rarity}
                </span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1.5 ${dmg.bg} ${dmg.text}`}>
                <span className={`w-2 h-2 rounded-full ${dmg.dot}`} />
                {activeWeapon.damageType.charAt(0).toUpperCase() + activeWeapon.damageType.slice(1)}
              </span>
              {activeWeapon.rpm > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  {activeWeapon.rpm} RPM
                </span>
              )}
              {/* Variant label badge */}
              {activeWeapon.variantLabel && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${VARIANT_COLORS[activeWeapon.variantLabel] ?? 'bg-white/5 text-slate-400 border-white/10'}`}>
                  {activeWeapon.variantLabel}
                </span>
              )}
              {/* Legacy warning */}
              {isLegacy && (
                <span className="text-xs font-bold px-2 py-0.5 rounded border bg-slate-700/40 text-slate-400 border-slate-600/40">
                  Legacy Frame
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-amber-400 leading-tight truncate">
              {activeWeapon.baseName}
            </h2>
            <p className="text-slate-400 text-sm">{activeWeapon.itemTypeDisplayName}</p>
            {(activeWeapon.seasonName || activeWeapon.seasonNumber) && (
              <p className="text-xs text-slate-500">
                {activeWeapon.seasonName
                  ? activeWeapon.seasonName
                  : `Season ${activeWeapon.seasonNumber}`}
              </p>
            )}

            {/* Variant selector + crafted toggle row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Variant selector — Adept toggle for 2-variant families, select for 3+ */}
              {hasVariants && (() => {
                const baseVariant  = variantGroup.find((v) => !v.variantLabel);
                const adeptVariant = variantGroup.find((v) => v.isAdept);
                const isAdeptSelected = !!activeWeapon.variantLabel && activeWeapon.isAdept;

                // Simple 2-version family (base + one variant): show a toggle switch
                if (variantGroup.length === 2 && baseVariant && adeptVariant) {
                  return (
                    <button
                      onClick={() => {
                        if (isAdeptSelected) {
                          loadWeapon(baseVariant, variantGroup);
                          // isCrafted already false after loadWeapon
                        } else {
                          // Switching to Adept clears crafted (mutual exclusivity)
                          loadWeapon(adeptVariant, variantGroup);
                        }
                      }}
                      title={isAdeptSelected ? 'Switch to base version' : `Switch to ${adeptVariant.variantLabel} version`}
                      className={[
                        'flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all',
                        isAdeptSelected
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                      ].join(' ')}
                    >
                      {/* Toggle track */}
                      <span className={[
                        'relative inline-flex w-7 h-4 rounded-full transition-colors border',
                        isAdeptSelected
                          ? 'bg-amber-500/40 border-amber-500/60'
                          : 'bg-white/5 border-white/15',
                      ].join(' ')}>
                        <span className={[
                          'absolute top-0.5 w-3 h-3 rounded-full transition-transform',
                          isAdeptSelected
                            ? 'translate-x-3.5 bg-amber-400'
                            : 'translate-x-0.5 bg-slate-500',
                        ].join(' ')} />
                      </span>
                      {adeptVariant.variantLabel}
                    </button>
                  );
                }

                // 3+ variants: compact dropdown
                return (
                  <select
                    value={activeWeapon.hash}
                    onChange={(e) => {
                      const v = variantGroup.find((w) => w.hash === e.target.value);
                      if (v) loadWeapon(v, variantGroup);
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    {variantGroup.map((variant) => {
                      const label = variant.variantLabel ?? 'Base';
                      const season = variant.seasonName
                        ? variant.seasonName
                        : variant.seasonNumber
                        ? `Season ${variant.seasonNumber}`
                        : null;
                      return (
                        <option key={variant.hash} value={variant.hash}>
                          {season ? `${season} · ${label}` : label}
                        </option>
                      );
                    })}
                  </select>
                );
              })()}

              {/* Crafted — only shown for weapons with a craftable pattern */}
              {activeWeapon.hasCraftedPattern && (
                isCrafted ? (
                  // Active: red button — click to turn off
                  <button
                    onClick={toggleCrafted}
                    title="Crafted mode active — click to disable"
                    className="text-xs font-semibold px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                      <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.294A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 2.03l1.25.834a6.957 6.957 0 011.416-.587l.294-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Crafted
                  </button>
                ) : (
                  // Inactive: subtle pill — click to enable crafted mode
                  // If currently on Adept, switch to base first (mutual exclusivity)
                  <button
                    onClick={() => {
                      if (activeWeapon.isAdept) {
                        const base = variantGroup.find((v) => !v.variantLabel && !v.isAdept);
                        if (base) {
                          loadWeapon(base, variantGroup);
                          // loadWeapon resets isCrafted→false; toggleCrafted immediately flips it to true
                        }
                      }
                      toggleCrafted();
                    }}
                    title="This weapon has a craftable pattern — click to enable crafted mode (+2 stats, enhanced perks)"
                    className="text-xs font-medium px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 bg-white/3 text-slate-500 border-white/8 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/8"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                      <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                    </svg>
                    Craftable
                  </button>
                )
              )}

              {/* Legacy warning note */}
              {isLegacy && (
                <span className="text-xs text-slate-500 italic">
                  No Origin Trait on legacy frames.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Intrinsic trait */}
        {activeWeapon.intrinsicTrait && (
          <div className="mt-4 flex gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
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
          <p className="mt-3 text-xs italic text-slate-500 leading-relaxed border-l-2 border-white/10 pl-3">
            {activeWeapon.flavorText}
          </p>
        )}
      </div>
    </div>
  );
};
