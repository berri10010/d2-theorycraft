'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { isLegacyVariant } from '../../lib/weaponGroups';
import { Perk } from '../../types/weapon';
import { BUNGIE_URL } from '../../lib/bungieUrl';

export const RollEditor: React.FC = () => {
  const {
    activeWeapon, selectedPerks, selectPerk, clearPerk,
    isCrafted, variantGroup, mode,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:  s.activeWeapon,
      selectedPerks: s.selectedPerks,
      selectPerk:    s.selectPerk,
      clearPerk:     s.clearPerk,
      isCrafted:     s.isCrafted,
      variantGroup:  s.variantGroup,
      mode:          s.mode,
    }))
  );

  // Memoize derived values so they're not recomputed on every unrelated state change.
  const isLegacy = useMemo(() => {
    if (!activeWeapon) return false;
    return isLegacyVariant(activeWeapon, {
      baseName: activeWeapon.baseName,
      variants: variantGroup,
      default:  variantGroup[0] ?? activeWeapon,
    });
  }, [activeWeapon, variantGroup]);

  const hasEnhanceable = useMemo(
    () => !!activeWeapon?.perkSockets.some((col) => col.perks.some((p) => !!p.enhancedVersion)),
    [activeWeapon]
  );

  if (!activeWeapon) return <div className="text-slate-500 text-center p-4">No weapon loaded.</div>;

  // Column type → subtle accent colour used on the column header underline
  const COL_ACCENT: Record<string, string> = {
    barrel: 'bg-orange-500/40',
    mag:    'bg-blue-500/40',
    perk:   'bg-slate-500/40',
    origin: 'bg-emerald-500/40',
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">Weapon Perks</h2>
        {hasEnhanceable && (
          <span className="text-xs text-slate-500 font-normal tracking-wide">
            Click twice to enhance
          </span>
        )}
      </div>

      <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 md:pb-0">
        {activeWeapon.perkSockets.map((column, colIdx) => {
          const isOriginTraitCol = column.columnType === 'origin';
          const columnDisabled = isOriginTraitCol && isLegacy;
          const accentBar = COL_ACCENT[column.columnType] ?? 'bg-slate-500/40';
          const isLast = colIdx === activeWeapon.perkSockets.length - 1;

          return (
            <div
              key={column.name}
              className={[
                'flex flex-col items-center min-w-[60px]',
                columnDisabled ? 'opacity-30 pointer-events-none' : '',
                // subtle right divider between columns except last
                !isLast ? 'border-r border-white/5 pr-3 md:pr-4' : '',
              ].join(' ')}
            >
              {/* Column header with coloured underline accent */}
              <div className="w-full flex flex-col items-center gap-1 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {columnDisabled ? `${column.name} ·` : column.name}
                </span>
                <div className={`h-0.5 w-8 rounded-full ${accentBar}`} />
              </div>

              {/* Perk icons */}
              <div className="flex flex-col gap-2.5 items-center">
                {column.perks.map((perk) => {
                  const selectedHash    = selectedPerks[column.name];
                  const isBaseActive    = selectedHash === perk.hash;
                  const isEnhancedActive = perk.enhancedVersion
                    ? selectedHash === perk.enhancedVersion.hash
                    : false;
                  const isActive   = isBaseActive || isEnhancedActive;
                  const isUpgraded = isEnhancedActive;
                  const canUpgrade = !!perk.enhancedVersion && isBaseActive;

                  const displayPerk: Perk = (isEnhancedActive && perk.enhancedVersion)
                    ? perk.enhancedVersion
                    : perk;

                  const tierCfg = perk.tier ? TIER_CONFIG[perk.tier as PerkTier] : null;

                  const handleClick = () => {
                    if (!isActive) {
                      selectPerk(column.name, perk.hash);
                    } else if (isBaseActive && perk.enhancedVersion) {
                      selectPerk(column.name, perk.enhancedVersion.hash);
                    } else {
                      clearPerk(column.name);
                    }
                  };

                  const nextAction = !isActive
                    ? displayPerk.name
                    : isBaseActive && perk.enhancedVersion
                      ? `Enhance → ${perk.enhancedVersion.name}`
                      : `Deselect ${displayPerk.name}`;

                  return (
                    // Wrapper gives the tier/ENH badge a clipping-free anchor
                    <div key={perk.hash} className="relative shrink-0">
                      <button
                        onClick={handleClick}
                        title={`${nextAction}${perk.tier ? ` [${perk.tier}]` : ''}: ${displayPerk.description}`}
                        aria-pressed={isActive}
                        className={[
                          'relative w-12 h-12 md:w-13 md:h-13 rounded-full border-2 transition-all duration-150 overflow-hidden block',
                          isActive
                            ? isUpgraded
                              ? 'border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)] scale-110 opacity-100'
                              : 'border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.15)] scale-105 opacity-100'
                            : 'border-white/15 opacity-50 hover:opacity-85 hover:scale-105 hover:border-white/35',
                        ].join(' ')}
                      >
                        <Image
                          src={BUNGIE_URL + displayPerk.icon}
                          alt={displayPerk.name}
                          fill
                          sizes="52px"
                          className="object-cover"
                          unoptimized
                        />

                        {/* Auto-buff dot — top-left, inside for natural clipping */}
                        {displayPerk.buffKey && (
                          <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-green-400 rounded-full border border-black/60" />
                        )}
                      </button>

                      {/* Tier badge — outside button so overflow:hidden doesn't clip it */}
                      {mode === 'pve' && tierCfg && !isUpgraded && (
                        <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-px rounded-full z-10 ${tierCfg.badge}`}>
                          {tierCfg.label}
                        </span>
                      )}

                      {/* ENH chip — same treatment */}
                      {isUpgraded && (
                        <span className="absolute -bottom-1 -right-1 text-[7px] font-black leading-none px-1 py-px rounded-full z-10 bg-amber-400 text-black">
                          ENH
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
