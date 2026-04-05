'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE } from '../../lib/buffDatabase';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { useCompendiumPerks } from '../../lib/useCompendiumPerks';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { ClarityEntry } from '../../lib/clarity';
import { BUNGIE_URL } from '../../lib/bungieUrl';

// ── className → colour mapping ────────────────────────────────────────────────
const CLASS_COLOURS: Record<string, string> = {
  arc:     '#7dd3fc', // sky-300
  void:    '#c4b5fd', // violet-300
  stasis:  '#67e8f9', // cyan-300
  solar:   '#fdba74', // orange-300
  strand:  '#6ee7b7', // emerald-300
  kinetic: '#cbd5e1', // slate-300
  pvp:     '#f472b6', // pink-400
  pve:     '#4ade80', // green-400
  primary: '#cbd5e1', // slate-300
  special: '#86efac', // green-300
  heavy:   '#c4b5fd', // violet-300
};

/**
 * Renders a Clarity description as React nodes with proper line breaks and
 * coloured keywords.
 *
 * The Clarity JSON has three distinct segment shapes:
 *
 *   A) {text, classNames}  — text WITH a class applied (e.g. "20%" + "pve").
 *      The text IS the visible content; classNames gives it colour.
 *      Previously this was treated as shape B (classNames-only), causing the
 *      text to be silently dropped and values like "20%" to disappear.
 *
 *   B) {classNames}        — icon placeholder with no text (e.g. ammo type icon
 *      before "Primary Weapons:"). The colour is queued and applied to the
 *      immediately following plain-text segment so the icon word isn't doubled.
 *
 *   C) {text}              — plain text, rendered as-is (with any queued colour).
 *
 * Additionally, some groups carry a top-level {classNames:["spacer"]} instead
 * of linesContent — those insert a blank line between sections.
 *
 * Each group (line) is separated by a <br /> so bullet lists and multi-
 * sentence descriptions don't collapse into an unreadable wall of text.
 */
function renderClarityDesc(entry: ClarityEntry): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const groups = entry.descriptions?.en ?? [];

  groups.forEach((group, gi) => {
    // ── Group-level spacer (no linesContent) ──────────────────────────────
    if (!group.linesContent?.length) {
      // Spacer adds an extra blank line; any other top-level class is ignored.
      if (group.classNames?.includes('spacer')) {
        nodes.push(<br key={`spacer-${gi}`} />);
      }
      return; // no line-break added here — the next group's separator handles it
    }

    // ── Line break before every group after the first ─────────────────────
    if (gi > 0) nodes.push(<br key={`br-${gi}`} />);

    // ── Render inline segments ─────────────────────────────────────────────
    let pendingColour: string | null = null;

    group.linesContent.forEach((seg, si) => {
      const key = `${gi}-${si}`;

      if (seg.text && seg.classNames?.length) {
        // Shape A — text + classNames: render the text with the class colour.
        // "link" class renders as underlined text.
        const cls = seg.classNames[0];
        if (cls === 'link') {
          nodes.push(
            <span key={key} className="underline decoration-slate-500 text-slate-200">
              {seg.text}
            </span>
          );
        } else {
          const colour = CLASS_COLOURS[cls];
          nodes.push(colour
            ? <span key={key} style={{ color: colour }} className="font-semibold">{seg.text}</span>
            : <React.Fragment key={key}>{seg.text}</React.Fragment>
          );
        }
        pendingColour = null; // a coloured segment resets any queued colour

      } else if (seg.classNames?.length) {
        // Shape B — icon placeholder only: queue colour for the next text segment.
        // Multiple consecutive icon segments → last one wins.
        const cls = seg.classNames[0];
        pendingColour = CLASS_COLOURS[cls] ?? null;

      } else if (seg.text) {
        // Shape C — plain text, apply queued colour if present.
        if (pendingColour) {
          nodes.push(
            <span key={key} style={{ color: pendingColour }} className="font-semibold">
              {seg.text}
            </span>
          );
          pendingColour = null;
        } else {
          nodes.push(<React.Fragment key={key}>{seg.text}</React.Fragment>);
        }
      }
    });
  });

  return nodes;
}

