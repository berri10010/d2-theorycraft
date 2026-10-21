'use client';

import { SourceNote } from '../ui/SourceNote';
import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useTierListStore, DEFAULT_PVE, TIER_CYCLE } from '../../store/useTierListStore';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';

// ─── Inline tier selector ──────────────────────────────────────────────────────

function TierSelect({
  current,
  onChange,
}: {
  current: PerkTier | null;
  onChange: (t: PerkTier | null) => void;
}) {
  return (
    <div className="grid grid-cols-9 gap-1 md:flex md:items-center md:gap-0.5">
      {TIER_CYCLE.map((t) => {
        const cfg = t ? TIER_CONFIG[t] : null;
        const isActive = current === t;
        return (
          <button
            key={t ?? 'none'}
            onClick={() => onChange(t)}
            className={[
              'text-3xs font-black leading-none h-9 md:w-6 md:h-6 rounded transition-all',
              isActive
                ? cfg
                  ? cfg.badge
                  : 'bg-white/10 text-ink-3'
                : 'bg-white/5 text-ink-4 hover:text-ink-2 hover:bg-white/10',
            ].join(' ')}
            title={t ? `Set tier ${t}` : 'Remove rating'}
          >
            {t ?? '—'}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const TierListPanel: React.FC = () => {
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);
  const mode         = useWeaponStore((s) => s.mode);

  const {
    lists, pveModeList, pvpModeList,
    setActiveList, createList, deleteList, setPerkTier, resetList, getPerkTier,
  } = useTierListStore();

  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

  const activeListName = mode === 'pve' ? pveModeList : pvpModeList;
  const listNames = Object.keys(lists);

  // Perk rows: all trait + origin perks from current weapon
  const perkRows = activeWeapon
    ? activeWeapon.perkSockets
        .filter((c) => c.columnType === 'perk' || c.columnType === 'origin')
        .flatMap((col) =>
          col.perks
            .filter((p) => !p.isEnhanced)
            .map((p) => ({ colName: col.name, perkName: p.name }))
        )
        .filter((r, i, arr) => arr.findIndex((x) => x.perkName === r.perkName) === i)
    : [];

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || lists[name]) return;
    createList(name);
    setActiveList(mode, name);
    setNewName('');
    setShowNew(false);
  };

  const handleDelete = () => {
    if (activeListName === DEFAULT_PVE || listNames.length <= 1) return;
    if (!confirm(`Delete "${activeListName}"?`)) return;
    deleteList(activeListName);
  };

  return (
    <CollapsiblePanel
      defaultOpen={false}
      storageKey="tier-list-panel"
      title={
        <div>
          <div>Tier Lists</div>
          <p className="text-2xs text-ink-4 mt-0.5 font-normal">
            Click any tier badge on a perk to cycle rating
          </p>
        </div>
      }
      headerRight={
        <span className="text-2xs text-ink-4">
          {Object.keys(lists[activeListName] ?? {}).length} rated
        </span>
      }
    >
      {/* ── List selector ─────────────────────────────────────────── */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-ink-4 uppercase tracking-wider shrink-0 w-8">
            {mode.toUpperCase()}
          </span>
          <select
            value={activeListName}
            onChange={(e) => setActiveList(mode, e.target.value)}
            className="flex-1 text-xs font-semibold px-2 py-1 rounded-lg bg-white/5 text-ink-2 border border-white/10 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            {listNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* New list */}
          {showNew ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false); }}
                placeholder="List name…"
                className="text-xs px-2 py-1 rounded-md bg-black/40 border border-amber-500/50 text-white focus:outline-none w-28"
              />
              <button onClick={handleCreate} aria-label="Create list" className="text-emerald-400 text-xs font-bold px-1">✓</button>
              <button onClick={() => setShowNew(false)} aria-label="Cancel" className="text-ink-4 text-xs font-bold px-1">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="text-2xs font-semibold px-2 py-1 rounded-md bg-white/5 border border-white/10 text-ink-3 hover:text-ink hover:border-white/20 transition-colors shrink-0"
              title="New list"
            >
              + New
            </button>
          )}
        </div>

        {/* Actions for active list */}
        <div className="flex items-center gap-2">
          {activeListName === DEFAULT_PVE && (
            <button
              onClick={() => { if (confirm('Reset PvE list to defaults?')) resetList(DEFAULT_PVE); }}
              className="text-xs md:text-2xs font-semibold px-3 py-2 md:px-2 md:py-1 rounded border border-white/10 text-ink-4 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
            >
              Reset to default
            </button>
          )}
          {activeListName !== DEFAULT_PVE && listNames.length > 1 && (
            <button
              onClick={handleDelete}
              className="text-xs md:text-2xs font-semibold px-3 py-2 md:px-2 md:py-1 rounded border border-white/10 text-ink-4 hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              Delete list
            </button>
          )}
          <span className="text-2xs text-ink-4 ml-auto">
            Active for {mode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Perk rows for current weapon ──────────────────────────── */}
      {activeWeapon && perkRows.length > 0 ? (
        <div className="space-y-1">
          <p className="text-2xs text-ink-4 uppercase tracking-widest mb-2">
            {activeWeapon.baseName} perks
          </p>
          {perkRows.map(({ colName, perkName }) => {
            const current = getPerkTier(mode, perkName);
            return (
              <div key={perkName} className="flex flex-col gap-1.5 py-1 md:flex-row md:items-center md:gap-2 md:py-0">
                <span className="text-xs md:text-2xs text-ink-3 md:flex-1 truncate" title={perkName}>
                  {perkName}
                </span>
                <TierSelect
                  current={current}
                  onChange={(t) => setPerkTier(activeListName, perkName, t)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-2xs text-ink-4 text-center py-4">
          Load a weapon to rate its perks.
        </p>
      )}
      <SourceNote className="mt-3" label="Default perk tiers" ids={['aegis']} />

    </CollapsiblePanel>
  );
};
