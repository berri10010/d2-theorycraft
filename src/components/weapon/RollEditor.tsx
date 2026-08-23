'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { Perk, PerkColumn } from '../../types/weapon';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import { Tooltip } from '../ui/Tooltip';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { renderClarityDesc } from '../../lib/clarityRender';
import { useGodRolls } from '../../lib/useGodRolls';
import { getPerkFamily } from '../../lib/perkFamily';

// ── Main component ────────────────────────────────────────────────────────────

export const RollEditor: React.FC = () => {
  const {
    activeWeapon, selectedPerks, selectPerk, clearPerk,
    isCrafted, isEnhanced, setEnhanced, mode, weaponTier,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:  s.activeWeapon,
      selectedPerks: s.selectedPerks,
      selectPerk:    s.selectPerk,
      clearPerk:     s.clearPerk,
      isCrafted:     s.isCrafted,
      isEnhanced:    s.isEnhanced,
      setEnhanced:   s.setEnhanced,
      mode:          s.mode,
      weaponTier:    s.weaponTier,
    }))
  );

  const { data: clarityData } = useClarityPerks();
  const { data: godRollDb }   = useGodRolls();
  const [flashHash, setFlashHash] = useState<string | null>(null);

  // Build a map of column-type → Set<lowercase perk name> for god roll highlights
  const godRollNames = useMemo(() => {
    if (!activeWeapon || !godRollDb) return null;
    const entry = godRollDb[activeWeapon.name];
    if (!entry) return null;

    const toSet = (arr: string[]) => new Set(arr.map((n) => n.toLowerCase()));
    const perkCols = activeWeapon.perkSockets.filter((c) => c.columnType === 'perk');

    let originSet = new Set<string>();
    if (entry.originTrait && entry.originTrait !== 'None') {
      const parts = entry.originTrait.includes('\n')
        ? entry.originTrait.split('\n').map((s) => s.trim()).filter(Boolean)
        : entry.originTrait.length <= 40 ? [entry.originTrait] : [];
      originSet = toSet(parts);
    }

    return {
      barrel:     toSet(entry.barrel ?? []),
      mag:        toSet(entry.mag ?? []),
      perk1:      toSet(entry.perk1 ?? []),
      perk2:      toSet(entry.perk2 ?? []),
      origin:     originSet,
      perk1ColName: perkCols[0]?.name ?? null,
      perk2ColName: perkCols[1]?.name ?? null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeapon, godRollDb]);

  const isTieredWeapon = (activeWeapon?.seasonNumber ?? 0) >= 27 && activeWeapon?.rarity !== 'Exotic';

  // Which column types can be enhanced at the current weapon tier.
  // For non-tiered weapons all columns are unrestricted.
  const tierAllowsEnhance = useCallback((columnType: string): boolean => {
    if (!isTieredWeapon) return true;
    switch (columnType) {
      case 'perk':   return weaponTier >= 2;
      case 'barrel':
      case 'mag':    return weaponTier >= 4;
      case 'origin': return weaponTier >= 5;
      default:       return false;
    }
  }, [isTieredWeapon, weaponTier]);

  // When tier changes, sync perk selections to the tier's enhancement rules:
  // - Tier now allows a column → upgrade base → enhanced (if enhanced exists)
  // - Tier no longer allows a column → downgrade enhanced → base
  useEffect(() => {
    if (!activeWeapon || !isTieredWeapon) return;
    const { selectedPerks: current, selectPerk: sp } = useWeaponStore.getState();
    for (const col of activeWeapon.perkSockets) {
      const selected = current[col.name];
      if (!selected) continue;
      if (tierAllowsEnhance(col.columnType)) {
        const basePerk = col.perks.find((p) => p.hash === selected && p.enhancedVersion);
        if (basePerk) sp(col.name, basePerk.enhancedVersion!.hash);
      } else {
        const basePerk = col.perks.find((p) => p.enhancedVersion?.hash === selected);
        if (basePerk) sp(col.name, basePerk.hash);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weaponTier, activeWeapon]);

  // Auto-derive enhanced state: isEnhanced is true ONLY when both Perk 1 and Perk 2
  // have their enhanced version explicitly selected. Any other state disables it.
  const shouldBeEnhanced = useMemo(() => {
    // Tiered weapons don't use the global isEnhanced flag — tier drives everything.
    if (isTieredWeapon || isCrafted || !activeWeapon) return false;
    const perkCols = activeWeapon.perkSockets.filter((col) => col.columnType === 'perk');
    const perk1 = perkCols[0];
    const perk2 = perkCols[1];
    // Both columns must exist
    if (!perk1 || !perk2) return false;
    const isEnhancedSelected = (col: typeof perk1): boolean => {
      const selected = selectedPerks[col.name];
      if (!selected) return false; // nothing selected — can't be enhanced
      return col.perks.some((p) => p.enhancedVersion?.hash === selected);
    };
    return isEnhancedSelected(perk1) && isEnhancedSelected(perk2);
  }, [isCrafted, activeWeapon, selectedPerks]);

  // Auto-sync isEnhanced to the derived condition
  useEffect(() => {
    if (shouldBeEnhanced !== isEnhanced) {
      setEnhanced(shouldBeEnhanced);
    }
  }, [shouldBeEnhanced, isEnhanced, setEnhanced]);

  const hasPerkEnhanceable = useMemo(
    () => !!activeWeapon?.perkSockets
      .some((col) => col.perks.some((p) => !!p.enhancedVersion || p.isEnhanced)),
    [activeWeapon]
  );

  if (!activeWeapon) return <div className="text-slate-500 text-center p-4">No weapon loaded.</div>;

  // Derive the display label for a column.
  // For perk columns, if every perk shares the same non-Trait family (e.g. all
  // are Origin Trait, or all are Grip), use that family name. Otherwise fall back
  // to the parser's numbered name ("Perk 1", "Perk 2", etc.).
  function colDisplayName(col: PerkColumn): string {
    if (col.columnType !== 'perk') return col.name;
    if (col.perks.length === 0) return col.name;
    const families = new Set(col.perks.map((p: Perk) => getPerkFamily(p, col)));
    if (families.size === 1) {
      const fam = [...families][0];
      if (fam !== 'Trait') return fam === 'Origin Trait' ? 'Origin Trait' : fam;
    }
    return col.name;
  }

  const COL_ACCENT_DERIVED: Record<string, string> = {
    barrel: 'bg-orange-500/40',
    mag:    'bg-blue-500/40',
    perk:   'bg-slate-500/40',
    origin: 'bg-emerald-500/40',
  };

  return (
    <CollapsiblePanel
      title="Weapon Perks"
      storageKey="weapon-perks"
      fullWidth
      headerRight={hasPerkEnhanceable && !isCrafted && !isTieredWeapon && (
        <span className="text-xs text-slate-500 font-normal tracking-wide">
          Click twice to enhance
        </span>
      )}
    >

      {/* ── Perk columns — identical layout regardless of single vs. multiple options ── */}
      {activeWeapon.perkSockets.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${activeWeapon.perkSockets.length}, minmax(0, 1fr))` }}>
          {activeWeapon.perkSockets.map((column, colIdx) => {
            const displayLabel     = colDisplayName(column);
            const isOriginTraitCol = column.columnType === 'origin' || displayLabel === 'Origin Trait';
            const accentBarKey     = isOriginTraitCol ? 'origin' : column.columnType;
            const accentBar        = COL_ACCENT_DERIVED[accentBarKey] ?? 'bg-slate-500/40';
            const isLast           = colIdx === activeWeapon.perkSockets.length - 1;

            return (
              <div
                key={column.name}
                className={[
                  'flex flex-col items-center min-w-[60px]',
                  !isLast ? 'border-r border-white/5 pr-3 md:pr-4' : '',
                ].join(' ')}
              >
                {/* Column header */}
                <div className="w-full flex flex-col items-center gap-1 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {displayLabel}
                  </span>
                  <div className={`h-0.5 w-8 rounded-full ${accentBar}`} />
                </div>

                {/* Perk icons — same grid layout for every column */}
                <div className="flex flex-col gap-2.5 items-center">
                  {column.perks.map((perk) => {
                    const selectedHash     = selectedPerks[column.name];
                    const isBaseActive     = selectedHash === perk.hash;
                    const isEnhancedActive = perk.enhancedVersion
                      ? selectedHash === perk.enhancedVersion.hash
                      : false;
                    const isActive   = isBaseActive || isEnhancedActive;
                    // isUpgraded covers two cases:
                    //   1. Normal: enhanced version of a base perk is selected
                    //   2. Orphaned: perk itself is isEnhanced (no base in this socket)
                    const isUpgraded = isEnhancedActive || (perk.isEnhanced && isBaseActive);

                    const displayPerk: Perk = (isEnhancedActive && perk.enhancedVersion)
                      ? perk.enhancedVersion
                      : perk;

                    const tierCfg = perk.tier ? TIER_CONFIG[perk.tier as PerkTier] : null;

                    // God roll indicator — amber star on matching perks (PvE only)
                    let isGodRoll = false;
                    if (mode === 'pve' && godRollNames) {
                      const n = perk.name.toLowerCase();
                      switch (column.columnType) {
                        case 'barrel': isGodRoll = godRollNames.barrel.has(n); break;
                        case 'mag':    isGodRoll = godRollNames.mag.has(n);    break;
                        case 'origin': isGodRoll = godRollNames.origin.has(n); break;
                        case 'perk':
                          isGodRoll = column.name === godRollNames.perk1ColName
                            ? godRollNames.perk1.has(n)
                            : godRollNames.perk2.has(n);
                          break;
                      }
                    }

                    const flash = (hash: string) => {
                      setFlashHash(hash);
                      // Cleared by motion's onAnimationComplete — no setTimeout needed
                    };

                    const canEnhanceCol = tierAllowsEnhance(column.columnType);
                    // At a tier-unlocked column, if a perk has an enhanced version it must
                    // be used — the base version is not selectable.
                    const forceEnhanced = canEnhanceCol && !!perk.enhancedVersion;

                    const handleClick = () => {
                      if (!isActive) {
                        const targetHash = forceEnhanced ? perk.enhancedVersion!.hash : perk.hash;
                        selectPerk(column.name, targetHash);
                        flash(targetHash);
                      } else {
                        clearPerk(column.name);
                      }
                    };

                    const nextAction = !isActive
                      ? (forceEnhanced ? perk.enhancedVersion!.name : displayPerk.name)
                      : `Deselect ${displayPerk.name}`;

                    const clarityEntry = clarityData?.[String(displayPerk.hash)] ?? clarityData?.[String(perk.hash)];

                    // Origin trait perk inside a mixed perk column (e.g. Hezen Vengeance Perk 2).
                    // The column header can't reflect this, so give the icon an emerald ring instead.
                    const isOriginInMixed = !isOriginTraitCol
                      && column.columnType === 'perk'
                      && getPerkFamily(perk, column) === 'Origin Trait';

                    // Stat modifier badges (e.g. +10 Range, -5 Handling) — unconditional mods only
                    const statMods = (displayPerk.statModifiers ?? []).filter(
                      (m) => m.value !== 0 && !m.isConditional
                    );

                    const tooltipContent = (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[11px] font-bold text-white leading-tight">{displayPerk.name}</span>
                          {perk.tier && (
                            <span className={`text-[9px] font-black px-1 py-px rounded leading-none ${
                              perk.tier === 'S' ? 'bg-amber-500/30 text-amber-300' :
                              perk.tier === 'A' ? 'bg-emerald-500/25 text-emerald-300' :
                              perk.tier === 'B' ? 'bg-blue-500/25 text-blue-300' :
                              perk.tier === 'C' ? 'bg-slate-500/30 text-slate-300' :
                              perk.tier === 'D' ? 'bg-slate-600/30 text-slate-400' :
                              perk.tier === 'E' ? 'bg-slate-700/30 text-slate-500' :
                              perk.tier === 'F' ? 'bg-slate-800/30 text-slate-600' :
                              perk.tier === 'G' ? 'bg-red-900/30 text-red-400' :
                              'bg-white/10 text-slate-400'
                            }`}>{perk.tier}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          {clarityEntry ? renderClarityDesc(clarityEntry) : displayPerk.description}
                        </div>
                        {statMods.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {statMods.map((mod) => (
                              <span
                                key={mod.statName}
                                className={`text-[9px] font-bold px-1 py-px rounded leading-none ${
                                  mod.value > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {mod.value > 0 ? '+' : ''}{mod.value} {mod.statName}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-600 mt-1">{nextAction}</div>
                      </div>
                    );

                    const isFlashing = flashHash === perk.hash || flashHash === perk.enhancedVersion?.hash;

                    return (
                      <Tooltip key={perk.hash} content={tooltipContent}>
                      <div className="relative shrink-0">
                        {isFlashing && (
                          <motion.span
                            className="absolute inset-0 rounded-full pointer-events-none z-10"
                            initial={{ boxShadow: '0 0 0 0px rgba(255,255,255,0.55)', opacity: 1 }}
                            animate={{ boxShadow: '0 0 0 10px rgba(255,255,255,0)', opacity: 0 }}
                            transition={{ duration: 0.38, ease: 'easeOut' }}
                            onAnimationComplete={() =>
                              setFlashHash((h) =>
                                h === perk.hash || h === perk.enhancedVersion?.hash ? null : h
                              )
                            }
                          />
                        )}
                        <button
                          onClick={handleClick}
                          aria-pressed={isActive}
                          className={[
                            'relative w-12 h-12 md:w-13 md:h-13 rounded-full border-2 transition-all duration-150 overflow-hidden block',
                            isActive
                              ? isUpgraded
                                ? 'border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)] scale-110 opacity-100'
                                : isOriginInMixed
                                  ? 'border-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.2)] scale-105 opacity-100'
                                  : 'border-white/80 shadow-[0_0_10px_rgba(255,255,255,0.15)] scale-105 opacity-100'
                              : isOriginInMixed
                                ? 'border-emerald-500/35 opacity-50 hover:opacity-85 hover:scale-105 hover:border-emerald-400/55'
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
                          {displayPerk.buffKey && (
                            <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-green-400 rounded-full border border-black/60" />
                          )}
                        </button>

                        {mode === 'pve' && tierCfg && !isUpgraded && (
                          <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-px rounded-full z-10 ${tierCfg.badge}`}>
                            {tierCfg.label}
                          </span>
                        )}

                        {isUpgraded && (
                          <span className="absolute -bottom-1 -right-1 text-[7px] font-black leading-none px-1 py-px rounded-full z-10 bg-amber-400 text-black">
                            ENH
                          </span>
                        )}

                        {/* God roll star — top-left; only when not selected */}
                        {isGodRoll && !isActive && !isUpgraded && (
                          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full z-10 bg-amber-500 flex items-center justify-center">
                            <svg viewBox="0 0 12 12" fill="currentColor" className="w-2 h-2 text-black">
                              <path d="M6 1l1.2 3.7H11L8.1 6.6l1.1 3.4L6 8.1 2.8 10l1.1-3.4L1 4.7h3.8z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}


    </CollapsiblePanel>
  );
};
