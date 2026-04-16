'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCompareStore } from '../../store/useCompareStore';
import { CompareSnapshot, StatCurveNode } from '../../types/weapon';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';
import { calculateTTK, PVE_HEALTH_TIERS } from '../../lib/damageMath';
import { interpolateStat, adsMultiplier } from '../../lib/math';

// ─── Stat keys shown in the comparison card ────────────────────────────────────
// Mirrors the keys in StatDisplay so the Compare view has full parity.
// ALL_BAR_STAT_KEYS is the superset; each card filters to stats present in the
// weapon's baseStats so inapplicable stats (e.g. Impact on Rockets) are hidden.
const ALL_BAR_STAT_KEYS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance'];
const NUMERIC_STAT_KEYS = ['Zoom', 'Airborne Effectiveness', 'Magazine', 'Recoil Direction'];

const PVP_GUARDIAN_HP = 230;

// ─── Delta colour scale ────────────────────────────────────────────────────────
function deltaColorClass(delta: number): string {
  if (delta === 0) return 'text-slate-300';
  if (delta > 0) {
    if (delta >= 16) return 'text-green-400 font-bold';
    if (delta >= 6)  return 'text-green-400';
    return 'text-green-300';
  }
  if (delta <= -16) return 'text-red-400 font-bold';
  if (delta <= -6)  return 'text-red-400';
  return 'text-red-300';
}

