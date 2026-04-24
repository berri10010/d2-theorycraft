'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon, WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-200', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};
const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const AMMO_COLORS: Record<number, string> = { 1: 'text-slate-400', 2: 'text-green-400', 3: 'text-purple-400' };
const SLOT_LABELS: Record<number, string> = { 1: 'Kinetic', 2: 'Energy', 3: 'Power' };

type SortMode = 'alpha' | 'season';
type SortDir  = 'asc'   | 'desc';
const DEFAULT_DIR: Record<SortMode, SortDir> = { alpha: 'asc', season: 'asc' };

// ─── Filter types ─────────────────────────────────────────────────────────────

interface MultiFilter { inc: string[]; exc: string[] }

interface FilterState {
  weaponType: MultiFilter;
  frame:      MultiFilter;
  trait:      MultiFilter;   // perks in 'perk' columnType columns (3 & 4)
  energy:     MultiFilter;
  ammo:       MultiFilter;
  slot:       MultiFilter;   // Kinetic / Energy / Power (derived from ammoType)
  rarity:     MultiFilter;
  perk:       MultiFilter;   // any perk in any column
  col1:       MultiFilter;
  col2:       MultiFilter;
  col3:       MultiFilter;
  col4:       MultiFilter;
  col5:       MultiFilter;
  source:     MultiFilter;
  season:     MultiFilter;
  foundry:    MultiFilter;
  featured:      boolean;
  craftableOnly: boolean;
  adeptOnly:     boolean;
  sunsetOnly:    boolean;
}

type MultiKey = Exclude<keyof FilterState, 'featured' | 'craftableOnly' | 'adeptOnly' | 'sunsetOnly'>;
type ToggleKey = 'featured' | 'craftableOnly' | 'adeptOnly' | 'sunsetOnly';

const emptyMF = (): MultiFilter => ({ inc: [], exc: [] });

const DEFAULT_FILTERS: FilterState = {
  weaponType: emptyMF(), frame: emptyMF(), trait: emptyMF(),
  energy: emptyMF(), ammo: emptyMF(), slot: emptyMF(), rarity: emptyMF(),
  perk: emptyMF(), col1: emptyMF(), col2: emptyMF(), col3: emptyMF(),
  col4: emptyMF(), col5: emptyMF(), source: emptyMF(), season: emptyMF(),
  foundry: emptyMF(),
  featured: false, craftableOnly: false, adeptOnly: false, sunsetOnly: false,
};

// ─── Category / toggle config ─────────────────────────────────────────────────

type CategoryId = MultiKey | 'column';

interface CategoryDef {
  id: CategoryId;
  label: string;
  filterKey?: MultiKey;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'weaponType', label: 'Weapon Type', filterKey: 'weaponType' },
  { id: 'frame',      label: 'Frame',       filterKey: 'frame' },
  { id: 'trait',      label: 'Trait',       filterKey: 'trait' },
  { id: 'energy',     label: 'Energy',      filterKey: 'energy' },
  { id: 'ammo',       label: 'Ammo',        filterKey: 'ammo' },
  { id: 'slot',       label: 'Slot',        filterKey: 'slot' },
  { id: 'rarity',     label: 'Rarity',      filterKey: 'rarity' },
  { id: 'perk',       label: 'Perk',        filterKey: 'perk' },
  { id: 'column',     label: 'Column 1–5' },
  { id: 'source',     label: 'Source',      filterKey: 'source' },
  { id: 'season',     label: 'Season',      filterKey: 'season' },
  { id: 'foundry',    label: 'Foundry',     filterKey: 'foundry' },
];

const COL_SUBCATS: { id: MultiKey; label: string }[] = [
  { id: 'col1', label: 'Barrel' },
  { id: 'col2', label: 'Magazine' },
  { id: 'col3', label: 'Perk 1' },
  { id: 'col4', label: 'Perk 2' },
  { id: 'col5', label: 'Origin' },
];

const TOGGLE_DEFS: { id: ToggleKey; label: string }[] = [
  { id: 'featured',      label: 'Featured' },
  { id: 'craftableOnly', label: 'Craftable' },
  { id: 'adeptOnly',     label: 'Adept' },
  { id: 'sunsetOnly',    label: 'Sunset' },
];

// ─── Filter logic helpers ─────────────────────────────────────────────────────

