'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useGodRolls } from '../../lib/useGodRolls';

// ── Tier colour config ────────────────────────────
const WEAPON_TIER_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  S: { bg: 'bg-amber-400', text: 'text-slate-950', label: 'S-Tier' },
  A: { bg: 'bg-green-400', text: 'text-slate-950', label: 'A-Tier' },
  B: { bg: 'bg-blue-400',  text: 'text-slate-950', label: 'B-Tier' },
  C: { bg: 'bg-slate-500', text: 'text-white', label: 'C-Tier' },
  D: { bg: 'bg-slate-600', text: 'text-slate-300', label: 'D-Tier' },
};

// ── Small pill for a perk / roll option ──────────
function PerkPill({ name, index }: { name: string; index: number }) {
  const colors = [
    'bg-amber-900/60 border-amber-700/60 text-amber-300',
    'bg-green-900/60 border-green-700/60 text-green-300',
    'bg-blue-900/60 border-blue-700/60 text-blue-300',
    'bg-purple-900/60 border-purple-700/60 text-purple-300',
    'bg-slate-800 border-slate-700 text-slate-300',
  ];
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded border font-medium ${colors[index] ?? colors[4]}`}>
      {name}
    </span>
  );
}

// ── One roll-slot row (label + pill list) ─────────
function RollRow({ label, options }: { label: string; options: string[] }) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5">
      <span className="text-xs text-slate-500 uppercase tracking-wide w-16 shrink-0 pt-0.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o, i) => <PerkPill key={o} name={o} index={i} />)}
      </div>
    </div>
  );
}

export const GodRollPanel: React.FC = () => {
  const { activeWeapon } = useWeaponStore();
  const { data: godRollDb, loading } = useGodRolls();

  if (!activeWeapon) return null;

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold mb-4 text-white">PvE God Roll</h2>
        <p className="text-slate-600 text-sm text-center py-6 animate-pulse">Loading community analysis…</p>
      </div>
    );
  }

  const entry = godRollDb?.[activeWeapon.name];

  if (!entry) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold mb-4 text-white">PvE God Roll</h2>
        <p className="text-slate-600 text-sm text-center py-6">
          No community data found for <span className="text-slate-400">{activeWeapon.name}</span>.
        </p>
      </div>
    );
  }

  const tierCfg = entry.tier ? WEAPON_TIER_CONFIG[entry.tier] : null;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">PvE God Roll</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Community analysis · Season {entry.season ?? '?'} · Rank #{entry.rank ?? '?'} in {entry.weaponType}s
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {tierCfg && (
            <span className={`text-sm font-black px-3 py-1 rounded-lg leading-none ${tierCfg.bg} ${tierCfg.text}`}>
              {tierCfg.label}
            </span>
          )}
          {entry.frame && (
            <span className="text-xs text-slate-500">{entry.frame}</span>
          )}
        </div>
      </div>

      {/* Roll recommendations */}
      <div className="space-y-3 mb-4">
        <RollRow label="Barrel" options={entry.barrel} />
        <RollRow label="Mag"    options={entry.mag} />
        <RollRow label="Perk 1" options={entry.perk1} />
        <RollRow label="Perk 2" options={entry.perk2} />
        {entry.originTrait && entry.originTrait !== 'None' && (
          <RollRow label="Origin" options={[entry.originTrait]} />
        )}
      </div>

      {/* Analyst notes */}
      {entry.notes && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Analyst Notes</p>
          <p className="text-sm text-slate-300 leading-relaxed italic">{entry.notes}</p>
        </div>
      )}

      {/* Source attribution */}
      <p className="text-[10px] text-slate-700 mt-4 text-right">
        Source: Destiny 2 Endgame Analysis · @theaegisrelic
      </p>
    </div>
  );
};
