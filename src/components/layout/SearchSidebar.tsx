'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';

// ─── Constants ───────────────────────────────────────────────────────────────

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
const RARITY_OPTIONS = ['Legendary', 'Exotic'];

type SortMode = 'alpha' | 'season';

function sortGroupsBySeason(groups: WeaponGroup[]): WeaponGroup[] {
  return [...groups].sort((a, b) => {
    const sa = a.default.seasonNumber ?? -1;
    const sb = b.default.seasonNumber ?? -1;
    if (sa !== sb) return sb - sa;
    return a.baseName.localeCompare(b.baseName);
  });
}


// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  damage: string;
  ammo: string;
  rarity: string;
  weaponType: string;
  adeptOnly: boolean;
  craftableOnly: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  damage: '', ammo: '', rarity: '', weaponType: '', adeptOnly: false, craftableOnly: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all',
        active
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
          : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300 hover:border-white/20',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all leading-none"
    >
      {label}
      <span className="text-amber-500/60 text-[9px] leading-none">×</span>
    </button>
  );
}

function Toggle({
  checked, onChange, color = 'amber',
}: { checked: boolean; onChange: () => void; color?: 'amber' | 'red' }) {
  const on = color === 'red'
    ? 'bg-red-500/40 border-red-500/60'
    : 'bg-amber-500/40 border-amber-500/60';
  const dot = color === 'red' ? 'bg-red-400' : 'bg-amber-400';
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={['w-8 h-4 rounded-full border transition-all relative', checked ? on : 'bg-white/5 border-white/10'].join(' ')}
    >
      <span className={[
        'absolute top-0.5 w-3 h-3 rounded-full transition-all',
        checked ? `left-4 ${dot}` : 'left-0.5 bg-slate-500',
      ].join(' ')} />
    </button>
  );
}

