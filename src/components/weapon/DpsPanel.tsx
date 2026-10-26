'use client';

import { SourceNote } from '../ui/SourceNote';
import { EstimateNote } from '../ui/EstimateNote';
import statsMeta from '../../data/weaponStatsMeta.json';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calcDps, DpsResult } from '../../lib/dpsCalc';
import { PVE_HEALTH_TIERS } from '../../lib/damageMath';
import { getPlDeltaMultiplier, fmtPlDelta, DIFFICULTY_OPTIONS } from '../../lib/plDelta';

// ── Stat row ──────────────────────────────────────────────────────────────────

function Row({ label, pvp, pve }: { label: string; pvp: number; pve: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-3 w-36">{label}</span>
      <div className="flex gap-4 text-right">
        <div>
          <div className="text-2xs text-ink-4 leading-none mb-0.5">PvP</div>
          <div className="font-mono font-bold text-white">{pvp.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-2xs text-ink-4 leading-none mb-0.5">PvE</div>
          <div className="font-mono font-bold text-amber-400">{pve.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2 flex flex-col items-center gap-0.5">
      <span className="text-2xs text-ink-4 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-mono font-bold text-ink">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DpsPanel() {
  const {
    activeWeapon,
    getCalculatedStats,
    getWeaponEffects,
    selectedPerks,
    masterworkStat,
    isCrafted,
    activeMod,
    armorMods,
    activeEffects,
    activeBuffs,
    catalystActive,
    enemyTier, setEnemyTier, powerDelta, setPowerDelta, difficulty, setDifficulty,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:       s.activeWeapon,
      getCalculatedStats: s.getCalculatedStats,
      getWeaponEffects:   s.getWeaponEffects,
      selectedPerks:      s.selectedPerks,
      masterworkStat:     s.masterworkStat,
      isCrafted:          s.isCrafted,
      activeMod:          s.activeMod,
      armorMods:          s.armorMods,
      activeEffects:      s.activeEffects,
      activeBuffs:        s.activeBuffs,
      catalystActive:     s.catalystActive,
      enemyTier:          s.enemyTier,
      setEnemyTier:       s.setEnemyTier,
      powerDelta:         s.powerDelta,
      setPowerDelta:      s.setPowerDelta,
      difficulty:         s.difficulty,
      setDifficulty:      s.setDifficulty,
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calcStats = useMemo(() => getCalculatedStats(), [
    activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods, activeEffects, activeBuffs, catalystActive,
  ]);

  const dps = useMemo<DpsResult | null>(() => {
    if (!activeWeapon) return null;
    const reloadStat = calcStats['Reload']   ?? activeWeapon.baseStats['Reload']   ?? 0;
    const magStat    = calcStats['Magazine'] ?? activeWeapon.baseStats['Magazine'] ?? 1;
    return calcDps(
      activeWeapon.itemSubType,
      activeWeapon.ammoType,
      activeWeapon.intrinsicTrait?.name ?? null,
      activeWeapon.itemTypeDisplayName,
      reloadStat,
      magStat,
      enemyTier,
      getWeaponEffects(),
      activeWeapon.baseName ?? activeWeapon.name,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeapon, calcStats, selectedPerks, activeEffects, activeBuffs, enemyTier]);

  if (!activeWeapon) return null;

  if (!dps) {
    return (
      <div className="bg-white/3 rounded-xl p-4 text-center text-ink-4 text-sm">
        {activeWeapon.rarity === 'Exotic' ? 'No exact timing data for this exotic yet.' : 'No timing data available for this archetype.'}
      </div>
    );
  }

  // The power-level delta scales every PvE damage number the same way; PvP is untouched.
  const plMult = getPlDeltaMultiplier(powerDelta, difficulty);
  const optimalPve   = Math.round(dps.optimalDpsPve * plMult);
  const sustainedPve = Math.round(dps.sustainedDpsPve * plMult);

  const burstLabel = dps.burstSize > 1 ? `${dps.burstSize}×` : '—';
  const reloadLabel = dps.reloadMs != null ? `${(dps.reloadMs / 1000).toFixed(2)}s` : '—';

  return (
    <div className="bg-white/3 rounded-xl p-4 space-y-4">
      {/* ── Damage per trigger pull ──────────────────────────────────────── */}
      <div>
        <div className="text-2xs font-bold text-ink-4 uppercase tracking-widest mb-2">
          Damage per Trigger Pull
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="Body"  value={dps.bodyDamage.toFixed(1)} />
          <Chip label="Crit"  value={dps.critDamage.toFixed(1)} />
          <Chip label="Burst" value={burstLabel} />
        </div>
      </div>

      {/* ── PvE target (shared with the TTK panel) ───────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-2xs text-ink-4 uppercase tracking-wide flex flex-col gap-1">
          PvE Enemy
          <select
            value={enemyTier}
            onChange={(e) => setEnemyTier(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm normal-case tracking-normal text-ink focus:outline-none focus:border-amber-500"
          >
            {Object.keys(PVE_HEALTH_TIERS).map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </select>
        </label>
        <label className="text-2xs text-ink-4 uppercase tracking-wide flex flex-col gap-1">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm normal-case tracking-normal text-ink focus:outline-none focus:border-amber-500"
          >
            {DIFFICULTY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-2xs text-ink-4 uppercase tracking-wide flex flex-col gap-1 col-span-2">
          Power Delta ({fmtPlDelta(powerDelta, difficulty)})
          <input
            type="range" min={-30} max={10} step={1}
            value={powerDelta}
            onChange={(e) => setPowerDelta(Number(e.target.value))}
            aria-label="Power delta"
            className="w-full accent-amber-500 h-1.5 rounded-full cursor-pointer mt-2.5"
          />
        </label>
      </div>

      {/* ── DPS rows ─────────────────────────────────────────────────────── */}
      <div>
        <div className="text-2xs font-bold text-ink-4 uppercase tracking-widest mb-2">
          DPS (All-Crit)
        </div>
        <div className="space-y-2">
          <Row label="Optimal DPS"   pvp={dps.optimalDpsPvp}   pve={optimalPve}   />
          <Row label="Sustained DPS" pvp={dps.sustainedDpsPvp} pve={sustainedPve} />
        </div>
      </div>

      {/* ── Magazine / reload ─────────────────────────────────────────────── */}
      <div className="border-t border-white/5 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <Chip label="RPM"    value={String(dps.rpm)} />
          <Chip label="Mag"    value={String(dps.magSize)} />
          <Chip label="Reload" value={reloadLabel} />
        </div>
      </div>

      <p className="text-2xs text-ink-4 text-center">
        PvE uses the per-archetype scalar for the enemy chosen above. Optimal = continuous fire, no reloads.
      </p>
      <EstimateNote weapon={activeWeapon} className="text-center" />
      <SourceNote className="text-center" label="Timing data" ids={['huwugo']} detail={statsMeta.sheetVersion || undefined} />
    </div>
  );
}
