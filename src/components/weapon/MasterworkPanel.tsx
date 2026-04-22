'use client';

import React from 'react';
import {
  useWeaponStore,
  buildWeaponModsList,
  NONE_MOD,
} from '../../store/useWeaponStore';
import { Tooltip } from '../ui/Tooltip';

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
    activeMod, setActiveMod,
  } = useWeaponStore();

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
            {isAdept && (
              <span className="text-[10px] text-amber-400 font-semibold">
                +10 chosen · +3 all others
              </span>
            )}
            {!isAdept && masterworkStat && (
              <span className="text-[10px] text-slate-500">+10 to {masterworkStat}</span>
            )}
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
                  {mod.description && (
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {mod.description}
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
                        // "No Mod" — intentionally muted; italic to signal it's the clear action
                        ? isActive
                          ? 'bg-white/5 text-slate-400 border-white/10 italic'
                          : 'bg-transparent text-slate-600 border-white/5 hover:border-white/12 hover:text-slate-500 italic'
                        : isActive
                          ? mod.adeptOnly
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                    ].join(' ')}
                  >
                    {/* "No Mod" gets a subtle × glyph to reinforce it's a clear action */}
                    {isNone && (
                      <span className="opacity-40 not-italic text-[11px] leading-none -mr-0.5">×</span>
                    )}

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
