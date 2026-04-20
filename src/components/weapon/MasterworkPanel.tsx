'use client';

import React from 'react';
import {
  useWeaponStore,
  buildWeaponModsList,
  NONE_MOD,
} from '../../store/useWeaponStore';

export const MasterworkPanel: React.FC = () => {
  const {
    activeWeapon,
    masterworkStat, setMasterworkStat,
    activeMod, setActiveMod,
  } = useWeaponStore();

  if (!activeWeapon) return null;

  // Exotic weapons use catalysts instead of masterworks and weapon mods.
  // The manifest returns no masterwork socket and no mod socket for exotics,
  // so we hide the panel entirely rather than showing empty/incorrect data.
  if (activeWeapon.rarity === 'Exotic') return null;

  const isAdept = activeWeapon.isAdept;

  // Masterwork options come exclusively from the manifest (weapon.masterworkOptions).
  // No fallback — if the manifest returned nothing, there are no options to show.
  const mwOptions: string[] = activeWeapon.masterworkOptions ?? [];

  // Weapon mod list built from the manifest's weaponMods array (+ NONE_MOD sentinel).
  const availableMods = buildWeaponModsList(activeWeapon);

  const hasMw   = mwOptions.length > 0;
  const hasMods = availableMods.length > 1; // more than just NONE_MOD

  // Nothing to show if the manifest supplied neither masterwork nor mod options.
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Weapon Mod</h2>
            {isAdept && (
              <span className="text-[10px] text-amber-400/70">Adept mods available</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {availableMods.map((mod) => {
              const isActive = activeMod.id === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveMod(isActive && mod.id !== NONE_MOD.id ? NONE_MOD : mod)}
                  className={[
                    'text-xs font-semibold px-2.5 py-1 rounded-md border transition-all',
                    isActive && mod.id !== NONE_MOD.id
                      ? mod.adeptOnly
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                    mod.adeptOnly && !(isActive && mod.id !== NONE_MOD.id) ? 'border-amber-900/40 text-amber-600' : '',
                  ].join(' ')}
                >
                  {mod.name}
                </button>
              );
            })}
          </div>

          {activeMod.id !== NONE_MOD.id && activeMod.description && (
            <p className="text-xs text-slate-500 mt-2">{activeMod.description}</p>
          )}
        </div>
      )}
    </>
  );
};