function cycleFilter(f: FilterState, key: MultiKey, val: string): FilterState {
  const { inc, exc } = f[key];
  if (inc.includes(val)) return { ...f, [key]: { inc: inc.filter(v => v !== val), exc: [...exc, val] } };
  if (exc.includes(val)) return { ...f, [key]: { inc, exc: exc.filter(v => v !== val) } };
  return { ...f, [key]: { inc: [...inc, val], exc } };
}

function matchesMF(mf: MultiFilter, val: string): boolean {
  if (mf.exc.includes(val)) return false;
  if (mf.inc.length > 0 && !mf.inc.includes(val)) return false;
  return true;
}

function matchesMFAny(mf: MultiFilter, vals: string[]): boolean {
  if (mf.inc.length === 0 && mf.exc.length === 0) return true;
  if (mf.exc.length > 0 && vals.some(v => mf.exc.includes(v))) return false;
  if (mf.inc.length > 0 && !vals.some(v => mf.inc.includes(v))) return false;
  return true;
}

function chipMode(mf: MultiFilter, val: string): 'none' | 'inc' | 'exc' {
  if (mf.inc.includes(val)) return 'inc';
  if (mf.exc.includes(val)) return 'exc';
  return 'none';
}

function countMF(mf: MultiFilter) { return mf.inc.length + mf.exc.length; }

function colCount(f: FilterState) {
  return countMF(f.col1) + countMF(f.col2) + countMF(f.col3) + countMF(f.col4) + countMF(f.col5);
}

function categoryCount(f: FilterState, cat: CategoryDef): number {
  if (cat.id === 'column') return colCount(f);
  return cat.filterKey ? countMF(f[cat.filterKey]) : 0;
}

function totalFilterCount(f: FilterState): number {
  return (
    countMF(f.weaponType) + countMF(f.frame) + countMF(f.trait) +
    countMF(f.energy) + countMF(f.ammo) + countMF(f.slot) + countMF(f.rarity) +
    countMF(f.perk) + colCount(f) + countMF(f.source) + countMF(f.season) + countMF(f.foundry) +
    (f.featured ? 1 : 0) + (f.craftableOnly ? 1 : 0) + (f.adeptOnly ? 1 : 0) + (f.sunsetOnly ? 1 : 0)
  );
}

// ─── Season / event helpers ───────────────────────────────────────────────────

const UNLABELLED_SEASON_NAMES: Record<number, string> = { 1: 'The Red War' };

const EVENT_WATERMARKS: Record<string, string> = {
  '50c3ebe414c6946429934d79504922fa': 'Dawning',
  '83fbcacd223402c09af4b7ab067f8cce': 'Dawning',
  '53dc0b02306726ff1517af33ac908cef': 'Festival of the Lost',
  '9c091ec0e22c01dacc25efb63b46eb9b': 'Solstice',
  'fe8bcc20fbfaf4cac69dfb640bb0b84e': 'Vow of the Disciple',
};

function eventLabelFor(iconWatermark: string | null): string | null {
  if (!iconWatermark) return null;
  const hash = (iconWatermark.split('/').pop() ?? '').replace('.png', '');
  return EVENT_WATERMARKS[hash] ?? null;
}

function weaponSeasonLabel(w: Weapon): string | null {
  if (w.seasonName) return w.seasonName;
  const ev = eventLabelFor(w.iconWatermark);
  if (ev) return ev;
  if (w.seasonNumber !== null) return UNLABELLED_SEASON_NAMES[w.seasonNumber] ?? null;
  return null;
}

function bestSeasonNumber(g: WeaponGroup): number {
  return Math.max(...g.variants.map(v => v.seasonNumber ?? -1));
}

function bestSeasonName(g: WeaponGroup): string | null {
  return g.variants.map(v => weaponSeasonLabel(v)).find(Boolean) ?? null;
}

// ─── Perk value extraction ────────────────────────────────────────────────────

