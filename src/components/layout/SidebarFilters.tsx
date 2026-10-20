'use client';

import React, { useState } from 'react';
import {
  type FilterState, type MultiFilter, type MultiKey, type ToggleKey, type CategoryId,
  CATEGORIES, COL_SUBCATS, TOGGLE_DEFS, chipMode, countMF, categoryCount,
} from '../../lib/weaponFilters';

export function ActiveChip({ label, isExclude, onRemove }: { label: string; isExclude: boolean; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className={[
        'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all leading-none',
        isExclude
          ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
          : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
      ].join(' ')}
    >
      {isExclude ? `≠ ${label}` : label}
      <span className="opacity-60 text-[9px] leading-none">×</span>
    </button>
  );
}

export function OptionsPanel({
  filterKey, options, mf, onToggle, onClear, optLabel, showSearch = true,
}: {
  filterKey: MultiKey;
  options: string[];
  mf: MultiFilter;
  onToggle: (key: MultiKey, val: string) => void;
  onClear: () => void;
  optLabel?: (v: string) => string;
  showSearch?: boolean;
}) {
  const [search, setSearch] = useState('');
  const label = (v: string) => optLabel?.(v) ?? v;
  const visible = showSearch && search
    ? options.filter(o => label(o).toLowerCase().includes(search.toLowerCase()))
    : options;
  const activeCount = mf.inc.length + mf.exc.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Search + active count */}
      {showSearch ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search options…"
              className="w-full bg-white/[0.04] border border-white/10 rounded-md pl-7 pr-2.5 py-1.5 text-xs text-ink-2 placeholder-ink-4 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          {activeCount > 0 && (
            <button onClick={onClear} className="shrink-0 text-[10px] text-ink-4 hover:text-amber-400 transition-colors whitespace-nowrap">
              Clear {activeCount}
            </button>
          )}
        </div>
      ) : activeCount > 0 ? (
        <div className="flex justify-end">
          <button onClick={onClear} className="text-[10px] text-ink-4 hover:text-amber-400 transition-colors whitespace-nowrap">
            Clear {activeCount}
          </button>
        </div>
      ) : null}

      {/* Option list */}
      <div className="max-h-48 overflow-y-auto -mx-1">
        {visible.map(opt => {
          const mode = chipMode(mf, opt);
          return (
            <button key={opt} onClick={() => onToggle(filterKey, opt)}
              className={[
                'w-full text-left flex items-center gap-2.5 px-3 py-1.5 transition-colors group',
                mode === 'inc' ? 'bg-amber-500/8' :
                mode === 'exc' ? 'bg-red-500/6' :
                'hover:bg-white/4',
              ].join(' ')}
            >
              <span className={[
                'w-4 h-4 rounded-sm border-2 flex items-center justify-center text-[9px] shrink-0 transition-all',
                mode === 'inc' ? 'bg-amber-500 border-amber-500 text-slate-950' :
                mode === 'exc' ? 'bg-red-500/20 border-red-500 text-red-400' :
                'border-white/20 group-hover:border-white/35',
              ].join(' ')}>
                {mode === 'inc' ? '✓' : mode === 'exc' ? '✕' : ''}
              </span>
              <span className={[
                'text-xs truncate leading-none',
                mode === 'inc' ? 'text-amber-200 font-medium' :
                mode === 'exc' ? 'text-red-400/70 line-through' :
                'text-ink-3 group-hover:text-ink',
              ].join(' ')} title={label(opt)}>{label(opt)}</span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="text-ink-4 text-xs px-3 py-3">No options found.</p>
        )}
      </div>
    </div>
  );
}

