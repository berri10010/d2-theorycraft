'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { calcDps, DpsResult } from '../../lib/dpsCalc';

// ── Stat row ──────────────────────────────────────────────────────────────────

function Row({ label, pvp, pve }: { label: string; pvp: number; pve: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400 w-36">{label}</span>
      <div className="flex gap-4 text-right">
        <div>
          <div className="text-[9px] text-slate-600 leading-none mb-0.5">PvP</div>
          <div className="font-mono font-bold text-white">{pvp.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-600 leading-none mb-0.5">PvE</div>
          <div className="font-mono font-bold text-amber-400">{pve.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-mono font-bold text-slate-200">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DpsPanel() {
  const {
    activeWeapon,
    getCalculatedStats,
    selectedPerks,
    masterworkStat,
    isCrafted,
    activeMod,
    armorMods,
    activeEffects,
    activeBuffs,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:       s.activeWeapon,
      getCalculatedStats: s.getCalculatedStats,
      selectedPerks:      s.selectedPerks,
      masterworkStat:     s.masterworkStat,
      isCrafted:          s.isCrafted,
      activeMod:          s.activeMod,
      armorMods:          s.armorMods,
      activeEffects:      s.activeEffects,
      activeBuffs:        s.activeBuffs,
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calcStats = useMemo(() => getCalculatedStats(), [
    activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods, activeEffects, activeBuffs,
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
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeapon, calcStats]);

  if (!activeWeapon) return null;

  if (!dps) {
    return (
      <div className="bg-white/3 rounded-xl p-4 text-center text-slate-500 text-sm">
        No timing data available for this archetype.
      </div>
    );
  }

  const burstLabel = dps.burstSize > 1 ? `${dps.burstSize}×` : '—';
  const reloadLabel = dps.reloadMs != null ? `${(dps.reloadMs / 1000).toFixed(2)}s` : '—';

  return (
    <div className="bg-white/3 rounded-xl p-4 space-y-4">
      {/* ── Damage per trigger pull ──────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          Damage per Trigger Pull
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Chip label="Body"  value={dps.bodyDamage.toFixed(1)} />
          <Chip label="Crit"  value={dps.critDamage.toFixed(1)} />
          <Chip label="Burst" value={burstLabel} />
        </div>
      </div>

      {/* ── DPS rows ─────────────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          DPS (All-Crit)
        </div>
        <div className="space-y-2">
          <Row label="Optimal DPS"   pvp={dps.optimalDpsPvp}   pve={dps.optimalDpsPve}   />
          <Row label="Sustained DPS" pvp={dps.sustainedDpsPvp} pve={dps.sustainedDpsPve} />
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

      <p className="text-[9px] text-slate-600 text-center">
        PvE assumes Major/Elite combatant scalar (3×). Optimal = continuous fire, no reloads.
      </p>
    </div>
  );
}
