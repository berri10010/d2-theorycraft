'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-200', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};

const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const AMMO_COLORS: Record<number, string> = {
  1: 'text-green-400', 2: 'text-purple-400', 3: 'text-yellow-400',
};

const DAMAGE_OPTIONS = ['kinetic', 'solar', 'arc', 'void', 'stasis', 'strand'];
const AMMO_OPTIONS = [1, 2, 3];
const RARITY_OPTIONS = ['Exotic', 'Legendary', 'Rare', 'Uncommon', 'Common'];

type SortMode = 'alpha' | 'season';
type SortDir  = 'asc'   | 'desc';
// Natural default direction per sort mode
const DEFAULT_DIR: Record<SortMode, SortDir> = { alpha: 'asc', season: 'asc' };

// ─── Filter state ─────────────────────────────────────────────────────────────

interface MultiFilter { inc: string[]; exc: string[] }

interface FilterState {
  damage:     MultiFilter;
  ammo:       MultiFilter;
  rarity:     MultiFilter;
  weaponType: MultiFilter;
  adeptOnly:     boolean;
  craftableOnly: boolean;
}

const emptyMF = (): MultiFilter => ({ inc: [], exc: [] });

const DEFAULT_FILTERS: FilterState = {
  damage:     emptyMF(),
  ammo:       emptyMF(),
  rarity:     emptyMF(),
  weaponType: emptyMF(),
  adeptOnly:     false,
  craftableOnly: false,
};

type MultiKey = 'damage' | 'ammo' | 'rarity' | 'weaponType';

// Three-state cycle per value: none → include (amber) → exclude (red) → none
function cycleFilter(f: FilterState, key: MultiKey, val: string): FilterState {
  const { inc, exc } = f[key];
  if (inc.includes(val)) {
    return { ...f, [key]: { inc: inc.filter(v => v !== val), exc: [...exc, val] } };
  }
  if (exc.includes(val)) {
    return { ...f, [key]: { inc, exc: exc.filter(v => v !== val) } };
  }
  return { ...f, [key]: { inc: [...inc, val], exc } };
}

// A weapon passes a multi-filter if:
//   • not in the exclude list, AND
//   • include list is empty OR the weapon's value is in the include list
function matchesMF(mf: MultiFilter, val: string): boolean {
  if (mf.exc.includes(val)) return false;
  if (mf.inc.length > 0 && !mf.inc.includes(val)) return false;
  return true;
}

function chipMode(mf: MultiFilter, val: string): 'none' | 'inc' | 'exc' {
  if (mf.inc.includes(val)) return 'inc';
  if (mf.exc.includes(val)) return 'exc';
  return 'none';
}

function countMF(mf: MultiFilter) { return mf.inc.length + mf.exc.length; }