// ── StatDelta helper ──────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export const EffectsPanel: React.FC = () => {
  const { activeWeapon, selectedPerks, activeBuffs, clearPerk, toggleBuff } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:  s.activeWeapon,
      selectedPerks: s.selectedPerks,
      activeBuffs:   s.activeBuffs,
      clearPerk:     s.clearPerk,
      toggleBuff:    s.toggleBuff,
    }))
  );

  const { data: clarityData  } = useClarityPerks();
  const { data: compendiumData } = useCompendiumPerks();

  // Memoize active perk resolution — only recomputes when selections change.
  const activePerkEntries = useMemo(() => {
    if (!activeWeapon) return [];
    const entries: Array<{
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
      if (!column) continue;

      let perk = column.perks.find((p) => p.hash === perkHash) ?? null;

      if (!perk) {
        const basePerk = column.perks.find((p) => p.enhancedVersion?.hash === perkHash);
        if (basePerk?.enhancedVersion) {
          const enhanced = basePerk.enhancedVersion;
          perk = enhanced.buffKey ? enhanced : { ...enhanced, buffKey: basePerk.buffKey };
        }
      }

      if (perk) entries.push({ columnName, perkHash, ...perk });
    }
    return entries;
  }, [activeWeapon, selectedPerks]);

  // Memoize manual buff list — only changes when activeBuffs or perk entries change.
  const manualBuffEntries = useMemo(() => {
    const autoBuff = new Set(activePerkEntries.map((p) => p.buffKey).filter(Boolean));
    return activeBuffs
      .filter((hash) => !autoBuff.has(hash))
      .map((hash) => BUFF_DATABASE[hash])
      .filter(Boolean);
  }, [activePerkEntries, activeBuffs]);

  if (!activeWeapon) return null;

  const isEmpty = activePerkEntries.length === 0 && manualBuffEntries.length === 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-white">Effects</h2>

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
              className="flex gap-3 p-3 bg-black/40 rounded-lg border border-white/10 group"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-amber-400">
                        {name}
                        {isEnhanced && (
                          <span className="ml-1.5 text-xs text-amber-300 font-normal">(Enhanced)</span>
                        )}
                      </span>
                      {/* Tier badge */}
                      {(() => {
                        const p = activeWeapon.perkSockets
                          .find((c) => c.name === columnName)
                          ?.perks.find((p) => p.hash === perkHash);
                        if (!p?.tier) return null;
                        const cfg = TIER_CONFIG[p.tier as PerkTier];
                        return cfg ? (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded leading-none shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
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

                {/* Description priority:
                    1. Clarity (hash lookup — most accurate, community-maintained)
                    2. Data Compendium (name lookup — fallback)
                    3. Bungie manifest description (last resort) */}
                {(() => {
                  // ① Clarity — keyed by perk hash string
                  const clarityEntry = clarityData?.[perkHash];
                  if (clarityEntry) {
                    return (
                      <div className="mt-1">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {renderClarityDesc(clarityEntry)}
                        </p>
                        <span className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
                          <span>
                            via{' '}
                            <a
                              href="https://d2clarity.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                            >
                              Clarity
                            </a>
                          </span>
                          <span className="text-slate-800">·</span>
                          <a
                            href="https://d2clarity.com/discord"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            Feedback on this description ↗
                          </a>
                        </span>
                      </div>
                    );
                  }

                  // ② Data Compendium — keyed by perk name
                  const compEntry = compendiumData?.[name];
                  if (compEntry) {
                    const bonuses = isEnhanced
                      ? compEntry.enhancedBonuses.map((b) => b.replace(/↑/g, '').trim()).filter(Boolean)
                      : [];
                    return (
                      <div className="mt-1">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {compEntry.baseDescription}
                        </p>
                        {bonuses.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {bonuses.map((bonus, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded"
                              >
                                <span className="text-amber-400 font-bold">↑</span>
                                {bonus}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-600 mt-1 block">via Data Compendium</span>
                      </div>
                    );
                  }

                  // ③ Bungie manifest fallback
                  return (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                      {description}
                    </p>
                  );
                })()}

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
              className="flex gap-3 p-3 bg-black/40 rounded-lg border border-white/10 group"
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
