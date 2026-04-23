'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE } from '../../lib/buffDatabase';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { useCompendiumPerks } from '../../lib/useCompendiumPerks';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { renderClarityDesc } from '../../lib/clarityRender';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import { Tooltip } from '../ui/Tooltip';
import PERK_AUDIT_RAW from '../../data/perkAudit.json';

type AuditAnnotation = { clarityVerified: boolean; notes: string };
const PERK_AUDIT = PERK_AUDIT_RAW as Record<string, AuditAnnotation | undefined>;

// ── Effect controls ───────────────────────────────────────────────────────────

/**
 * Simple pill toggle for boolean (on/off) conditional perks.
 * Calls onSet(0) to turn off, onSet(1) to turn on.
 */
function EffectToggle({ on, onSet, label }: { on: boolean; onSet: (v: number) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={`${on ? 'Deactivate' : 'Activate'} ${label}`}
      onClick={() => onSet(on ? 0 : 1)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
        on ? 'border-amber-500 bg-amber-500/30' : 'border-white/20 bg-white/5',
      ].join(' ')}
    >
      <span className={[
        'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 mt-[1px]',
        on ? 'translate-x-3.5 bg-amber-400' : 'translate-x-0.5 bg-slate-500',
      ].join(' ')} />
    </button>
  );
}

/**
 * Stack selector for multi-state perks (Rampage ×1/×2/×3, Swashbuckler ×1–×5, etc.).
 * Renders an "Off" button plus one button per stack level.
 * `currentState` is the activeEffects value (0 = off, N = stack N).
 */
