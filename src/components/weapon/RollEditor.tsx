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

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Weapon Perks</h2>
        {hasEnhanceable && (
          <span className="text-xs text-amber-500/70 font-semibold">
            Click perk twice to enhance ⚡
          </span>
        )}
      </div>

      <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 gap-6 md:pb-0">
        {activeWeapon.perkSockets.map((column) => {
          const isOriginTraitCol = column.columnType === 'origin';
          const columnDisabled = isOriginTraitCol && isLegacy;

          return (
            <div
              key={column.name}
              className={[
                'flex flex-col gap-3 min-w-[64px] items-center',
                columnDisabled ? 'opacity-30 pointer-events-none' : '',
              ].join(' ')}
            >
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 whitespace-nowrap flex items-center gap-1">
                {column.name}
                {columnDisabled && (
                  <span className="text-[9px] text-slate-600 normal-case tracking-normal">(legacy)</span>
                )}
              </h3>

              {column.perks.map((perk) => {
                const selectedHash = selectedPerks[column.name];
                // Determine which perk is currently "active" — could be base or enhanced version
                const isBaseActive     = selectedHash === perk.hash;
                const isEnhancedActive = perk.enhancedVersion
                  ? selectedHash === perk.enhancedVersion.hash
                  : false;
                const isActive = isBaseActive || isEnhancedActive;

                // Show enhanced icon/name whenever enhanced is selected (no crafted gate)
                const displayPerk: Perk = (isEnhancedActive && perk.enhancedVersion)
                  ? perk.enhancedVersion
                  : perk;

                const tierCfg = perk.tier ? TIER_CONFIG[perk.tier as PerkTier] : null;
                // canUpgrade: base is selected and an enhanced version exists — no crafted gate
                const canUpgrade = !!perk.enhancedVersion && isBaseActive;
                const isUpgraded = isEnhancedActive;

                // Click cycle: none → base → enhanced (if available) → none
                const handleClick = () => {
                  if (!isActive) {
                    selectPerk(column.name, perk.hash);
                  } else if (isBaseActive && perk.enhancedVersion) {
                    selectPerk(column.name, perk.enhancedVersion.hash);
                  } else {
                    clearPerk(column.name);
                  }
                };

                // Tooltip hints the next action on click
                const nextAction = !isActive
                  ? displayPerk.name
                  : isBaseActive && perk.enhancedVersion
                    ? `Enhance → ${perk.enhancedVersion.name}`
                    : `Deselect ${displayPerk.name}`;

                return (
                  <div key={perk.hash} className="relative flex flex-col items-center gap-1">
                    <button
                      onClick={handleClick}
                      title={`${nextAction}${perk.tier ? ` [${perk.tier}]` : ''}: ${displayPerk.description}`}
                      aria-pressed={isActive}
                      className={[
                        'relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-200 overflow-hidden',
                        isActive
                          ? isUpgraded
                            ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110 opacity-100'
                            : 'border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.2)] scale-110 opacity-100'
                          : tierCfg
                            ? `${tierCfg.border} opacity-60 hover:opacity-100`
                            : 'border-white/20 hover:border-white/40 opacity-60 hover:opacity-100',
                      ].join(' ')}
                    >
                      <Image
                        src={BUNGIE_URL + displayPerk.icon}
                        alt={displayPerk.name}
                        fill
                        sizes="(max-width: 768px) 48px, 56px"
                        className="object-cover"
                        unoptimized
                      />
                      {/* Auto-buff indicator */}
                      {displayPerk.buffKey && (
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-black" />
                      )}
                      {/* Enhanced active indicator — amber E badge */}
                      {isUpgraded && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-400 rounded-full border border-black flex items-center justify-center">
                          <span className="text-[7px] font-black text-black leading-none">E</span>
                        </div>
                      )}
                      {/* "Click to enhance" hint dot — crafted, base selected, enhanced available */}
                      {canUpgrade && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500/60 rounded-full border border-amber-400/60 animate-pulse" />
                      )}
                    </button>

                    {/* Tier badge — PvE only */}
                    {mode === 'pve' && tierCfg && !isUpgraded && (
                      <span className={`text-[10px] font-black leading-none px-1 py-0.5 rounded ${tierCfg.badge}`}>
                        {tierCfg.label}
                      </span>
                    )}
                    {mode === 'pve' && isUpgraded && (
                      <span className="text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        ENH
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
        <span>Click to select · click again to enhance · click once more to deselect.</span>
        <span><span className="text-green-500">●</span> = auto-buff.</span>
        {mode === 'pve' && <span>Tier: <span className="text-amber-400 font-bold">S</span> <span className="text-green-400 font-bold">A</span> <span className="text-blue-400 font-bold">B</span> <span className="text-slate-400 font-bold">C↓</span></span>}
      </div>
    </div>
  );
};