// ─── Snapshot card ─────────────────────────────────────────────────────────────
function SnapshotCard({
  snapshot,
  statMins,
  statMaxes,
  sharedBarStatKeys,
  enemyTier,
}: {
  snapshot: CompareSnapshot;
  statMins: Record<string, number>;
  statMaxes: Record<string, number>;
  sharedBarStatKeys: string[];
  enemyTier: string;
}) {
  const { removeSnapshot, renameSnapshot } = useCompareStore();
  const [editing, setEditing] = useState(false);
  const [labelValue, setLabel] = useState(snapshot.label);

  const handleRename = () => { renameSnapshot(snapshot.id, labelValue); setEditing(false); };

  // ── Recalculate TTK dynamically based on the selected enemy tier ──────────
  const multiplier = snapshot.multiplier ?? 1.0;
  const liveTtk = useMemo(() => {
    if (snapshot.mode === 'pvp') {
      return calculateTTK('pvp', snapshot.weapon, multiplier, PVP_GUARDIAN_HP, 'Minor');
    }
    return calculateTTK('pve', snapshot.weapon, multiplier, PVP_GUARDIAN_HP, enemyTier);
  }, [snapshot.weapon, snapshot.mode, multiplier, enemyTier]);

  // ── Derive falloff distances from snapshot data ───────────────────────────
  const rangeCurve = snapshot.weapon.statCurves?.['Range'];
  const rangeStat  = snapshot.calculatedStats['Range'] ?? 0;
  const zoomStat   = snapshot.calculatedStats['Zoom']  ?? 14;

   const hipFalloff = useMemo(() => {
     if (!rangeCurve || rangeCurve.length === 0) return null;
     return interpolateStat(rangeStat, rangeCurve) ?? 0;
   }, [rangeCurve, rangeStat]);

   const adsFalloff = hipFalloff !== null
     ? hipFalloff * adsMultiplier(zoomStat)
     : null;


  // ── Build selected perk list from weapon socket data ─────────────────────
  const selectedPerkList = useMemo(() => {
    const result: Array<{ name: string; icon: string; columnType: string }> = [];
    for (const column of snapshot.weapon.perkSockets) {
      const selectedHash = snapshot.selectedPerks[column.name];
      if (!selectedHash) continue;
      for (const perk of column.perks) {
        if (perk.hash === selectedHash) {
          result.push({ name: perk.name, icon: perk.icon, columnType: column.columnType });
          break;
        }
        if (perk.enhancedVersion?.hash === selectedHash) {
          result.push({
            name: perk.enhancedVersion.name,
            icon: perk.enhancedVersion.icon,
            columnType: column.columnType,
          });
          break;
        }
      }
    }
    return result;
  }, [snapshot.weapon.perkSockets, snapshot.selectedPerks]);

  return (
    <div className="min-w-[260px] bg-black/40 p-4 rounded-lg border border-white/10 relative flex flex-col gap-4">
      {/* Remove */}
      <button
        onClick={() => removeSnapshot(snapshot.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-white/5 text-slate-400 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
        aria-label="Remove"
      >×</button>

      {/* ── Weapon identity ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pr-6">
        <div className="w-12 h-12 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
          {snapshot.weapon.icon && (
            <Image
              src={BUNGIE_ROOT + snapshot.weapon.icon}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={labelValue}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 min-w-0 bg-white/5 text-white text-sm font-bold px-2 py-1 rounded border border-amber-500 focus:outline-none"
              />
              <button onClick={handleRename} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold px-1" title="Save (Enter)">✓</button>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-xs font-bold px-1" title="Cancel (Esc)">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-bold text-amber-500 truncate text-left w-full hover:text-amber-400 text-sm"
              title="Click to rename"
            >
              {snapshot.label}
              <span className="ml-1 text-[9px] text-slate-600 font-normal">✎</span>
            </button>
          )}
          <p className="text-xs text-slate-400">
            {snapshot.weapon.itemTypeDisplayName} &bull; {snapshot.weapon.rpm} RPM &bull;{' '}
            <span className="uppercase text-slate-500">{snapshot.mode}</span>
          </p>
        </div>
      </div>

      {/* ── Intrinsic trait ──────────────────────────────────────────────── */}
      {snapshot.weapon.intrinsicTrait && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded border border-white/10">
          <div className="w-6 h-6 bg-white/5 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
            <Image
              src={BUNGIE_ROOT + snapshot.weapon.intrinsicTrait.icon}
              alt=""
              width={24}
              height={24}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <span className="text-xs text-slate-300 font-medium truncate">
            {snapshot.weapon.intrinsicTrait.name}
          </span>
        </div>
      )}

      {/* ── TTK + falloff row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-2 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center">
          <span className="text-[10px] text-slate-500">TTK</span>
          <span className="font-mono text-sm font-bold text-amber-400">
            {liveTtk !== null ? `${liveTtk.ttk.toFixed(2)}s` : '—'}
          </span>
        </div>
        <div className="px-2 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center">
          <span className="text-[10px] text-slate-500">Hip</span>
          <span className="font-mono text-sm font-bold text-cyan-400">
            {hipFalloff !== null ? `${hipFalloff.toFixed(1)}m` : '—'}
          </span>
        </div>
        <div className="px-2 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center">
          <span className="text-[10px] text-slate-500">ADS</span>
          <span className="font-mono text-sm font-bold text-amber-300">
            {adsFalloff !== null ? `${adsFalloff.toFixed(1)}m` : '—'}
          </span>
        </div>
      </div>

      {/* ── Bar stats (weapon-specific: only stats present in baseStats) ─── */}
      {sharedBarStatKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stats</p>
          {sharedBarStatKeys.map((statName) => {
            const val    = snapshot.calculatedStats[statName] ?? 0;
            const base   = snapshot.weapon.baseStats?.[statName] ?? val;
            const min    = statMins[statName]  ?? val;
            const max    = statMaxes[statName] ?? val;
            const isBest = val > 0 && val === max && max !== min;
            const delta  = val - min;
            const diff   = val - base;

            return (
              <div key={statName} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 w-20 shrink-0">{statName}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={['h-full rounded-full transition-all', isBest ? 'bg-green-500' : 'bg-amber-500/60'].join(' ')}
                    style={{ width: `${Math.min(val, 100)}%` }}
                  />
                </div>
                <span className={['font-mono tabular-nums w-8 text-right', delta !== 0 ? deltaColorClass(delta) : 'text-slate-300'].join(' ')}>
                  {val}
                </span>
                {diff !== 0 && (
                  <span className={['text-[10px] tabular-nums w-7', diff > 0 ? 'text-green-400' : 'text-red-400'].join(' ')}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Numeric stats (mirrors StatDisplay NUMERIC_STAT_KEYS) ─────────── */}
      {NUMERIC_STAT_KEYS.some((k) => snapshot.calculatedStats[k] !== undefined || snapshot.weapon.baseStats?.[k] !== undefined) && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Additional</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {NUMERIC_STAT_KEYS.map((statName) => {
              const base    = snapshot.weapon.baseStats?.[statName];
              const current = snapshot.calculatedStats[statName] ?? base;
              if (current === undefined) return null;
              const diff = current - (base ?? current);
              return (
                <div key={statName} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{statName}</span>
                  <span className={['font-mono font-bold', diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white'].join(' ')}>
                    {current}
                    {diff !== 0 && <span className="text-[9px] ml-0.5">({diff > 0 ? '+' : ''}{diff})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selected perks ──────────────────────────────────────────────── */}
      {selectedPerkList.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Perks</p>
          <div className="flex flex-wrap gap-2">
            {selectedPerkList.map((perk, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/10"
                title={perk.name}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/5">
                  <Image
                    src={BUNGIE_ROOT + perk.icon}
                    alt={perk.name}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="text-[10px] text-slate-300 font-medium max-w-[80px] truncate">
                  {perk.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export const ComparisonGrid: React.FC = () => {
  const { snapshots, clearSnapshots } = useCompareStore();

  const pveTierKeys = Object.keys(PVE_HEALTH_TIERS);
  const [enemyTier, setEnemyTier] = useState(pveTierKeys[0]);

  // Whether any snapshot uses PvE mode (shows the enemy tier selector).
  const hasPveSnapshot = snapshots.some((s) => s.mode === 'pve');

  // Shared bar stat keys: intersection of ALL_BAR_STAT_KEYS with stats present
  // in every snapshot's weapon baseStats — avoids comparing inapplicable stats.
  const { statMins, statMaxes, sharedBarStatKeys } = useMemo(() => {
    const shared = ALL_BAR_STAT_KEYS.filter((k) =>
      snapshots.length === 0 || snapshots.every((s) => s.weapon.baseStats?.[k] !== undefined)
    );
    const tracked = [...shared, ...NUMERIC_STAT_KEYS];
    const mins: Record<string, number>  = {};
    const maxes: Record<string, number> = {};
    tracked.forEach((key) => {
      const vals  = snapshots.map((s) => s.calculatedStats[key] ?? 0);
      mins[key]   = vals.length > 0 ? Math.min(...vals) : 0;
      maxes[key]  = vals.length > 0 ? Math.max(...vals) : 0;
    });
    return { statMins: mins, statMaxes: maxes, sharedBarStatKeys: shared };
  }, [snapshots]);

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white/5 rounded-xl border border-dashed border-white/10">
        <p className="font-medium">Comparison queue is empty.</p>
        <p className="text-sm mt-2">
          Click <span className="text-amber-500">+ Compare</span> in the Editor to add a snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-white">
          Comparison
          <span className="text-slate-500 text-base font-normal ml-2">
            ({snapshots.length} roll{snapshots.length !== 1 ? 's' : ''})
          </span>
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* PvE enemy tier selector — only when at least one PvE snapshot exists */}
          {hasPveSnapshot && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 shrink-0">TTK vs</span>
              <select
                value={enemyTier}
                onChange={(e) => setEnemyTier(e.target.value)}
                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {pveTierKeys.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span title="Colors show each stat's delta above the lowest value across all snapshots">
              Δ from min: <span className="text-green-300">■</span> +1–5 <span className="text-green-400">■</span> +6–15 <span className="text-green-400 font-bold">■</span> +16+ <span className="text-red-400">■</span> lower
            </span>
            <button onClick={clearSnapshots} className="text-red-400 hover:text-red-300 transition-colors text-xs">
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {snapshots.map((snapshot) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            statMins={statMins}
            statMaxes={statMaxes}
            sharedBarStatKeys={sharedBarStatKeys}
            enemyTier={enemyTier}
          />
        ))}
      </div>
    </div>
  );
};