function EffectStackSelector({
  buffKey,
  currentState,
  onSet,
}: {
  buffKey: string;
  currentState: number;
  onSet: (v: number) => void;
}) {
  const buff = BUFF_DATABASE[buffKey];
  if (!buff?.stacks?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {/* Off button */}
      <button
        onClick={() => onSet(0)}
        className={[
          'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
          currentState === 0
            ? 'bg-slate-700 border-slate-500 text-slate-200'
            : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20',
        ].join(' ')}
      >
        Off
      </button>
      {/* Stack buttons — state N = stacks[N-1] */}
      {buff.stacks.map((stack, idx) => {
        const stateVal = idx + 1;
        const isActive = currentState === stateVal;
        const pctLabel = `+${((stack.multiplier - 1) * 100).toFixed(0)}%`;
        return (
          <button
            key={stack.count}
            onClick={() => onSet(stateVal)}
            className={[
              'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
              isActive
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-200 hover:border-white/20',
            ].join(' ')}
          >
            {stack.label}
            <span className="ml-1 text-[9px] font-normal opacity-70">{pctLabel}</span>
          </button>
        );
      })}
    </div>
  );
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

// ── StatModPills helper ───────────────────────────────────────────────────────
function StatModPills({
  mods,
  annotation,
}: {
  mods: Array<{ statName: string; value: number; isConditional?: boolean }>;
  annotation?: AuditAnnotation | null;
}) {
  const nonZero = mods.filter((m) => m.value !== 0);
  if (nonZero.length === 0) return null;

  const sourceNode = annotation?.clarityVerified
    ? <span className="text-emerald-400">✓ Clarity DB</span>
    : annotation?.notes
    ? <span className="text-slate-500">{annotation.notes}</span>
    : null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {nonZero.map((mod) => {
        const positive = mod.value > 0;
        const pillClass = positive
          ? 'bg-green-500/10 text-green-400 border-green-500/25'
          : 'bg-red-500/10 text-red-400 border-red-500/25';
        const pill = (
          <span
            key={mod.statName}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none cursor-default ${pillClass}`}
          >
            {positive ? '+' : ''}{mod.value} {mod.statName}
          </span>
        );
        const tipContent = (
          <div className="space-y-1 text-[11px]">
            <p className="font-semibold text-slate-200">
              {positive ? '+' : ''}{mod.value} {mod.statName}
            </p>
            {mod.isConditional && (
              <p className="text-slate-400">Activates with perk</p>
            )}
            {sourceNode && (
              <div className="border-t border-white/10 pt-1.5 mt-0.5 text-[10px]">{sourceNode}</div>
            )}
          </div>
        );
        return (
          <Tooltip key={mod.statName} content={tipContent} delay={150}>
            {pill}
          </Tooltip>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const EffectsPanel: React.FC = () => {
  const { activeWeapon, selectedPerks, activeBuffs, activeEffects, clearPerk, toggleBuff, setEffectState } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:   s.activeWeapon,
      selectedPerks:  s.selectedPerks,
      activeBuffs:    s.activeBuffs,
      activeEffects:  s.activeEffects,
      clearPerk:      s.clearPerk,
      toggleBuff:     s.toggleBuff,
      setEffectState: s.setEffectState,
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
      isConditional: boolean;
      buffKey: string | null;
      statModifiers: Array<{ statName: string; value: number }>;
      activation:  import('../../types/weapon').PerkActivation | null;
      activation2: import('../../types/weapon').PerkActivation | null;
    }> = [];

    for (const [columnName, perkHash] of Object.entries(selectedPerks)) {
      const column = activeWeapon.perkSockets.find((c) => c.name === columnName);
      if (!column) continue;

      let perk = column.perks.find((p) => p.hash === perkHash) ?? null;
      let basePerk = perk;

      if (!perk) {
        basePerk = column.perks.find((p) => p.enhancedVersion?.hash === perkHash) ?? null;
        if (basePerk?.enhancedVersion) {
          const enhanced = basePerk.enhancedVersion;
          // Carry buffKey and isConditional from base onto enhanced object
          perk = enhanced.buffKey ? enhanced : {
            ...enhanced,
            buffKey: basePerk.buffKey,
            isConditional: basePerk.isConditional,
          };
        }
      }

      if (perk) entries.push({
        columnName,
        perkHash,
        ...perk,
        activation:  perk.activation  ?? null,
        activation2: perk.activation2 ?? null,
      });
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

  // Split perks into conditional (need toggle) and passive (always-on)
  const conditionalEntries = activePerkEntries.filter((e) => e.isConditional);
  const passiveEntries     = activePerkEntries.filter((e) => !e.isConditional);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-white">Effects</h2>

      {isEmpty ? (
        <p className="text-slate-600 text-sm text-center py-6">
          No perks or buffs active. Select perks above to see their effects here.
        </p>
      ) : (
        <div className="space-y-3">

          {/* ── Conditional perks (Effects Tab toggles) ── */}
          {conditionalEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Conditional Effects
              </p>
              {conditionalEntries.map(({ columnName, perkHash, name, icon, description, isEnhanced, buffKey, statModifiers, activation, activation2 }) => {
                const currentState = activeEffects[perkHash] ?? 0;
                const isOn = currentState > 0;
                const buff = buffKey ? BUFF_DATABASE[buffKey] : null;
                const isStackable = !!(buff?.stacks?.length);
                return (
                  <div
                    key={perkHash}
                    className={[
                      'flex gap-3 p-3 rounded-lg border group transition-colors',
                      isOn
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-black/40 border-white/10',
                    ].join(' ')}
                  >
                    {/* Icon */}
                    <div className={[
                      'relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-colors',
                      isOn ? 'border-amber-400' : 'border-slate-600',
                    ].join(' ')}>
                      {icon && (
                        <Image
                          src={BUNGIE_URL + icon}
                          alt={name}
                          fill
                          sizes="40px"
                          className={['object-cover transition-opacity', isOn ? 'opacity-100' : 'opacity-40'].join(' ')}
                          unoptimized
                        />
                      )}
                      {isEnhanced && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={['font-semibold text-sm transition-colors', isOn ? 'text-amber-400' : 'text-slate-400'].join(' ')}>
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
                            {/* Active / inactive badge */}
                            <span className={[
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none shrink-0',
                              isOn
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-white/5 text-slate-500 border border-white/10',
                            ].join(' ')}>
                              {isOn ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 uppercase tracking-wide">{columnName}</span>

                          {/* Activation timing badges */}
                          {(() => {
                            const acts = [activation, activation2].filter(Boolean) as NonNullable<typeof activation>[];
                            if (acts.length === 0) return null;
                            const auditEntry = PERK_AUDIT[name] ?? null;
                            const TTA_COLORS: Record<string, string> = {
                              'Kill-Proc':      'bg-red-500/15 text-red-400 border-red-500/30',
                              'Reload-Proc':    'bg-blue-500/15 text-blue-400 border-blue-500/30',
                              'Wind-Up':        'bg-amber-500/15 text-amber-400 border-amber-500/30',
                              'State-Based':    'bg-teal-500/15 text-teal-400 border-teal-500/30',
                              'Shot-Proc':      'bg-purple-500/15 text-purple-400 border-purple-500/30',
                              'Melee-Proc':     'bg-orange-500/15 text-orange-400 border-orange-500/30',
                              'Instant-Always': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
                              'Orb-Proc':       'bg-violet-500/15 text-violet-400 border-violet-500/30',
                              'Ability-Proc':   'bg-green-500/15 text-green-400 border-green-500/30',
                              'Ammo-Proc':      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                              'Conditional State': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                            };
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {acts.map((act, i) => {
                                  const color = TTA_COLORS[act.ttaCategory] ?? 'bg-white/5 text-slate-400 border-white/10';
                                  const ttaLabel = act.estTtaSeconds && act.estTtaSeconds !== '0'
                                    ? `${act.estTtaSeconds}s wind-up`
                                    : act.ttaCategory;
                                  const durLabel = act.duration ? ` · ${act.duration}` : '';
                                  const tipContent = (
                                    <div className="space-y-1 text-[11px]">
                                      <p className="font-semibold text-slate-200">{act.ttaCategory}</p>
                                      <p className="text-slate-400">Trigger: <span className="text-slate-300">{act.trigger}</span></p>
                                      {act.duration && <p className="text-slate-400">Duration: <span className="text-slate-300">{act.duration}</span></p>}
                                      {act.estTtaSeconds && act.estTtaSeconds !== '0' && (
                                        <p className="text-slate-400">Wind-up: <span className="text-slate-300">~{act.estTtaSeconds}s</span></p>
                                      )}
                                      {auditEntry && (
                                        <div className="border-t border-white/10 pt-1.5 mt-0.5 text-[10px]">
                                          {auditEntry.clarityVerified
                                            ? <span className="text-emerald-400">✓ Clarity DB</span>
                                            : <span className="text-slate-500">{auditEntry.notes}</span>
                                          }
                                        </div>
                                      )}
                                    </div>
                                  );
                                  return (
                                    <Tooltip key={i} content={tipContent} delay={150}>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none cursor-default ${color}`}>
                                        {ttaLabel}{durLabel}
                                      </span>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Stat modifier pills — inline below TTA badges */}
                          <StatModPills mods={statModifiers} annotation={PERK_AUDIT[name]} />
                        </div>

                        {/* Right side: toggle control */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Boolean perks: pill toggle.  Stackable perks: inline stack buttons. */}
                          {!isStackable && (
                            <EffectToggle
                              on={isOn}
                              onSet={(v) => setEffectState(perkHash, v)}
                              label={name}
                            />
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {(() => {
                        const clarityEntry = clarityData?.[perkHash];
                        if (clarityEntry) {
                          return (
                            <div className="mt-1">
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {renderClarityDesc(clarityEntry)}
                              </p>
                              <span className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
                                <span>via{' '}
                                  <a href="https://d2clarity.com" target="_blank" rel="noopener noreferrer"
                                    className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                                    Clarity
                                  </a>
                                </span>
                              </span>
                            </div>
                          );
                        }
                        const compEntry = compendiumData?.[name];
                        if (compEntry) {
                          return (
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{compEntry.baseDescription}</p>
                          );
                        }
                        return (
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">{description}</p>
                        );
                      })()}

                      {/* Stackable perk: stack selector placed below description */}
                      {isStackable && buffKey && (
                        <EffectStackSelector
                          buffKey={buffKey}
                          currentState={currentState}
                          onSet={(v) => setEffectState(perkHash, v)}
                        />
                      )}

                      {/* Buff multiplier indicator when active */}
                      {isOn && buff && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-xs text-amber-500 font-medium">
                            {buff.name}{' '}
                            {isStackable && buff.stacks
                              ? `×${buff.stacks[currentState - 1]?.multiplier.toFixed(2) ?? buff.multiplier.toFixed(2)}`
                              : `×${buff.multiplier.toFixed(2)}`
                            }{' '}active
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dismiss */}
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
                );
              })}
            </div>
          )}

          {/* ── Passive perks (always-on) ── */}
          {passiveEntries.length > 0 && (
            <div className="space-y-2">
              {conditionalEntries.length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 pt-1">
                  Passive Effects
                </p>
              )}
              {passiveEntries.map(({ columnName, perkHash, name, icon, description, isEnhanced, buffKey, statModifiers }) => (
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
                        {/* Stat modifier pills — passive perks show them below the column label */}
                        <StatModPills mods={statModifiers} annotation={PERK_AUDIT[name]} />
                      </div>
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
            </div>
          )}

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