export function FilterPanel({
  filters, allOptions, activeCat, activeColSubcat, onSetActiveCat, onSetColSubcat, onToggle, onToggleFilter, onClearKey,
}: {
  filters: FilterState;
  allOptions: Record<MultiKey, string[]>;
  activeCat: CategoryId | null;
  activeColSubcat: MultiKey | null;
  onSetActiveCat: (id: CategoryId | null) => void;
  onSetColSubcat: (id: MultiKey | null) => void;
  onToggle: (key: MultiKey, val: string) => void;
  onToggleFilter: (key: ToggleKey) => void;
  onClearKey: (key: MultiKey) => void;
}) {
  const activeCatDef = CATEGORIES.find(c => c.id === activeCat);

  return (
    <div className="bg-surface-2 border-b border-white/10">

      {/* ── Toggles ── */}
      <div className="px-3 pt-3 pb-2.5">
        <p className="text-[9px] font-bold text-ink-4 uppercase tracking-widest mb-2">Quick Filters</p>
        <div className="grid grid-cols-2 gap-1">
          {TOGGLE_DEFS.map(({ id, label }) => {
            const on = filters[id];
            return (
              <button
                key={id}
                onClick={() => onToggleFilter(id)}
                className={[
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left',
                  on
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'bg-white/[0.03] border-white/10 text-ink-4 hover:text-ink-2 hover:border-white/15',
                ].join(' ')}
              >
                <span className={[
                  'w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center text-[8px] shrink-0 transition-all',
                  on ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-white/25',
                ].join(' ')}>
                  {on ? '✓' : ''}
                </span>
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category grid ── */}
      <div className="px-3 py-2.5">
        <p className="text-[9px] font-bold text-ink-4 uppercase tracking-widest mb-2">Filter by</p>
        <div className="grid grid-cols-2 gap-1">
          {CATEGORIES.map((cat) => {
            const count = categoryCount(filters, cat);
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSetActiveCat(isActive ? null : cat.id)}
                className={[
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-left',
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/45 text-amber-300'
                    : count > 0
                    ? 'bg-amber-500/8 border-amber-500/25 text-amber-400'
                    : 'bg-white/[0.03] border-white/10 text-ink-3 hover:text-ink hover:border-white/15',
                ].join(' ')}
              >
                <span className="text-[10px] font-semibold truncate">{cat.label}</span>
                {count > 0 && (
                  <span className="ml-1.5 shrink-0 min-w-[16px] h-[14px] bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Expanded options ── */}
      {activeCat !== null && (
        <div className="px-3 pt-2.5 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-ink-2 uppercase tracking-wider">
              {activeCatDef?.label}
            </p>
            {activeCat === 'column' && (
              <span className="text-[9px] text-ink-4">Click once to include · again to exclude</span>
            )}
          </div>

          {activeCat === 'column' ? (
            <div className="space-y-2.5">
              {/* Tab-style sub-category selector */}
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {COL_SUBCATS.map(({ id, label }, i) => {
                  const cnt = countMF(filters[id]);
                  const isSelected = activeColSubcat === id;
                  return (
                    <button
                      key={id}
                      onClick={() => onSetColSubcat(isSelected ? null : id)}
                      className={[
                        'flex-1 py-1.5 text-[9px] font-bold transition-colors relative',
                        i > 0 ? 'border-l border-white/10' : '',
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300'
                          : cnt > 0
                          ? 'bg-amber-500/8 text-amber-400 hover:bg-amber-500/12'
                          : 'text-ink-4 hover:text-ink-2 hover:bg-white/4',
                      ].join(' ')}
                    >
                      {label}
                      {cnt > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {activeColSubcat ? (
                <OptionsPanel
                  filterKey={activeColSubcat}
                  options={allOptions[activeColSubcat]}
                  mf={filters[activeColSubcat]}
                  onToggle={onToggle}
                  onClear={() => onClearKey(activeColSubcat)}
                />
              ) : (
                <p className="text-ink-4 text-xs text-center py-3">Select a column above</p>
              )}
            </div>
          ) : activeCatDef?.filterKey ? (
            <>
              <p className="text-[9px] text-ink-4 mb-2">Click once to include · again to exclude · again to clear</p>
              <OptionsPanel
                filterKey={activeCatDef.filterKey}
                options={allOptions[activeCatDef.filterKey]}
                mf={filters[activeCatDef.filterKey]}
                onToggle={onToggle}
                onClear={() => onClearKey(activeCatDef.filterKey!)}
                showSearch={!activeCatDef.noSearch}
                optLabel={
                  activeCatDef.filterKey === 'energy'     ? v => v.charAt(0).toUpperCase() + v.slice(1) :
                  activeCatDef.filterKey === 'frame'      ? v => v.replace(/ Frame$/, '') :
                  activeCatDef.filterKey === 'perkTier'   ? v => `${v}-Tier` :
                  activeCatDef.filterKey === 'weaponTier' ? v => `${v}-Tier` :
                  undefined
                }
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
