'use client';

import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import ammoData from '../../data/ammoData.json';

interface AmmoEntry {
  ammoType: string | null;
  magSize: number | null;
  magStat: number | null;
  baseReserves: number | null;
  res1x: number | null;
  res2x: number | null;
  res3x: number | null;
  frame: string | null;
  family: string | null;
  rpm: number | null;
}

const DB = ammoData as Record<string, AmmoEntry>;

// ── Ammo type styling ─────────────────────────────────────────────────
const AMMO_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Primary: { bg: 'bg-slate-100/10',   text: 'text-slate-200',  dot: 'bg-slate-300'  },
  Special: { bg: 'bg-green-500/10',   text: 'text-green-300',  dot: 'bg-green-400'  },
  Heavy:   { bg: 'bg-purple-500/10',  text: 'text-purple-300', dot: 'bg-purple-400' },
};

// ── Reserve bar segment ───────────────────────────────────────────────
function ReserveBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-300 w-8 text-right shrink-0">{value}</span>
    </div>
  );
}

export const AmmoPanel: React.FC = () => {
  const { activeWeapon } = useWeaponStore();
  const [showMods, setShowMods] = useState(false);

  if (!activeWeapon) return null;

  const entry = DB[activeWeapon.name];
  if (!entry) return null;

  const ammoStyle = AMMO_STYLE[entry.ammoType ?? ''] ?? AMMO_STYLE.Primary;
  const isPrimary = entry.ammoType === 'Primary';
  const hasResMods = !isPrimary && (entry.res1x != null || entry.res2x != null || entry.res3x != null);

  // For the reserve bar we need a sensible max
  const maxReserves = Math.max(
    entry.baseReserves ?? 0,
    entry.res1x ?? 0,
    entry.res2x ?? 0,
    entry.res3x ?? 0,
    1,
  );

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Ammo</h2>
        {entry.ammoType && (
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-white/10 ${ammoStyle.bg} ${ammoStyle.text}`}>
            <span className={`w-2 h-2 rounded-full ${ammoStyle.dot}`} />
            {entry.ammoType}
          </span>
        )}
      </div>

      {/* Top stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Magazine */}
        <div className="bg-black/40 rounded-lg p-3 border border-white/10 text-center">
          <div className="text-xs text-slate-500 mb-1">Magazine</div>
          <div className="text-2xl font-mono font-bold text-white">{entry.magSize ?? '—'}</div>
          {entry.magStat != null && (
            <div className="text-[10px] text-slate-600 mt-0.5">stat {entry.magStat}</div>
          )}
        </div>

        {/* Base Reserves */}
        <div className="bg-black/40 rounded-lg p-3 border border-white/10 text-center">
          <div className="text-xs text-slate-500 mb-1">Reserves</div>
          <div className="text-2xl font-mono font-bold text-white">{isPrimary ? '∞' : (entry.baseReserves ?? '—')}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">{isPrimary ? 'infinite' : 'base'}</div>
        </div>

        {/* Total (mag + reserves) */}
        <div className="bg-black/40 rounded-lg p-3 border border-white/10 text-center">
          <div className="text-xs text-slate-500 mb-1">Total</div>
          <div className="text-2xl font-mono font-bold text-white">
            {isPrimary ? '∞' : (entry.magSize != null && entry.baseReserves != null
              ? entry.magSize + entry.baseReserves
              : '—')}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">mag + reserves</div>
        </div>
      </div>

      {/* Reserve-mod tiers */}
      {hasResMods && (
        <div>
          <button
            onClick={() => setShowMods((s) => !s)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${showMods ? 'rotate-90' : ''}`}>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Reserve mods
          </button>

          {showMods && (
            <div className="space-y-2 mt-1">
              <ReserveBar label="Base" value={entry.baseReserves} max={maxReserves} color="bg-slate-500" />
              <ReserveBar label="1×"   value={entry.res1x}        max={maxReserves} color="bg-green-500" />
              <ReserveBar label="2×"   value={entry.res2x}        max={maxReserves} color="bg-green-400" />
              <ReserveBar label="3×"   value={entry.res3x}        max={maxReserves} color="bg-green-300" />
            </div>
          )}
        </div>
      )}

      {/* Source note */}
      <p className="text-[10px] text-slate-700 mt-3 text-right">
        Source: Weapon Reserves &amp; Mag Database · MossyMax
      </p>
    </div>
  );
};