function FilterDrawer({
  filters, setFilters, onClose, weaponTypes,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClose: () => void;
  weaponTypes: string[];
}) {
  const toggleStr = (key: 'damage' | 'ammo' | 'rarity' | 'weaponType', val: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === val ? '' : val }));

  return (
    <div className="absolute left-0 right-0 top-full z-50 bg-[#0a0a0a] border border-white/10 rounded-b-xl shadow-2xl p-4 space-y-4">

      {/* Element */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Element</p>
        <div className="flex flex-wrap gap-1.5">
          {DAMAGE_OPTIONS.map((d) => (
            <FilterChip key={d} label={d.charAt(0).toUpperCase() + d.slice(1)}
              active={filters.damage === d} onClick={() => toggleStr('damage', d)} />
          ))}
        </div>
      </div>

      {/* Ammo */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ammo</p>
        <div className="flex gap-1.5">
          {AMMO_OPTIONS.map((a) => (
            <FilterChip key={a} label={AMMO_LABELS[a]}
              active={filters.ammo === String(a)} onClick={() => toggleStr('ammo', String(a))} />
          ))}
        </div>
      </div>

      {/* Rarity */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rarity</p>
        <div className="flex gap-1.5">
          {RARITY_OPTIONS.map((r) => (
            <FilterChip key={r} label={r}
              active={filters.rarity === r} onClick={() => toggleStr('rarity', r)} />
          ))}
        </div>
      </div>

      {/* Weapon type — dynamically populated from database */}
      {weaponTypes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Weapon Type</p>
          <div className="flex flex-wrap gap-1.5">
            {weaponTypes.map((t) => (
              <FilterChip key={t} label={t}
                active={filters.weaponType === t} onClick={() => toggleStr('weaponType', t)} />
            ))}
          </div>
        </div>
      )}

      {/* Toggle rows */}
      <div className="space-y-2.5 pt-2 border-t border-white/8">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Adept / Timelost only</span>
          <Toggle checked={filters.adeptOnly} onChange={() => setFilters((f) => ({ ...f, adeptOnly: !f.adeptOnly }))} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Craftable only</span>
          <Toggle color="red" checked={filters.craftableOnly} onChange={() => setFilters((f) => ({ ...f, craftableOnly: !f.craftableOnly }))} />
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full text-center text-xs text-slate-500 hover:text-amber-400 transition-colors pt-1"
      >
        Done
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error, forceSync, isSyncing } = useWeaponDb();

  const [query, setQuery]           = useState('');
  const [sortMode, setSortMode]     = useState<SortMode>('alpha');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters]       = useState<FilterState>(DEFAULT_FILTERS);

  const headerRef = useRef<HTMLDivElement>(null);

  // Close filter drawer on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // Weapon types derived from database (sorted alphabetically)
  const weaponTypes = useMemo(
    () => Array.from(new Set(weapons.map((w) => w.itemTypeDisplayName).filter(Boolean))).sort(),
    [weapons],
  );

  const activeFilterCount = [
    filters.damage, filters.ammo, filters.rarity, filters.weaponType,
    filters.adeptOnly, filters.craftableOnly,
  ].filter(Boolean).length;

  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = groups.filter((g) => {
      const nameMatch    = !q || g.variants.some((v) => v.name.toLowerCase().includes(q));
      const d = g.default;
      const dmgMatch     = !filters.damage       || d.damageType === filters.damage;
      const ammoMatch    = !filters.ammo         || d.ammoType === Number(filters.ammo);
      const rarityMatch  = !filters.rarity       || d.rarity === filters.rarity;
      const typeMatch    = !filters.weaponType   || d.itemTypeDisplayName === filters.weaponType;
      const adeptMatch   = !filters.adeptOnly    || g.variants.some((v) => v.isAdept);
      const craftMatch   = !filters.craftableOnly || g.variants.some((v) => v.hasCraftedPattern);
      return nameMatch && dmgMatch && ammoMatch && rarityMatch && typeMatch && adeptMatch && craftMatch;
    });
    if (sortMode === 'season') result = sortGroupsBySeason(result);
    return result;
  }, [groups, query, filters, sortMode]);

  // Dismissible chips for each active filter
  const activeChips = [
    filters.damage       && { label: filters.damage.charAt(0).toUpperCase() + filters.damage.slice(1), clear: () => setFilters((f) => ({ ...f, damage: '' })) },
    filters.ammo         && { label: AMMO_LABELS[Number(filters.ammo)],                                 clear: () => setFilters((f) => ({ ...f, ammo: '' })) },
    filters.rarity       && { label: filters.rarity,                                                    clear: () => setFilters((f) => ({ ...f, rarity: '' })) },
    filters.weaponType   && { label: filters.weaponType,                                                clear: () => setFilters((f) => ({ ...f, weaponType: '' })) },
    filters.adeptOnly    && { label: 'Adept only',                                                      clear: () => setFilters((f) => ({ ...f, adeptOnly: false })) },
    filters.craftableOnly && { label: 'Craftable',                                                      clear: () => setFilters((f) => ({ ...f, craftableOnly: false })) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const anyFilter = !!(query || activeFilterCount);

  return (
    <nav aria-label="Weapon database" className="bg-black h-full flex flex-col">

      {/* ── Header controls ─────────────────────────────────────────── */}
      <div ref={headerRef} className="p-3 border-b border-white/10 space-y-2.5 relative">

        {/* Title + sync */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">Database</h2>
          <button
            onClick={forceSync}
            disabled={isSyncing}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-40"
          >
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>

        {/* Search + filter button */}
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search weapons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={() => setFilterOpen((v) => !v)}
            title="Filters"
            aria-expanded={filterOpen}
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
            setFilters={setFilters}
            onClose={() => setFilterOpen(false)}
            weaponTypes={weaponTypes}
          />
        )}

        {/* Sort + clear row */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(['alpha', 'season'] as SortMode[]).map((m, i) => (
              <button
                key={m}
                onClick={() => setSortMode(m)}
                className={[
                  'text-[10px] font-bold px-3 py-1.5 transition-colors',
                  i > 0 ? 'border-l border-white/10' : '',
                  sortMode === m ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {m === 'alpha' ? 'A–Z' : 'Season'}
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

        {/* Active filter chips — quick dismiss */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeChips.map((chip) => (
              <ActiveChip key={chip.label} label={chip.label} onRemove={chip.clear} />
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
          const d        = group.default;
          const isActive = group.variants.some((v) => v.hash === activeWeapon?.hash);

          return (
            <div
              key={group.baseName}
              className={[
                'rounded-lg overflow-hidden transition-colors',
                isActive ? 'bg-amber-500/10' : '',
              ].join(' ')}
            >
              {/* Main tile */}
              <button
                onClick={() => loadWeapon(group.default, group.variants)}
                className="w-full text-left p-2 flex items-center gap-2.5 hover:bg-white/4 transition-colors"
              >
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-14 h-14 rounded overflow-hidden">
                    {d.icon && (
                      <img src={BUNGIE_ROOT + d.icon} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  {d.iconWatermark && (
                    <img
                      src={d.iconWatermark}
                      alt=""
                      className="absolute top-0 left-0 w-5 h-5 object-contain"
                    />
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
                        <span className={AMMO_COLORS[d.ammoType] ?? 'text-slate-500'}>
                          {AMMO_LABELS[d.ammoType]}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                    {d.itemTypeDisplayName}
                    {d.seasonName && <span className="text-slate-700"> · {d.seasonName}</span>}
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
