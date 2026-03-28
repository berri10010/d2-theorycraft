'use client';

import React, { useState } from 'react';
import { useCompareStore } from '../../store/useCompareStore';
import { CompareSnapshot } from '../../types/weapon';

const STAT_KEYS = ['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance'];

function SnapshotCard({
  snapshot,
  statMaxes,
}: {
  snapshot: CompareSnapshot;
  statMaxes: Record<string, number>;
}) {
  const { removeSnapshot, renameSnapshot } = useCompareStore();
  const [editing, setEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(snapshot.label);

  const handleRename = () => {
    renameSnapshot(snapshot.id, labelValue);
    setEditing(false);
  };

  return (
    <div className="min-w-[280px] bg-black/40 p-4 rounded-lg border border-white/10 relative flex flex-col">
      <button
        onClick={() => removeSnapshot(snapshot.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-white/5 text-slate-400 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-xs font-bold"
        aria-label="Remove snapshot"
      >
        ×
      </button>

      <div className="flex items-center gap-3 mb-3 pr-6">
        <div className="w-12 h-12 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
          {snapshot.weapon.icon && (
            <img src={'https://www.bungie.net' + snapshot.weapon.icon} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
              className="w-full bg-white/5 text-white text-sm font-bold px-2 py-1 rounded border border-amber-500 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-bold text-amber-500 truncate text-left w-full hover:text-amber-400 transition-colors text-sm"
              title="Click to rename"
            >
              {snapshot.label}
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
        <div className="mb-3 px-3 py-1.5 bg-white/5 rounded border border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">TTK ({snapshot.mode.toUpperCase()})</span>
          <span className="font-mono text-sm font-bold text-amber-400">{snapshot.ttk.toFixed(2)}s</span>
        </div>
      )}

      <div className="flex-1 space-y-3">
        {STAT_KEYS.map((statName) => {
          const val = snapshot.calculatedStats[statName] ?? 0;
          const isBest = snapshot && val > 0 && val === statMaxes[statName];
          return (
            <div key={statName} className="flex justify-between items-center text-sm">
              <span className="text-slate-400 w-28">{statName}</span>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className={'font-mono text-sm font-bold ' + (isBest ? 'text-green-400' : 'text-slate-200')}>
                  {val}{isBest && <span className="ml-1 text-xs text-green-500">▲</span>}
                </span>
                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={'h-full rounded-full ' + (isBest ? 'bg-green-500' : 'bg-amber-500')}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ComparisonGrid: React.FC = () => {
  const { snapshots, clearSnapshots } = useCompareStore();

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white/5 rounded-xl border border-dashed border-white/10">
        <p className="font-medium">Your comparison queue is empty.</p>
        <p className="text-sm mt-2">
          Go to the Editor and click <span className="text-amber-500">+ Compare</span> to start.
        </p>
      </div>
    );
  }

  const statMaxes: Record<string, number> = {};
  STAT_KEYS.forEach((key) => {
    statMaxes[key] = Math.max(...snapshots.map((s) => s.calculatedStats[key] ?? 0));
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">
          Comparison{' '}
          <span className="text-slate-500 text-base font-normal">
            ({snapshots.length} roll{snapshots.length !== 1 ? 's' : ''})
          </span>
        </h2>
        <button onClick={clearSnapshots} className="text-xs text-red-400 hover:text-red-300 transition-colors">
          Clear All
        </button>
      </div>
      <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3">
        {snapshots.map((snapshot) => (
          <SnapshotCard key={snapshot.id} snapshot={snapshot} statMaxes={statMaxes} />
        ))}
      </div>
    </div>
  );
};
