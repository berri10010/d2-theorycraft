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
  const [collapsed, setCollapsed] = React.useState(false);

  if (!activeWeapon) return null;

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">God Roll</h2>
        </div>
        <p className="text-slate-600 text-sm text-center py-6 animate-pulse">Loading community analysis…</p>
      </div>
    );
  }

  const entry = godRollDb?.[activeWeapon.name];

  if (!entry) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">God Roll</h2>
        </div>
        <p className="text-slate-600 text-sm text-center py-6">
          No community data found for <span className="text-slate-400">{activeWeapon.name}</span>.
        </p>
      </div>
    );
  }

  const tierCfg = entry.tier ? WEAPON_TIER_CONFIG[entry.tier] : null;

  // Build a clean subtitle: only include season/rank when present, handle "Other" type
  const weaponTypeLabel = entry.weaponType === 'Other' ? 'other weapons' : `${entry.weaponType}s`;
  const subtitleParts = [
    'Community analysis',
    entry.season ? `Season ${entry.season}` : null,
    entry.rank != null ? `Rank #${entry.rank} in ${weaponTypeLabel}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between w-full text-left mb-0 group"
        aria-expanded={!collapsed}
      >
        <div className={collapsed ? '' : 'mb-0'}>
          <h2 className="text-xl font-bold text-white">God Roll</h2>
          {!collapsed && <p className="text-xs text-slate-500 mt-0.5">{subtitleParts}</p>}
        </div>
        <div className="flex items-center gap-2">
          {tierCfg && (
            <span className={`text-sm font-black px-3 py-1 rounded-lg leading-none ${tierCfg.bg} ${tierCfg.text}`}>
              {tierCfg.label}
            </span>
          )}
          {!collapsed && entry.frame && !/^\d+$/.test(entry.frame.trim()) && (
            <span className="text-xs text-slate-500">{entry.frame}</span>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${collapsed ? '-rotate-90' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.937a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {collapsed ? null : <div className="mt-4">

      {/* Roll recommendations */}
      {(() => {
        const ot = entry.originTrait;

        // Three cases for originTrait:
        // 1. Contains \n → multiple perk options (split into pills)
        // 2. Long sentence with no \n → analyst note about the origin slot
        // 3. Short single name (or "None") → single perk pill as normal
        let originPills: string[] = [];
        let originNote: string | null = null;
        if (ot && ot !== 'None') {
          if (ot.includes('\n')) {
            originPills = ot.split('\n').map(s => s.trim()).filter(Boolean);
          } else if (ot.length > 40) {
            originNote = ot;
          } else {
            originPills = [ot];
          }
        }

        // notes field is sometimes a bare number (spreadsheet artefact) — skip those.
        const validNotes = entry.notes && !/^\d+$/.test(entry.notes.trim()) ? entry.notes : null;

        // Combine origin-as-note and analyst notes into one block
        const noteLines = [originNote, validNotes].filter(Boolean) as string[];

        return (
          <>
            <div className="space-y-3 mb-4">
              <RollRow label="Barrel" options={entry.barrel} />
              <RollRow label="Mag"    options={entry.mag} />
              <RollRow label="Perk 1" options={entry.perk1} />
              <RollRow label="Perk 2" options={entry.perk2} />
              {originPills.length > 0 && <RollRow label="Origin" options={originPills} />}
            </div>

            {noteLines.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Analyst Notes</p>
                {noteLines.map((note, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed italic">{note}</p>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* Source attribution */}
      <p className="text-[10px] text-slate-700 mt-4 text-right">
        Source: Destiny 2 Endgame Analysis · @theaegisrelic
      </p>
    </div>}
    </div>
  );
};
