'use client';

import React from 'react';
import {
  useWeaponStore,
  buildWeaponModsList,
  NONE_MOD,
} from '../../store/useWeaponStore';
import { Tooltip } from '../ui/Tooltip';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { ClarityEntry } from '../../lib/clarity';

/** Flatten a Clarity entry's English description into plain text. */
function clarityPlainText(entry: ClarityEntry): string | null {
  const lines: string[] = [];
  for (const group of entry.descriptions?.en ?? []) {
    if (!group.linesContent?.length) continue;
    const line = group.linesContent.map((seg) => seg.text ?? '').join('').trim();
    if (line) lines.push(line);
  }
  return lines.length ? lines.join(' ') : null;
}

// ── Compact stat abbreviations for inline badges ──────────────────────────────

const STAT_ABBREV: Record<string, string> = {
  'Impact':                 'Imp',
  'Range':                  'Rng',
  'Stability':              'Stab',
  'Handling':               'Hdl',
  'Reload':                 'Rld',
  'Aim Assistance':         'AA',
  'Zoom':                   'Zoom',
  'Recoil Direction':       'Rcl',
  'Magazine':               'Mag',
  'Airborne Effectiveness': 'AE',
  'Blast Radius':           'BR',
  'Velocity':               'Vel',
  'Accuracy':               'Acc',
  'Ammo Generation':        'AmmoGen',
  'Swing Speed':            'Swing',
  'Guard Resistance':       'GrdRes',
  'Charge Rate':            'ChrRt',
  'Guard Endurance':        'GrdEnd',
  'Shield Duration':        'ShldDur',
};

// ── Main component ────────────────────────────────────────────────────────────

export const MasterworkPanel: React.FC = () => {
  const {
    activeWeapon,
    masterworkStat, setMasterworkStat,
    isCrafted,
    isEnhanced,
    activeMod, setActiveMod,
  } = useWeaponStore();
  const { data: clarityPerks } = useClarityPerks();

  if (!activeWeapon) return null;

  // Exotic weapons use catalysts — no masterwork socket or mod socket.
  if (activeWeapon.rarity === 'Exotic') return null;

  const isAdept = activeWeapon.isAdept;

  // Masterwork options come exclusively from the manifest (filtered at parse time
  // to stats actually present on this weapon, with tier plugs removed).
  const mwOptions: string[] = activeWeapon.masterworkOptions ?? [];

  // Build mod list. Adept-only mods are hidden on non-adept weapons — they can't
  // be equipped there and showing them would mislead the user.
  const allMods    = buildWeaponModsList(activeWeapon);
  const availableMods = isAdept ? allMods : allMods.filter((m) => !m.adeptOnly);

  const hasMw   = mwOptions.length > 0;
  const hasMods = availableMods.length > 1; // more than just NONE_MOD

  if (!hasMw && !hasMods) return null;

  return (
    <>
      {/* ── Masterwork card ─────────────────────────────────────────────── */}
      {hasMw && (
        <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Masterwork</h2>
            {masterworkStat ? (() => {
              const primaryBonus = activeWeapon.masterworkBonuses?.[masterworkStat] ?? 10;
              const primaryLabel = primaryBonus < 0
                ? `${primaryBonus} ${masterworkStat}`
                : `+${primaryBonus} ${masterworkStat}`;
              if (isAdept && isCrafted) return (
                <span className="text-[10px] text-amber-400 font-semibold">
                  {primaryLabel} · +4 others
                </span>
              );
              if (isAdept) return (
                <span className="text-[10px] text-amber-400 font-semibold">
                  {primaryLabel} · +3 others
                </span>
              );
              if (isCrafted) return (
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {primaryLabel} · +2 others
                </span>
              );
              if (isEnhanced) return (
                <span className="text-[10px] text-violet-400 font-semibold">
                  {primaryLabel} · +2 others
                </span>
              );
              return (
                <span className="text-[10px] text-slate-500">{primaryLabel}</span>
              );
            })() : isAdept ? (
              <span className="text-[10px] text-amber-400 font-semibold">
                +10 chosen · +3 others
              </span>
            ) : isCrafted ? (
              <span className="text-[10px] text-emerald-400 font-semibold">
                +10 chosen · +2 others
              </span>
            ) : isEnhanced ? (
              <span className="text-[10px] text-violet-400 font-semibold">
                +10 chosen · +2 others
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {mwOptions.map((stat) => {
              const isActive = masterworkStat === stat;
              return (
                <button
                  key={stat}
                  onClick={() => setMasterworkStat(isActive ? null : stat)}
                  className={[
                    'text-xs font-semibold px-2.5 py-1 rounded-md border transition-all',
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                  ].join(' ')}
                >
                  {stat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weapon Mod card ─────────────────────────────────────────────── */}
      {hasMods && (
        <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-white">Weapon Mod</h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableMods.map((mod) => {
              const isActive   = activeMod.id === mod.id;
              const isNone     = mod.id === NONE_MOD.id;
              const hasDmg     = mod.damageMultiplier > 1.0;
              const dmgLabel   = hasDmg
                ? `+${((mod.damageMultiplier - 1) * 100).toFixed(1)}%`
                : null;
              const statEntries = Object.entries(mod.statChanges)
                .filter(([, v]) => v !== undefined && v !== 0) as [string, number][];

              // Prefer Clarity description over manifest description for mods
              const clarityEntry = clarityPerks?.[mod.id];
              const clarityDesc  = clarityEntry ? clarityPlainText(clarityEntry) : null;
              const desc = clarityDesc || mod.description || null;

              // Tooltip content — null for No Mod (suppresses the portal entirely)
              const tooltipContent = isNone ? null : (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold text-white leading-tight">
                      {mod.name}
                    </span>
                    {mod.adeptOnly && (
                      <span className="text-[8px] font-black px-1 py-px rounded bg-amber-500/20 text-amber-400 leading-none">
                        ADEPT
                      </span>
                    )}
                  </div>
                  {desc && (
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {desc}
                    </p>
                  )}
                  {(statEntries.length > 0 || hasDmg) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {statEntries.map(([stat, val]) => (
                        <span
                          key={stat}
                          className={`text-[9px] font-bold px-1 py-px rounded leading-none ${
                            val > 0
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {val > 0 ? '+' : ''}{val} {stat}
                        </span>
                      ))}
                      {hasDmg && (
                        <span className="text-[9px] font-bold px-1 py-px rounded leading-none bg-orange-500/20 text-orange-300">
                          {dmgLabel} PvE dmg
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );

              return (
                <Tooltip key={mod.id} content={tooltipContent}>
                  <button
                    onClick={() => setActiveMod(isActive && !isNone ? NONE_MOD : mod)}
                    className={[
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all',
                      isNone
                        ? isActive
                          ? 'bg-white/5 text-slate-400 border-white/10'
                          : 'bg-transparent text-slate-600 border-white/5 hover:border-white/12 hover:text-slate-500'
                        : isActive
                          ? mod.adeptOnly
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                    ].join(' ')}
                  >
                    <span>{mod.name}</span>

                    {/* Inline stat delta badges — abbreviated stat name, colour-coded */}
                    {!isNone && statEntries.map(([stat, val]) => (
                      <span
                        key={stat}
                        className={`text-[8px] font-black leading-none ${
                          val > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {val > 0 ? '+' : ''}{val}{STAT_ABBREV[stat] ? ` ${STAT_ABBREV[stat]}` : ''}
                      </span>
                    ))}

                    {/* Damage multiplier badge — only for spec-style mods */}
                    {hasDmg && (
                      <span className="text-[8px] font-black text-orange-400 leading-none">
                        {dmgLabel}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
