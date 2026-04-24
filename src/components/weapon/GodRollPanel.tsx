'use client';

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
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

// ── Apply God Roll button ─────────────────────────

function useApplyGodRoll() {
  const { activeWeapon, selectPerk } = useWeaponStore(
    useShallow((s) => ({ activeWeapon: s.activeWeapon, selectPerk: s.selectPerk }))
  );
  const [applied, setApplied] = useState(false);

  const applyEntry = (entry: ReturnType<typeof useGodRolls>['data'] extends Record<string, infer E> | null ? E : never) => {
    if (!activeWeapon || !entry) return;

    // Build name → { columnName, perkHash } from all perk sockets
    const nameToColumn = new Map<string, { columnName: string; perkHash: string }>();
    for (const col of activeWeapon.perkSockets) {
      for (const perk of col.perks) {
        nameToColumn.set(perk.name.toLowerCase(), { columnName: col.name, perkHash: perk.hash });
      }
    }

    // Determine which perk names to apply per slot
    const perkCols = activeWeapon.perkSockets.filter((c) => c.columnType === 'perk');
    const originCols = activeWeapon.perkSockets.filter((c) => c.columnType === 'origin');

    // Build slot → recommended names mapping
    const slots: Array<{ names: string[]; colType: string }> = [];

    // Barrel (first col with columnType 'barrel')
    const barrelCol = activeWeapon.perkSockets.find((c) => c.columnType === 'barrel');
    if (barrelCol && entry.barrel.length > 0) slots.push({ names: entry.barrel, colType: 'barrel' });

    // Mag (first col with columnType 'mag')
    const magCol = activeWeapon.perkSockets.find((c) => c.columnType === 'mag');
    if (magCol && entry.mag.length > 0) slots.push({ names: entry.mag, colType: 'mag' });

    // Perk 1 & 2
    if (perkCols[0] && entry.perk1.length > 0) slots.push({ names: entry.perk1, colType: 'perk1' });
    if (perkCols[1] && entry.perk2.length > 0) slots.push({ names: entry.perk2, colType: 'perk2' });

    // Origin
    if (originCols[0] && entry.originTrait && entry.originTrait !== 'None') {
      const originNames = entry.originTrait.includes('\n')
        ? entry.originTrait.split('\n').map((s) => s.trim()).filter(Boolean)
        : entry.originTrait.length <= 40 ? [entry.originTrait] : [];
      if (originNames.length > 0) slots.push({ names: originNames, colType: 'origin' });
    }

    let applied = false;

    for (const slot of slots) {
      // Try to find the first recommended perk that actually exists on the weapon
      for (const name of slot.names) {
        const match = nameToColumn.get(name.toLowerCase());
        if (match) {
          selectPerk(match.columnName, match.perkHash);
          applied = true;
          break;
        }
      }
    }

    if (applied) {
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return { applyEntry, applied };
}

export const GodRollPanel: React.FC = () => {
  const { activeWeapon } = useWeaponStore();
  const { data: godRollDb, loading } = useGodRolls();
  const { applyEntry, applied } = useApplyGodRoll();

  if (!activeWeapon) return null;

  if (loading) {
    return (
      <CollapsiblePanel title="God Roll">
        <p className="text-slate-600 text-sm text-center py-6 animate-pulse">Loading community analysis…</p>
      </CollapsiblePanel>
    );
  }

  const entry = godRollDb?.[activeWeapon.name];

  if (!entry) return null;

  const tierCfg = entry.tier ? WEAPON_TIER_CONFIG[entry.tier] : null;

  const weaponTypeLabel = entry.weaponType === 'Other' ? 'other weapons' : `${entry.weaponType}s`;
  const subtitleParts = [
    'Community analysis',
    entry.season ? `Season ${entry.season}` : null,
    entry.rank != null ? `Rank #${entry.rank} in ${weaponTypeLabel}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <CollapsiblePanel
      title={
        <div>
          <div>God Roll</div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">{subtitleParts}</p>
        </div>
      }
      headerRight={
        <div className="flex flex-col items-end gap-1">
          {tierCfg && (
            <span className={`text-sm font-black px-3 py-1 rounded-lg leading-none ${tierCfg.bg} ${tierCfg.text}`}>
              {tierCfg.label}
            </span>
          )}
          {entry.frame && !/^\d+$/.test(entry.frame.trim()) && (
            <span className="text-xs text-slate-500">{entry.frame}</span>
          )}
        </div>
      }
    >

      {/* Roll recommendations */}
      {(() => {
        const ot = entry.originTrait;

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

        const validNotes = entry.notes && !/^\d+$/.test(entry.notes.trim()) ? entry.notes : null;
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

            {/* Apply God Roll button */}
            <button
              onClick={() => applyEntry(entry)}
              className={[
                'w-full py-2 text-xs font-semibold rounded-lg border transition-all',
                applied
                  ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400',
              ].join(' ')}
            >
              {applied ? '✓ Applied' : 'Apply God Roll'}
            </button>

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
    </CollapsiblePanel>
  );
};