function getPerkValues(w: Weapon) {
  const all: string[] = [];
  const traits: string[] = [];
  const cols: string[][] = [];
  w.perkSockets.forEach((col, i) => {
    const names = col.perks.map(p => p.name).filter(Boolean);
    cols[i] = names;
    all.push(...names);
    if (col.columnType === 'perk') traits.push(...names);
  });
  return { all, traits, cols };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveChip({ label, isExclude, onRemove }: { label: string; isExclude: boolean; onRemove: () => void }) {
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

function OptionsPanel({
  filterKey, options, mf, onToggle, onClear, optLabel,
}: {
  filterKey: MultiKey;
  options: string[];
  mf: MultiFilter;
  onToggle: (key: MultiKey, val: string) => void;
  onClear: () => void;
  optLabel?: (v: string) => string;
}) {
  const [search, setSearch] = useState('');
  const label = (v: string) => optLabel?.(v) ?? v;
  const visible = search
    ? options.filter(o => label(o).toLowerCase().includes(search.toLowerCase()))
    : options;
  const activeCount = mf.inc.length + mf.exc.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Search + active count */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search options…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-md pl-7 pr-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
        </div>
        {activeCount > 0 && (
          <button onClick={onClear} className="shrink-0 text-[10px] text-slate-500 hover:text-amber-400 transition-colors whitespace-nowrap">
            Clear {activeCount}
          </button>
        )}
      </div>

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
                'text-slate-400 group-hover:text-slate-200',
              ].join(' ')} title={label(opt)}>{label(opt)}</span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="text-slate-600 text-xs px-3 py-3">No options found.</p>
        )}
      </div>
    </div>
  );
}

