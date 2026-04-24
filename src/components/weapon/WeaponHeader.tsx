'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { isLegacyVariant } from '../../lib/weaponGroups';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import { useCompendiumPerks } from '../../lib/useCompendiumPerks';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { ClarityEntry } from '../../lib/clarity';

// Compendium placeholder strings that should not be shown to users
const BAD_COMPENDIUM_DESCRIPTIONS = new Set([
  'No intrinsic bonuses whatsoever.',
]);

/**
 * Last-resort descriptions for frame intrinsics whose plug items carry no
 * description in the Bungie manifest and are absent from the Clarity DB.
 * Text matches Bungie's in-game tooltips.
 */
const FRAME_FALLBACK: Record<string, string> = {
  'Adaptive Frame':         'A well-rounded grip, reliable and sturdy.',
  'Aggressive Frame':       "High damage, high recoil. This weapon's recoil pattern kicks violently upward.",
  'Lightweight Frame':      'Superb handling. Move faster with this weapon equipped.',
  'Rapid-Fire Frame':       'Deeper ammo reserves. Slightly faster reload when magazine is empty.',
  'Precision Frame':        'Recoil pattern on this weapon is more predictably vertical. To compensate, the hipfire of this weapon is harder to control.',
  'Pinpoint Slug Frame':    'Fires a single-slug payload. Significant recoil. Excellent accuracy.',
  'Spread Shot Frame':      'Standard spread-shot payload. Versatile and great against groups.',
  'Aggressive Burst':       'Fires 4-round bursts.',
  'Adaptive Burst':         'Fires 3-round bursts.',
  'Wave Frame':             'Fires a wave of energy along the ground, tracing its surface.',
  'Area Denial Frame':      'Fires a burst of containment mortars that suppress detonation on impact.',
  'Caster Frame':           'Fires large, slow-moving projectiles that deal substantial damage.',
  'Häkke Precision Frame':  'This weapon fires armor-piercing rounds. Increased damage against shields.',
  'Double Fire':            'Fires 2 rounds at a slight offset from the reticle at the cost of 1 Ammo.',
  'Aggressive Tracking':    'Fires a self-guided missile that tracks its target.',
  'Volatile Launch':        'Fired projectile has greatly increased blast radius.',
  'Precision Draw':         'Slightly longer draw time for higher accuracy.',
  'Komplex Draw':           'Long draw time, high damage.',
  'Lightweight Draw':       'Faster draw and movement speed.',
  'Explosive Light':        'Collecting an Orb of Power fills a reserve of explosive rounds.',
  'Heavy Burst':            'Fires a powerful 2-round burst.',
};

/** Flattens a Clarity entry's English description into plain text. */
function clarityPlainText(entry: ClarityEntry): string | null {
  const lines: string[] = [];
  for (const group of entry.descriptions?.en ?? []) {
    if (!group.linesContent?.length) continue;
    const line = group.linesContent.map((seg) => seg.text ?? '').join('').trim();
    if (line) lines.push(line);
  }
  return lines.length ? lines.join(' ') : null;
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const DAMAGE_COLORS: Record<string, { text: string; dot: string }> = {
  kinetic: { text: 'text-slate-300',   dot: 'bg-slate-400'   },
  arc:     { text: 'text-blue-300',    dot: 'bg-blue-400'    },
  solar:   { text: 'text-orange-300',  dot: 'bg-orange-400'  },
  void:    { text: 'text-purple-300',  dot: 'bg-purple-400'  },
  stasis:  { text: 'text-cyan-300',    dot: 'bg-cyan-400'    },
  strand:  { text: 'text-emerald-300', dot: 'bg-emerald-400' },
};

const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };

/** Weapon name colour keyed by rarity — replaces the old solid pill badge. */
const RARITY_NAME_COLOR: Record<string, string> = {
  Exotic:    'text-amber-400',
  Legendary: 'text-purple-300',
  Rare:      'text-blue-300',
  Uncommon:  'text-green-300',
  Common:    'text-slate-300',
};

