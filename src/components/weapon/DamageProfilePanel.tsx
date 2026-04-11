'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import {
  buildDamageProfile,
  detectArchetype,
  ARCHETYPE_LABELS,
  type SupportedArchetype,
} from '../../lib/weaponSystemAdapter';

// ── Archetype colour palette ──────────────────────────────────────────────────

const BADGE_CLASSES: Record<SupportedArchetype, string> = {
  rocket_launcher: 'bg-red-500/20    text-red-300    border-red-500/30',
  shotgun:         'bg-orange-500/20 text-orange-300 border-orange-500/30',
  sniper_rifle:    'bg-sky-500/20    text-sky-300    border-sky-500/30',
  sword:           'bg-purple-500/20 text-purple-300 border-purple-500/30',
  flamethrower:    'bg-amber-500/20  text-amber-300  border-amber-500/30',
};

const SPLASH_COLOUR: Record<SupportedArchetype, string> = {
  rocket_launcher: 'text-red-400',
  shotgun:         'text-orange-400',
  sniper_rifle:    'text-sky-400',
  sword:           'text-purple-400',
  flamethrower:    'text-amber-400',
};

const SPLASH_BAR: Record<SupportedArchetype, string> = {
  rocket_launcher: 'bg-red-400/60',
  shotgun:         'bg-orange-400/60',
  sniper_rifle:    'bg-sky-400/60',
  sword:           'bg-purple-400/60',
  flamethrower:    'bg-amber-400/60',
};

// Human-readable splash/secondary label per archetype
const SPLASH_LABEL: Record<SupportedArchetype, string> = {
  rocket_launcher: 'Blast splash',
  shotgun:         'Splash',
  sniper_rifle:    'Splash',
  sword:           'Multi-target overflow',
  flamethrower:    'Projected DoT',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DamageProfilePanel() {
  const {
    activeWeapon,
    getCalculatedStats,
    getDamageMultiplier,
    mode,
    // tracked only for memoisation — changes here must re-run the profile
    activeBuffs,
    activeMod,
    surgeStacks,
    activeEffects,
    selectedPerks,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:        s.activeWeapon,
      getCalculatedStats:  s.getCalculatedStats,
      getDamageMultiplier: s.getDamageMultiplier,
      mode:                s.mode,
      activeBuffs:         s.activeBuffs,
      activeMod:           s.activeMod,
      surgeStacks:         s.surgeStacks,
      activeEffects:       s.activeEffects,
      selectedPerks:       s.selectedPerks,
    }))
  );

  const profile = useMemo(() => {
    if (!activeWeapon) return null;
    return buildDamageProfile(
      activeWeapon,
      getCalculatedStats(),
      mode,
      getDamageMultiplier(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeapon, mode, activeBuffs, activeMod, surgeStacks, activeEffects, selectedPerks]);

  if (!activeWeapon) return null;

  // ── Unsupported archetype ──────────────────────────────────────────────────

  if (!detectArchetype(activeWeapon.itemSubType)) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 text-center">
        <p className="text-slate-500 text-sm">
          Damage profile not available for {activeWeapon.itemTypeDisplayName}.
        </p>
        <p className="text-slate-600 text-xs mt-1">
          Supported: Rocket Launcher · Shotgun · Sniper Rifle · Sword · Trace Rifle
        </p>
      </div>
    );
  }

  // ── Build failed ───────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 text-center">
        <p className="text-slate-500 text-sm">Could not build damage profile for this weapon.</p>
      </div>
    );
  }

  const { archetype, archetypeLabel, result, scenarioLabel, keyStats } = profile;

  const badgeClass   = BADGE_CLASSES[archetype];
  const splashColour = SPLASH_COLOUR[archetype];
  const splashBar    = SPLASH_BAR[archetype];
  const splashLabel  = SPLASH_LABEL[archetype];

  const totalDamage = result.direct + result.splash;
  const splashPct   = totalDamage > 0 ? (result.splash / totalDamage) * 100 : 0;
  const directPct   = 100 - splashPct;
  const hasSplash   = result.splash > 0;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Damage Profile</h2>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${badgeClass}`}>
          {archetypeLabel}
        </span>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {keyStats.map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-lg p-2.5 text-center border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 leading-none">
              {label}
            </div>
            <div className="text-sm font-bold text-white font-mono leading-tight">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Scenario description */}
      <div className="bg-white/3 rounded-lg px-3 py-2 border border-white/5">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">Scenario · </span>
        <span className="text-xs text-slate-400">{scenarioLabel}</span>
      </div>

      {/* Damage breakdown */}
      <div className="space-y-2.5">

        {/* Direct */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Direct damage</span>
          <span className="text-sm font-bold text-white font-mono">
            {result.direct.toFixed(1)}
          </span>
        </div>

        {/* Splash / DoT — only when present */}
        {hasSplash && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {splashLabel}
              <span className="ml-1.5 text-[10px] text-slate-600">
                ({splashPct.toFixed(0)}%)
              </span>
            </span>
            <span className={`text-sm font-bold font-mono ${splashColour}`}>
              {result.splash.toFixed(1)}
            </span>
          </div>
        )}

        {/* Divider + total */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-sm font-semibold text-slate-300">
            Total
            {result.affectedIds.length > 1 && (
              <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                ({result.affectedIds.length} targets)
              </span>
            )}
          </span>
          <span className={`text-sm font-bold font-mono ${hasSplash ? splashColour : 'text-white'}`}>
            {totalDamage.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Direct / Splash proportion bar */}
      {hasSplash && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Direct</span>
            <span>{splashLabel}</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
            <div
              className="bg-white/30 transition-all duration-300"
              style={{ width: `${directPct}%` }}
            />
            <div
              className={`${splashBar} transition-all duration-300`}
              style={{ width: `${splashPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Target IDs — compact list for AoE weapons */}
      {result.affectedIds.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Hit</span>
          {result.affectedIds.map((id) => (
            <span
              key={id}
              className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400"
            >
              {id}
            </span>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-slate-600 leading-relaxed border-t border-white/5 pt-3">
        Derived from archetype damage data · reflects active perk &amp; buff multipliers ·
        see <span className="text-slate-500">TTK &amp; Falloff</span> for shot timing
      </p>
    </div>
  );
}