function bestSeasonNumber(g: WeaponGroup): number {
  return Math.max(...g.variants.map(v => v.seasonNumber ?? -1));
}
function bestSeasonName(g: WeaponGroup): string | null {
  return g.variants.map(v => v.seasonName).find(Boolean) ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({
  label, mode, onClick,
}: { label: string; mode: 'none' | 'inc' | 'exc'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all',
        mode === 'inc' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
          : mode === 'exc' ? 'bg-red-500/15 text-red-400 border-red-500/40 line-through'
          : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300 hover:border-white/20',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ActiveChip({
  label, isExclude, onRemove,
}: { label: string; isExclude: boolean; onRemove: () => void }) {
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

function Toggle({
  checked, onChange, color = 'amber',
}: { checked: boolean; onChange: () => void; color?: 'amber' | 'red' }) {
  const on  = color === 'red' ? 'bg-red-500/40 border-red-500/60'     : 'bg-amber-500/40 border-amber-500/60';
  const dot = color === 'red' ? 'bg-red-400'                           : 'bg-amber-400';
  return (
    <button
      role="switch" aria-checked={checked} onClick={onChange}
      className={['w-8 h-4 rounded-full border transition-all relative', checked ? on : 'bg-white/5 border-white/10'].join(' ')}
    >
      <span className={['absolute top-0.5 w-3 h-3 rounded-full transition-all', checked ? `left-4 ${dot}` : 'left-0.5 bg-slate-500'].join(' ')} />
    </button>
  );
}

function FilterDrawer({
  filters, onToggle, onClose, weaponTypes, onToggleAdept, onToggleCraftable,
}: {
  filters: FilterState;
  onToggle: (key: MultiKey, val: string) => void;
  onClose: () => void;
  weaponTypes: string[];
  onToggleAdept: () => void;
  onToggleCraftable: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 bg-[#0a0a0a] border border-white/10 rounded-b-xl shadow-2xl p-4 space-y-4">

      {/* Element */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Element</p>
        <div className="flex flex-wrap gap-1.5">
          {DAMAGE_OPTIONS.map((d) => (
            <FilterChip key={d}
              label={d.charAt(0).toUpperCase() + d.slice(1)}
              mode={chipMode(filters.damage, d)}
              onClick={() => onToggle('damage', d)} />
          ))}
        </div>
      </div>

      {/* Ammo */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ammo</p>
        <div className="flex gap-1.5">
          {AMMO_OPTIONS.map((a) => (
            <FilterChip key={a}
              label={AMMO_LABELS[a]}
              mode={chipMode(filters.ammo, String(a))}
              onClick={() => onToggle('ammo', String(a))} />
          ))}
        </div>
      </div>

      {/* Rarity */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rarity</p>
        <div className="flex flex-wrap gap-1.5">
          {RARITY_OPTIONS.map((r) => (
            <FilterChip key={r}
              label={r}
              mode={chipMode(filters.rarity, r)}
              onClick={() => onToggle('rarity', r)} />
          ))}
        </div>
      </div>

      {/* Weapon type */}
      {weaponTypes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Weapon Type</p>
          <div className="flex flex-wrap gap-1.5">
            {weaponTypes.map((t) => (
              <FilterChip key={t}
                label={t}
                mode={chipMode(filters.weaponType, t)}
                onClick={() => onToggle('weaponType', t)} />
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-2.5 pt-2 border-t border-white/8">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Adept / Timelost only</span>
          <Toggle checked={filters.adeptOnly} onChange={onToggleAdept} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Craftable only</span>
          <Toggle color="red" checked={filters.craftableOnly} onChange={onToggleCraftable} />
        </div>
      </div>

      <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-amber-400 transition-colors pt-1">
        Done
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error } = useWeaponDb();

  const [query,      setQuery]      = useState('');
  const [sortMode,   setSortMode]   = useState<SortMode>('alpha');
  const [sortDir,    setSortDir]    = useState<SortDir>('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters,    setFilters]    = useState<FilterState>(DEFAULT_FILTERS);

  const headerRef = useRef<HTMLDivElement>(null);

  // Close filter drawer on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const weaponTypes = useMemo(
    () => Array.from(new Set(weapons.map((w) => w.itemTypeDisplayName).filter(Boolean))).sort(),
    [weapons],
  );

  // Three-state toggle for multi-select filters
  const handleToggleFilter = (key: MultiKey, val: string) =>
    setFilters(f => cycleFilter(f, key, val));

  // Toggle booleans — need to wire up in the drawer
  const handleToggleAdept     = () => setFilters(f => ({ ...f, adeptOnly:     !f.adeptOnly }));
  const handleToggleCraftable = () => setFilters(f => ({ ...f, craftableOnly: !f.craftableOnly }));

  // Sort: second click on active mode reverses; switching mode resets to natural default
  const handleSortClick = (m: SortMode) => {
    if (m === sortMode) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortMode(m);
      setSortDir(DEFAULT_DIR[m]);
    }
  };

  const activeFilterCount =
    countMF(filters.damage) + countMF(filters.ammo) +
    countMF(filters.rarity) + countMF(filters.weaponType) +
    (filters.adeptOnly ? 1 : 0) + (filters.craftableOnly ? 1 : 0);

  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase().trim();

    // Rank by match quality: 0 = starts-with, 1 = word starts-with, 2 = contains
    const nameRank = (name: string): number => {
      if (!q) return 0;
      if (name.startsWith(q)) return 0;
      if (name.split(/\s+/).some(w => w.startsWith(q))) return 1;
      if (name.includes(q)) return 2;
      return 999;
    };

    let result = groups
      .map((g) => {
        const rank = q ? Math.min(...g.variants.map(v => nameRank(v.name.toLowerCase()))) : 0;
        return { g, rank };
      })
      .filter(({ g, rank }) => {
        if (rank === 999) return false;
        const d = g.default;
        const dmgMatch   = matchesMF(filters.damage,     d.damageType);
        const ammoMatch  = matchesMF(filters.ammo,       String(d.ammoType));
        const rarMatch   = matchesMF(filters.rarity,     d.rarity ?? '');
        const typeMatch  = matchesMF(filters.weaponType, d.itemTypeDisplayName);
        const adeptMatch = !filters.adeptOnly     || g.variants.some(v => v.isAdept);
        const craftMatch = !filters.craftableOnly || g.variants.some(v => v.hasCraftedPattern);
        return dmgMatch && ammoMatch && rarMatch && typeMatch && adeptMatch && craftMatch;
      });

    // Apply sort — when there's a query, rank takes priority; otherwise pure sort
    result.sort((a, b) => {
      if (q && a.rank !== b.rank) return a.rank - b.rank;
      let diff: number;
      if (sortMode === 'season') {
        const sa = bestSeasonNumber(a.g), sb = bestSeasonNumber(b.g);
        diff = sa !== sb ? sb - sa : a.g.baseName.localeCompare(b.g.baseName);
      } else {
        diff = a.g.baseName.localeCompare(b.g.baseName);
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return result.map(({ g }) => g);
  }, [groups, query, filters, sortMode, sortDir]);

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
    ...mkChips('damage',     v => v.charAt(0).toUpperCase() + v.slice(1)),
    ...mkChips('ammo',       v => AMMO_LABELS[Number(v)] ?? v),
    ...mkChips('rarity',     v => v),
    ...mkChips('weaponType', v => v),
    ...(filters.adeptOnly     ? [{ label: 'Adept only', isExclude: false, clear: handleToggleAdept }]     : []),
    ...(filters.craftableOnly ? [{ label: 'Craftable',  isExclude: false, clear: handleToggleCraftable }] : []),
  ];

  const anyFilter = !!(query || activeFilterCount);

  // Direction indicator arrow
  const dirArrow = (m: SortMode) => sortMode === m ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <nav aria-label="Weapon database" className="bg-black h-full flex flex-col">

      {/* ── Header controls ─────────────────────────────────────────── */}
      <div ref={headerRef} className="p-3 border-b border-white/10 space-y-2.5 relative">

        {/* Title */}
        <h2 className="font-bold text-base text-white">Database</h2>

        {/* Search + filter button */}
        <div className="flex gap-2">
          <input
            type="search" placeholder="Search weapons…" value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
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

        {/* Filter drawer */}
        {filterOpen && (
          <FilterDrawer
            filters={filters}
            onToggle={handleToggleFilter}
            onClose={() => setFilterOpen(false)}
            weaponTypes={weaponTypes}
            onToggleAdept={handleToggleAdept}
            onToggleCraftable={handleToggleCraftable}
          />
        )}

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
              onClick={() => { setQuery(''); setFilters(DEFAULT_FILTERS); }}
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

      {/* ── Weapon list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && <p className="text-slate-500 text-sm text-center mt-8">Loading weapons…</p>}
        {error     && <p className="text-red-400 text-xs text-center mt-8 px-2">{error}</p>}
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
              className={['rounded-lg overflow-hidden transition-colors', isActive ? 'bg-amber-500/10' : ''].join(' ')}
            >
              <button
                onClick={() => loadWeapon(group.default, group.variants)}
                className="w-full text-left p-2 flex items-center gap-2.5 hover:bg-white/4 transition-colors"
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