/** Inline text colour for variant labels in the metadata row. */
const VARIANT_TEXT_COLOR: Record<string, string> = {
  Adept:    'text-amber-300',
  Timelost: 'text-purple-300',
  Harrowed: 'text-rose-300',
  Brave:    'text-blue-300',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Card / icon border colour driven by crafted state, variant, and rarity. */
function cardBorderClass(
  weapon: { rarity: string | null; variantLabel: string | null; isAdept: boolean },
  isCrafted: boolean,
): string {
  if (isCrafted)                          return 'border-red-500/60';
  if (weapon.rarity === 'Exotic')         return 'border-yellow-500/50';
  if (weapon.variantLabel === 'Adept' || weapon.isAdept) return 'border-amber-500/40';
  if (weapon.variantLabel === 'Timelost') return 'border-purple-500/40';
  if (weapon.variantLabel === 'Harrowed') return 'border-rose-500/40';
  if (weapon.variantLabel === 'Brave')    return 'border-blue-500/40';
  return 'border-white/10';
}

// Season numbers whose names are absent from the Bungie manifest.
const UNLABELLED_SEASON_NAMES: Record<number, string> = {
  1: 'The Red War',
};

function d2Year(seasonNumber: number): number {
  if (seasonNumber <= 3) return 1;
  return Math.floor((seasonNumber - 4) / 4) + 2;
}

function formatSeasonLabel(
  seasonName: string | null,
  seasonNumber: number | null,
): string | null {
  if (!seasonName && seasonNumber === null) return null;
  const resolvedName = seasonName ?? (seasonNumber !== null ? (UNLABELLED_SEASON_NAMES[seasonNumber] ?? null) : null);
  const isEpisode = seasonNumber !== null && seasonNumber >= 24;
  const displayName = resolvedName
    ? (isEpisode ? `Episode: ${resolvedName}` : resolvedName)
    : `Season ${seasonNumber}`;
  const suffix: string[] = [];
  if (seasonNumber !== null) {
    suffix.push(`Season ${seasonNumber}`);
    suffix.push(`Year ${d2Year(seasonNumber)}`);
  }
  return suffix.length ? `${displayName} (${suffix.join(', ')})` : displayName;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const WeaponHeader: React.FC = () => {
  const { activeWeapon, variantGroup, loadWeapon, isCrafted, toggleCrafted, setCrafted, isEnhanced } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:    s.activeWeapon,
      variantGroup:    s.variantGroup,
      loadWeapon:      s.loadWeapon,
      isCrafted:       s.isCrafted,
      toggleCrafted:   s.toggleCrafted,
      setCrafted:      s.setCrafted,
      isEnhanced:      s.isEnhanced,
    }))
  );
  const { data: compendiumPerks } = useCompendiumPerks();
  const { data: clarityPerks }   = useClarityPerks();
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [activeWeapon?.hash]);

  const isLegacy = useMemo(() => {
    if (!activeWeapon) return false;
    return isLegacyVariant(activeWeapon, {
      baseName: activeWeapon.baseName,
      variants: variantGroup,
      default:  variantGroup[0] ?? activeWeapon,
    });
  }, [activeWeapon, variantGroup]);

  if (!activeWeapon) return null;

  const dmg          = DAMAGE_COLORS[activeWeapon.damageType] ?? DAMAGE_COLORS.kinetic;
  const hasScreenshot = !!activeWeapon.screenshot && !imgError;
  const hasVariants  = variantGroup.length > 1;
  const seasonLabel  = formatSeasonLabel(activeWeapon.seasonName, activeWeapon.seasonNumber);
  const nameColor    = RARITY_NAME_COLOR[activeWeapon.rarity ?? ''] ?? 'text-white';

  return (
    <div className={`relative rounded-xl overflow-hidden border min-h-[280px] md:min-h-[320px] ${cardBorderClass(activeWeapon, isCrafted)}`}>

      {/* ── Layer 0: Background ───────────────────────────────────────────────
          Absolute inset-0 so the image fills the full card height.
          object-cover object-[center_30%] frames the weapon well since D2
          screenshots place the gun in the upper-centre of the frame.
          Three overlays stack on top:
            1. Subtle base scrim for smooth gradient blending
            2. Left-side gradient protecting the text column
            3. Bottom gradient protecting the intrinsic trait area           */}
      {hasScreenshot && (
        <>
          <img
            src={activeWeapon.screenshot!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
            onError={() => setImgError(true)}
          />
          {/* 1. Base scrim */}
          <div className="absolute inset-0 bg-black/20" />
          {/* 2. Left fade — darkens the text column, fades out to the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          {/* 3. Bottom fade — darkens intrinsic / flavour text area */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
        </>
      )}
      {!hasScreenshot && (
        <div className="absolute inset-0 bg-black/90" />
      )}

      {/* ── Layer 1: Content ──────────────────────────────────────────────────
          relative z-10 sits above the background layer.
          max-w-sm keeps all text in the left half so the weapon art on the
          right stays fully unobstructed.                                     */}
      <div className="relative z-10 p-4 md:p-6 flex flex-col gap-3">
        <div className="max-w-sm space-y-2.5">

          {/* Icon + Name ── tight flex row */}
          <div className="flex items-center gap-3">
            <div className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 bg-white/5 transition-colors duration-300 ${cardBorderClass(activeWeapon, isCrafted)}`}>
              <Image
                src={BUNGIE_URL + activeWeapon.icon}
                alt={activeWeapon.name}
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <h2 className={`text-xl md:text-2xl font-bold leading-tight truncate ${nameColor}`}>
                {activeWeapon.baseName}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 truncate">
                {activeWeapon.itemTypeDisplayName}
              </p>
            </div>
          </div>

          {/* Metadata row: ● Element · Ammo · RPM · Variant · Legacy */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
            {/* Element with coloured dot */}
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dmg.dot}`} />
              <span className={dmg.text}>
                {activeWeapon.damageType.charAt(0).toUpperCase() + activeWeapon.damageType.slice(1)}
              </span>
            </span>

            {AMMO_LABELS[activeWeapon.ammoType] && (
              <>
                <span className="text-slate-600">·</span>
                <span>{AMMO_LABELS[activeWeapon.ammoType]}</span>
              </>
            )}

            {activeWeapon.rpm > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span>{activeWeapon.rpm} RPM</span>
              </>
            )}

            {activeWeapon.variantLabel && (
              <>
                <span className="text-slate-600">·</span>
                <span className={VARIANT_TEXT_COLOR[activeWeapon.variantLabel] ?? 'text-slate-400'}>
                  {activeWeapon.variantLabel}
                </span>
              </>
            )}

            {isLegacy && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500 italic">Legacy Frame</span>
              </>
            )}
          </div>

          {/* Season / Episode label + acquisition source */}
          {(seasonLabel || activeWeapon.source) && (
            <div className="space-y-0.5">
              {seasonLabel && (
                <p className="text-xs text-slate-500">{seasonLabel}</p>
              )}
              {activeWeapon.source && (
                <p className="text-xs text-slate-500">{activeWeapon.source}</p>
              )}
            </div>
          )}

          {/* Variant selector + Crafted toggle */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {hasVariants && (() => {
              const baseVariant  = variantGroup.find((v) => !v.variantLabel);
              const adeptVariant = variantGroup.find((v) => v.isAdept);
              const isAdeptSelected = !!activeWeapon.variantLabel && activeWeapon.isAdept;

              if (variantGroup.length === 2 && baseVariant && adeptVariant) {
                return (
                  <button
                    onClick={() => loadWeapon(isAdeptSelected ? baseVariant : adeptVariant, variantGroup)}
                    title={isAdeptSelected ? 'Switch to base version' : `Switch to ${adeptVariant.variantLabel} version`}
                    className={[
                      'flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all',
                      isAdeptSelected
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                    ].join(' ')}
                  >
                    <span className={['relative inline-flex w-7 h-4 rounded-full transition-colors border', isAdeptSelected ? 'bg-amber-500/40 border-amber-500/60' : 'bg-white/5 border-white/15'].join(' ')}>
                      <motion.span
                        className={['absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full', isAdeptSelected ? 'bg-amber-400' : 'bg-slate-500'].join(' ')}
                        animate={{ x: isAdeptSelected ? 14 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </span>
                    {adeptVariant.variantLabel}
                  </button>
                );
              }

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
                    const sn    = formatSeasonLabel(variant.seasonName, variant.seasonNumber);
                    return (
                      <option key={variant.hash} value={variant.hash}>
                        {sn ? `${sn} · ${label}` : label}
                      </option>
                    );
                  })}
                </select>
              );
            })()}

            {/* Craftable toggle */}
            {activeWeapon.hasCraftedPattern && (
              isCrafted ? (
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
                <button
                  onClick={() => {
                    if (activeWeapon.isAdept) {
                      const base = variantGroup.find((v) => !v.variantLabel && !v.isAdept);
                      if (base) loadWeapon(base, variantGroup);
                      setCrafted(true);
                    } else {
                      toggleCrafted();
                    }
                  }}
                  title="This weapon has a craftable pattern — click to enable crafted mode (+2 stats, enhanced perks)"
                  className="text-xs font-medium px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 bg-white/3 text-slate-500 border-white/10 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/8"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                    <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                  </svg>
                  Craftable
                </button>
              )
            )}

            {/* Enhanceable / Enhanced indicator — non-interactive, auto-driven by perk selection.
                Shown for any weapon that has enhanced perk versions, whenever crafted is off.
                "Enhanceable" = waiting for user to double-click both Perk 1 & 2.
                "Enhanced"    = both perk columns are in enhanced state (isEnhanced auto-set). */}
            {!isCrafted && activeWeapon.perkSockets.some((col) => col.perks.some((p) => !!p.enhancedVersion)) && (
              isEnhanced ? (
                <div
                  title="Enhanced — both perk slots are enhanced"
                  className="text-xs font-semibold px-2 py-1 rounded-md border flex items-center gap-1.5 bg-violet-500/20 text-violet-400 border-violet-500/50 select-none"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Enhanced
                </div>
              ) : (
                <div
                  title="Enhance both Perk 1 and Perk 2 (click twice on each) to activate enhanced mode"
                  className="text-xs font-medium px-2 py-1 rounded-md border flex items-center gap-1.5 bg-white/3 text-slate-500 border-white/10 select-none"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 shrink-0">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Enhanceable
                </div>
              )
            )}

            {isLegacy && (
              <span className="text-xs text-slate-500 italic">No Origin Trait on legacy frames.</span>
            )}
          </div>
        </div>

        {/* Intrinsic trait — constrained to left column */}
        {activeWeapon.intrinsicTrait && (() => {
          const trait = activeWeapon.intrinsicTrait!;
          // Cascade: manifest → Clarity (plain text) → compendium (filtered) → null
          // Compendium is filtered for: known placeholder strings, and
          // trigger-only lines that end with ":" (e.g. "Upon reload while empty:")
          const manifestDesc = trait.description || null;
          const clarityDesc  = clarityPerks?.[trait.hash]
            ? clarityPlainText(clarityPerks[trait.hash]) : null;
          const rawCompendium = compendiumPerks?.[trait.name]?.baseDescription ?? null;
          const compendiumDesc = rawCompendium &&
            !BAD_COMPENDIUM_DESCRIPTIONS.has(rawCompendium) &&
            !rawCompendium.trimEnd().endsWith(':')
            ? rawCompendium : null;
          const frameFallback = FRAME_FALLBACK[trait.name] ?? null;
          const desc = manifestDesc ?? clarityDesc ?? compendiumDesc ?? frameFallback;
          return (
            <div className="flex gap-3 p-3 bg-black/50 rounded-lg border border-white/10 backdrop-blur-sm max-w-sm">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={BUNGIE_URL + trait.icon}
                  alt={trait.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Intrinsic</span>
                  <span className="font-semibold text-sm text-amber-300">{trait.name}</span>
                </div>
                {trait.statModifiers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {trait.statModifiers.map((mod) => (
                      <span
                        key={mod.statName}
                        className={[
                          'text-[9px] font-bold font-mono px-1.5 py-0.5 rounded leading-none',
                          mod.isConditional
                            ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                            : mod.value > 0
                              ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                              : 'text-red-400 bg-red-400/10 border border-red-400/20',
                        ].join(' ')}
                      >
                        {mod.value > 0 ? '+' : ''}{mod.value} {mod.statName}
                      </span>
                    ))}
                  </div>
                )}
                {desc && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {desc}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Flavor text */}
        {activeWeapon.flavorText && (
          <p className="text-xs italic text-slate-500 leading-relaxed border-l-2 border-white/10 pl-3 max-w-sm">
            {activeWeapon.flavorText}
          </p>
        )}
      </div>
    </div>
  );
};
