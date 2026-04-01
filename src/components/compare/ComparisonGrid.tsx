'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useCompareStore } from '../../store/useCompareStore';
import { CompareSnapshot } from '../../types/weapon';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';
const STAT_KEYS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance'];

// ─── Delta color scale ─────────────────────────────────────────────────────────
// Positive: green scale; Negative: red scale. No raw "+N" numbers shown.

function deltaColorClass(delta: number): string {
  if (delta === 0) return 'text-slate-300';
  if (delta > 0) {
    if (delta >= 16) return 'text-green-400 font-bold';
    if (delta >= 6)  return 'text-green-400';
    return 'text-green-300';
  }
  // negative
  if (delta <= -16) return 'text-red-400 font-bold';
  if (delta <= -6)  return 'text-red-400';
  return 'text-red-300';
}

// ─── Snapshot card ─────────────────────────────────────────────────────────────

function SnapshotCard({
  snapshot,
  statMins,
  statMaxes,
}: {
  snapshot: CompareSnapshot;
  statMins: Record<string, number>;
  statMaxes: Record<string, number>;
}) {
  const { removeSnapshot, renameSnapshot } = useCompareStore();
  const [editing, setEditing]   = useState(false);
  const [labelValue, setLabel]  = useState(snapshot.label);

  const handleRename = () => { renameSnapshot(snapshot.id, labelValue); setEditing(false); };

  return (
    <div className="min-w-[240px] bg-black/40 p-4 rounded-lg border border-white/10 relative flex flex-col gap-3">
      {/* Remove */}
      <button
        onClick={() => removeSnapshot(snapshot.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-white/5 text-slate-400 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
        aria-label="Remove"
      >×</button>

      {/* Icon + label */}
      <div className="flex items-center gap-3 pr-6">
        <div className="w-12 h-12 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
          {snapshot.weapon.icon && (
            <Image src={BUNGIE_ROOT + snapshot.weapon.icon} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
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

      {/* TTK badge */}
      {snapshot.ttk !== null && (
        <div className="px-3 py-1.5 bg-white/5 rounded border border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">TTK ({snapshot.mode.toUpperCase()})</span>
          <span className="font-mono text-sm font-bold text-amber-400">{snapshot.ttk.toFixed(2)}s</span>
        </div>
      )}

      {/* Stats — values are color-coded by delta from the minimum across snapshots */}
      <div className="space-y-2">
        {STAT_KEYS.map((statName) => {
          const val  = snapshot.calculatedStats[statName] ?? 0;
          const min  = statMins[statName]  ?? val;
          const max  = statMaxes[statName] ?? val;
          const isBest = val > 0 && val === max && max !== min;
          const delta  = val - min; // 0 when this IS the min, positive otherwise

          return (
            <div key={statName} className="flex justify-between items-center text-sm gap-2">
              <span className="text-slate-500 text-xs w-24 shrink-0">{statName}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Bar */}
                <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={[
                      'h-full rounded-full transition-all',
                      isBest ? 'bg-green-500' : 'bg-amber-500/60',
                    ].join(' ')}
                    style={{ width: `${val}%` }}
                  />
                </div>
                {/* Color-scaled value — no parenthetical delta */}
                <span className={[
                  'font-mono text-sm tabular-nums w-8 text-right',
                  delta !== 0 ? deltaColorClass(delta) : 'text-slate-300',
                ].join(' ')}>
                  {val}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export const ComparisonGrid: React.FC = () => {
  const { snapshots, clearSnapshots } = useCompareStore();

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

  // Min and max per stat across all snapshots — used for delta colouring.
  // Memoized so it only recomputes when the snapshot list changes.
  const { statMins, statMaxes } = useMemo(() => {
    const mins: Record<string, number> = {};
    const maxes: Record<string, number> = {};
    STAT_KEYS.forEach((key) => {
      const vals = snapshots.map((s) => s.calculatedStats[key] ?? 0);
      mins[key]  = Math.min(...vals);
      maxes[key] = Math.max(...vals);
    });
    return { statMins: mins, statMaxes: maxes };
  }, [snapshots]);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-white">
          Comparison
          <span className="text-slate-500 text-base font-normal ml-2">
            ({snapshots.length} roll{snapshots.length !== 1 ? 's' : ''})
          </span>
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span title="Colors show each stat's delta above the lowest value across all snapshots">
            Δ from min: <span className="text-green-300">■</span> +1–5 <span className="text-green-400">■</span> +6–15 <span className="text-green-400 font-bold">■</span> +16+ <span className="text-red-400">■</span> lower
          </span>
          <button onClick={clearSnapshots} className="text-red-400 hover:text-red-300 transition-colors text-xs">
            Clear all
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3">
        {snapshots.map((snapshot) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            statMins={statMins}
            statMaxes={statMaxes}
          />
        ))}
      </div>
    </div>
  );
};