function FilterPanel({
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
    <div className="bg-[#0c0c0c] border-b border-white/10 overflow-hidden">

      {/* ── Toggles ── */}
      <div className="px-3 pt-3 pb-2.5">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Quick Filters</p>
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
                    : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/15',
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
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Filter by</p>
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
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/15',
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
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {activeCatDef?.label}
            </p>
            {activeCat === 'column' && (
              <span className="text-[9px] text-slate-600">Click once to include · again to exclude</span>
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
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/4',
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
                <p className="text-slate-600 text-xs text-center py-3">Select a column above</p>
              )}
            </div>
          ) : activeCatDef?.filterKey ? (
            <>
              <p className="text-[9px] text-slate-600 mb-2">Click once to include · again to exclude · again to clear</p>
              <OptionsPanel
                filterKey={activeCatDef.filterKey}
                options={allOptions[activeCatDef.filterKey]}
                mf={filters[activeCatDef.filterKey]}
                onToggle={onToggle}
                onClear={() => onClearKey(activeCatDef.filterKey!)}
                optLabel={
                  activeCatDef.filterKey === 'energy' ? v => v.charAt(0).toUpperCase() + v.slice(1) :
                  activeCatDef.filterKey === 'frame'  ? v => v.replace(/ Frame$/, '') :
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

// ─── Recent searches ──────────────────────────────────────────────────────────

const LS_RECENT_KEY = 'd2tc_recent_searches';
const MAX_RECENT    = 8;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveRecentSearches(searches: string[]) {
  try { localStorage.setItem(LS_RECENT_KEY, JSON.stringify(searches)); } catch { /* ignore */ }
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error } = useWeaponDb();

  const [query,         setQuery]         = useState('');
  const [sortMode,      setSortMode]      = useState<SortMode>('alpha');
  const [sortDir,       setSortDir]       = useState<SortDir>('asc');
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [filters,       setFilters]       = useState<FilterState>(DEFAULT_FILTERS);
  const [activeCat,     setActiveCat]     = useState<CategoryId | null>(null);
  const [colSubcat,     setColSubcat]     = useState<MultiKey | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => { setRecentSearches(loadRecentSearches()); }, []);

  const pushRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, MAX_RECENT);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== term);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const headerRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => { if (query) setQuery(''); if (filterOpen) setFilterOpen(false); },
  });

  const handleLoadWeapon = useCallback((weapon: Parameters<typeof loadWeapon>[0], variants?: Parameters<typeof loadWeapon>[1]) => {
    if (query.trim()) pushRecentSearch(query);
    loadWeapon(weapon, variants);
  }, [loadWeapon, query, pushRecentSearch]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
        setActiveCat(null);
        setColSubcat(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // Build option lists from the full weapons array
  const allOptions = useMemo((): Record<MultiKey, string[]> => {
    const weaponTypeSet = new Set<string>();
    const frameSet      = new Set<string>();
    const traitSet      = new Set<string>();
    const perkSet       = new Set<string>();
    const col1Set       = new Set<string>();
    const col2Set       = new Set<string>();
    const col3Set       = new Set<string>();
    const col4Set       = new Set<string>();
    const col5Set       = new Set<string>();
    const sourceSet     = new Set<string>();
    const seasonSet     = new Set<string>();
    const foundrySet    = new Set<string>();

    for (const w of weapons) {
      weaponTypeSet.add(w.itemTypeDisplayName);
      if (w.rarity !== 'Exotic' && w.intrinsicTrait?.name) frameSet.add(w.intrinsicTrait.name);
      if (w.foundry) foundrySet.add(w.foundry);
      if (w.source) sourceSet.add(w.source);
      const sl = weaponSeasonLabel(w);
      if (sl) seasonSet.add(sl);

      w.perkSockets.forEach((col, i) => {
        const names = col.perks.map(p => p.name).filter(Boolean);
        if (i === 0) names.forEach(n => col1Set.add(n));
        else if (i === 1) names.forEach(n => col2Set.add(n));
        else if (i === 2) names.forEach(n => col3Set.add(n));
        else if (i === 3) names.forEach(n => col4Set.add(n));
        else if (i === 4) names.forEach(n => col5Set.add(n));
        names.forEach(n => perkSet.add(n));
        if (col.columnType === 'perk') names.forEach(n => traitSet.add(n));
      });
    }

    const sorted = (s: Set<string>) => Array.from(s).sort();
    return {
      weaponType: sorted(weaponTypeSet),
      frame:  sorted(frameSet),
      trait:  sorted(traitSet),
      energy: ['kinetic', 'solar', 'arc', 'void', 'stasis', 'strand'],
      ammo:   ['Primary', 'Special', 'Heavy'],
      slot:   ['Kinetic', 'Energy', 'Power'],
      rarity: ['Exotic', 'Legendary', 'Rare', 'Uncommon', 'Common'],
      perk:   sorted(perkSet),
      col1:   sorted(col1Set),
      col2:   sorted(col2Set),
      col3:   sorted(col3Set),
      col4:   sorted(col4Set),
      col5:   sorted(col5Set),
      source:  sorted(sourceSet),
      season:  sorted(seasonSet),
      foundry: sorted(foundrySet),
    };
  }, [weapons]);

  const handleToggleFilter = (key: MultiKey, val: string) =>
    setFilters(f => cycleFilter(f, key, val));

  const handleToggleBool = useCallback((key: ToggleKey) =>
    setFilters(f => ({ ...f, [key]: !f[key] })), []);

  const handleSortClick = (m: SortMode) => {
    if (m === sortMode) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortMode(m); setSortDir(DEFAULT_DIR[m]); }
  };

  const activeFilterCount = useMemo(() => totalFilterCount(filters), [filters]);

  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const makeRankFn = useCallback((q: string) => (name: string): number => {
    if (!q) return 0;
    if (name.startsWith(q)) return 0;
    if (name.split(/\s+/).some(w => w.startsWith(q))) return 1;
    if (name.includes(q)) return 2;
    return 999;
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase().trim();
    const nameRank = makeRankFn(q);

    const ranked = groups.map(g => ({
      g,
      rank: q ? Math.min(...g.variants.map(v => nameRank(v.name.toLowerCase()))) : 0,
    })).filter(({ g, rank }) => {
      if (rank === 999) return false;
      const d = g.default;
      const sl = bestSeasonName(g) ?? '';

      if (!matchesMF(filters.energy,     d.damageType))                    return false;
      if (!matchesMF(filters.ammo,       AMMO_LABELS[d.ammoType] ?? ''))   return false;
      if (!matchesMF(filters.slot,       SLOT_LABELS[d.ammoType] ?? ''))   return false;
      if (!matchesMF(filters.rarity,     d.rarity ?? ''))                  return false;
      if (!matchesMF(filters.weaponType, d.itemTypeDisplayName))           return false;
      if (!matchesMF(filters.source,     d.source ?? ''))                  return false;
      if (!matchesMF(filters.season,     sl))                               return false;
      if (!matchesMF(filters.foundry,    d.foundry ?? ''))                 return false;

      const frameName = d.rarity === 'Exotic' ? '' : (d.intrinsicTrait?.name ?? '');
      if (!matchesMF(filters.frame, frameName)) return false;

      const perks = getPerkValues(d);
      if (!matchesMFAny(filters.perk,  perks.all))          return false;
      if (!matchesMFAny(filters.trait, perks.traits))        return false;
      if (!matchesMFAny(filters.col1,  perks.cols[0] ?? [])) return false;
      if (!matchesMFAny(filters.col2,  perks.cols[1] ?? [])) return false;
      if (!matchesMFAny(filters.col3,  perks.cols[2] ?? [])) return false;
      if (!matchesMFAny(filters.col4,  perks.cols[3] ?? [])) return false;
      if (!matchesMFAny(filters.col5,  perks.cols[4] ?? [])) return false;

      if (filters.adeptOnly     && !g.variants.some(v => v.isAdept))           return false;
      if (filters.craftableOnly && !g.variants.some(v => v.hasCraftedPattern))  return false;
      if (filters.featured      && !(d.rarity === 'Exotic' || (d.seasonNumber !== null && d.seasonNumber >= 27))) return false;
      if (filters.sunsetOnly    && (d.rarity === 'Exotic' || !(d.seasonNumber !== null && d.seasonNumber <= 12))) return false;

      return true;
    });

    ranked.sort((a, b) => {
      if (q && a.rank !== b.rank) return a.rank - b.rank;
      let diff: number;
      if (sortMode === 'season') {
        const sa = bestSeasonNumber(a.g), sb = bestSeasonNumber(b.g);
        diff = sa !== sb ? sa - sb : a.g.baseName.localeCompare(b.g.baseName);
      } else {
        diff = a.g.baseName.localeCompare(b.g.baseName);
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return ranked.map(({ g }) => g);
  }, [groups, query, filters, sortMode, sortDir, makeRankFn]);

  // Active dismissible chips
  const mkChips = (key: MultiKey, labelFn: (v: string) => string) => [
    ...filters[key].inc.map(v => ({
      label: labelFn(v), isExclude: false,
      clear: () => setFilters(f => ({ ...f, [key]: { ...f[key], inc: f[key].inc.filter(x => x !== v) } })),
    })),
    ...filters[key].exc.map(v => ({
      label: labelFn(v), isExclude: true,
      clear: () => setFilters(f => ({ ...f, [key]: { ...f[key], exc: f[key].exc.filter(x => x !== v) } })),
    })),
  ];

  const activeChips = [
    ...mkChips('energy',     v => v.charAt(0).toUpperCase() + v.slice(1)),
    ...mkChips('ammo',       v => v),
    ...mkChips('slot',       v => v),
    ...mkChips('rarity',     v => v),
    ...mkChips('weaponType', v => v),
    ...mkChips('frame',      v => v.replace(/ Frame$/, '')),
    ...mkChips('trait',      v => v),
    ...mkChips('perk',       v => v),
    ...mkChips('col1',       v => `Barrel: ${v}`),
    ...mkChips('col2',       v => `Mag: ${v}`),
    ...mkChips('col3',       v => `P1: ${v}`),
    ...mkChips('col4',       v => `P2: ${v}`),
    ...mkChips('col5',       v => `Origin: ${v}`),
    ...mkChips('source',     v => v.length > 30 ? v.slice(0, 28) + '…' : v),
    ...mkChips('season',     v => v),
    ...mkChips('foundry',    v => v),
    ...(filters.featured      ? [{ label: 'Featured',  isExclude: false, clear: () => handleToggleBool('featured') }]      : []),
    ...(filters.craftableOnly ? [{ label: 'Craftable', isExclude: false, clear: () => handleToggleBool('craftableOnly') }] : []),
    ...(filters.adeptOnly     ? [{ label: 'Adept',     isExclude: false, clear: () => handleToggleBool('adeptOnly') }]     : []),
    ...(filters.sunsetOnly    ? [{ label: 'Sunset',    isExclude: false, clear: () => handleToggleBool('sunsetOnly') }]    : []),
  ];

  const anyFilter = !!(query || activeFilterCount);
  const dirArrow = (m: SortMode) => sortMode === m ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <nav aria-label="Weapon database" className="bg-black h-full flex flex-col">

      {/* ── Header + filter panel (shared click-outside boundary) ───── */}
      <div ref={headerRef}>

        {/* Header controls */}
        <div className="p-3 border-b border-white/10 space-y-2.5">

          <h2 className="font-bold text-base text-white">Database</h2>

          {/* Search + filter button */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                type="search" placeholder="Search weapons…" value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />

              {/* Recent searches dropdown */}
              {searchFocused && !query && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/15 rounded-lg shadow-xl z-50 overflow-hidden">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 pt-2.5 pb-1">Recent</p>
                  {recentSearches.map(term => (
                    <div
                      key={term}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/6 group"
                    >
                      <svg className="w-3 h-3 text-slate-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <button
                        onMouseDown={e => { e.preventDefault(); setQuery(term); }}
                        className="flex-1 text-left text-xs text-slate-400 group-hover:text-slate-200 truncate transition-colors"
                      >
                        {term}
                      </button>
                      <button
                        onMouseDown={e => { e.preventDefault(); removeRecentSearch(term); }}
                        className="shrink-0 text-slate-700 hover:text-slate-400 transition-colors text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setFilterOpen(v => !v)} title="Filters" aria-expanded={filterOpen}
              className={[
                'shrink-0 w-9 h-9 rounded-md border flex items-center justify-center transition-all relative',
                filterOpen || activeFilterCount > 0
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20',
              ].join(' ')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Sort + clear row */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(['alpha', 'season'] as SortMode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => handleSortClick(m)}
                  className={[
                    'text-[10px] font-bold px-3 py-1.5 transition-colors',
                    i > 0 ? 'border-l border-white/10' : '',
                    sortMode === m ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {m === 'alpha' ? `A–Z${dirArrow('alpha')}` : `Season${dirArrow('season')}`}
                </button>
              ))}
            </div>
            {anyFilter && (
              <button
                onClick={() => { setQuery(''); setFilters(DEFAULT_FILTERS); setActiveCat(null); setColSubcat(null); }}
                className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors ml-auto"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeChips.map((chip, i) => (
                <ActiveChip key={`${chip.label}-${i}`} label={chip.label} isExclude={chip.isExclude} onRemove={chip.clear} />
              ))}
            </div>
          )}
        </div>

        {/* Filter panel — in normal flow, directly below header, no gap */}
        {filterOpen && (
          <FilterPanel
            filters={filters}
            allOptions={allOptions}
            activeCat={activeCat}
            activeColSubcat={colSubcat}
            onSetActiveCat={id => { setActiveCat(id); if (id !== 'column') setColSubcat(null); }}
            onSetColSubcat={setColSubcat}
            onToggle={handleToggleFilter}
            onToggleFilter={handleToggleBool}
            onClearKey={key => setFilters(f => ({ ...f, [key]: emptyMF() }))}
          />
        )}
      </div>

      {/* ── Weapon list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <div className="space-y-2 mt-4 px-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 animate-pulse">
                <div className="w-14 h-14 rounded bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2.5 bg-white/5 rounded w-1/2" />
                  <div className="h-2 bg-white/5 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-red-400 text-xs text-center mt-8 px-2">{error}</p>}
        {!isLoading && !error && filteredGroups.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">
            {anyFilter ? 'No weapons match these filters.' : 'No weapons found.'}
          </p>
        )}

        {filteredGroups.map((group) => {
          const d          = group.default;
          const isActive   = group.variants.some(v => v.hash === activeWeapon?.hash);
          const seasonName = bestSeasonName(group);

          return (
            <div
              key={group.baseName}
              className={[
                'rounded-lg overflow-hidden transition-all duration-150 border-l-2',
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50'
                  : 'border-transparent hover:border-white/15 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <button
                onClick={() => handleLoadWeapon(group.default, group.variants)}
                className="w-full text-left p-2 flex items-center gap-2.5 transition-all duration-150"
              >
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-14 h-14 rounded overflow-hidden">
                    {d.icon && <img src={BUNGIE_ROOT + d.icon} alt="" className="w-full h-full object-cover" />}
                  </div>
                  {d.iconWatermark && (
                    <img src={d.iconWatermark} alt="" className="absolute top-0 left-0 w-5 h-5 object-contain" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-bold truncate leading-tight',
                    isActive ? 'text-amber-400' : d.rarity === 'Exotic' ? 'text-yellow-400' : 'text-slate-200',
                  ].join(' ')}>
                    {group.baseName}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <span className={[DAMAGE_COLORS[d.damageType] ?? 'text-slate-500', 'opacity-70'].join(' ')}>
                      {d.damageType}
                    </span>
                    {AMMO_LABELS[d.ammoType] && (
                      <>
                        <span className="text-slate-700">|</span>
                        <span className={AMMO_COLORS[d.ammoType] ?? 'text-slate-500'}>{AMMO_LABELS[d.ammoType]}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {d.itemTypeDisplayName}
                    {seasonName && <span className="text-slate-500"> · {seasonName}</span>}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {weapons.length > 0 && (
        <div className="p-2.5 border-t border-white/10 text-[10px] text-slate-600 text-center">
          {filteredGroups.length} / {groups.length} weapons
        </div>
      )}
    </nav>
  );
};
