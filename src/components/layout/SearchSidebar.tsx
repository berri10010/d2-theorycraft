'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';

// ─── Constants ─────────────────────────────────────────────────────────────────

const BUNGIE_ROOT = 'https://www.bungie.net';

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-200', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};

const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const AMMO_COLORS: Record<number, string> = {
  1: 'text-green-400', 2: 'text-purple-400', 3: 'text-yellow-400',
};

/** Border color per rarity / variant type */
function tileBorderClass(group: WeaponGroup, isActive: boolean): string {
  if (isActive) return 'border-amber-500/60';
  const d = group.default;
  if (d.rarity === 'Exotic') return 'border-yellow-500/40 hover:border-yellow-500/70';
  if (group.variants.some((v) => v.isAdept)) return 'border-amber-500/30 hover:border-amber-500/60';
  if (group.variants.some((v) => v.hasCraftedPattern)) return 'border-red-500/30 hover:border-red-500/50';
  return 'border-white/8 hover:border-white/20';
}

type SortMode = 'alpha' | 'season';

function sortGroupsBySeason(groups: WeaponGroup[]): WeaponGroup[] {
  return [...groups].sort((a, b) => {
    const sa = a.default.seasonNumber ?? -1;
    const sb = b.default.seasonNumber ?? -1;
    if (sa !== sb) return sb - sa;
    return a.baseName.localeCompare(b.baseName);
  });
}

// ─── Filter Drawer ──────────────────────────────────────────────────────────────

interface FilterState {
  damage: string;
  ammo: string;
  rarity: string;
  adeptOnly: boolean;
}

const DAMAGE_OPTIONS = ['kinetic', 'solar', 'arc', 'void', 'stasis', 'strand'];
const AMMO_OPTIONS = [1, 2, 3];
const RARITY_OPTIONS = ['Legendary', 'Exotic'];

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
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

function FilterDrawer({
  filters, setFilters, onClose,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClose: () => void;
}) {
  const toggle = (key: keyof FilterState, val: string | boolean) =>
    setFilters((f) => ({ ...f, [key]: f[key] === val ? '' : val }));

  return (
    <div className="absolute left-0 right-0 top-full z-50 bg-black/95 border border-white/10 rounded-b-xl shadow-2xl p-4 space-y-4">
      {/* Damage element */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Element</p>
        <div className="flex flex-wrap gap-1.5">
          {DAMAGE_OPTIONS.map((d) => (
            <FilterChip
              key={d}
              label={d.charAt(0).toUpperCase() + d.slice(1)}
              active={filters.damage === d}
              onClick={() => toggle('damage', d)}
            />
          ))}
        </div>
      </div>

      {/* Ammo type */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ammo</p>
        <div className="flex gap-1.5">
          {AMMO_OPTIONS.map((a) => (
            <FilterChip
              key={a}
              label={AMMO_LABELS[a]}
              active={filters.ammo === String(a)}
              onClick={() => toggle('ammo', String(a))}
            />
          ))}
        </div>
      </div>

      {/* Rarity */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rarity</p>
        <div className="flex gap-1.5">
          {RARITY_OPTIONS.map((r) => (
            <FilterChip
              key={r}
              label={r}
              active={filters.rarity === r}
              onClick={() => toggle('rarity', r)}
            />
          ))}
        </div>
      </div>

      {/* Adept */}
      <div className="flex items-center justify-between pt-1 border-t border-white/8">
        <span className="text-xs text-slate-400">Adept / Timelost only</span>
        <button
          onClick={() => setFilters((f) => ({ ...f, adeptOnly: !f.adeptOnly }))}
          className={[
            'w-8 h-4 rounded-full border transition-all relative',
            filters.adeptOnly
              ? 'bg-amber-500/40 border-amber-500/60'
              : 'bg-white/5 border-white/10',
          ].join(' ')}
        >
          <span className={[
            'absolute top-0.5 w-3 h-3 rounded-full transition-all',
            filters.adeptOnly ? 'left-4 bg-amber-400' : 'left-0.5 bg-slate-500',
          ].join(' ')} />
        </button>
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error, forceSync, isSyncing } = useWeaponDb();

  const [query, setQuery]       = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    damage: '', ammo: '', rarity: '', adeptOnly: false,
  });

  const headerRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = [
    filters.damage, filters.ammo, filters.rarity, filters.adeptOnly,
  ].filter(Boolean).length;

  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase();
    let result = groups.filter((g) => {
      const nameMatch  = !q || g.variants.some((v) => v.name.toLowerCase().includes(q));
      const d = g.default;
      const dmgMatch   = !filters.damage  || d.damageType === filters.damage;
      const ammoMatch  = !filters.ammo    || d.ammoType === Number(filters.ammo);
      const rarityMatch = !filters.rarity || d.rarity === filters.rarity;
      const adeptMatch = !filters.adeptOnly || g.variants.some((v) => v.isAdept);
      return nameMatch && dmgMatch && ammoMatch && rarityMatch && adeptMatch;
    });
    if (sortMode === 'season') result = sortGroupsBySeason(result);
    return result;
  }, [groups, query, filters, sortMode]);

  const anyFilter = !!(query || activeFilterCount);

  return (
    <nav aria-label="Weapon database" className="bg-black h-full flex flex-col">

      {/* ── Header controls ──────────────────────────────────────────── */}
      <div ref={headerRef} className="p-3 border-b border-white/10 space-y-2.5 relative">
        {/* Top row: title + sync */}
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

        {/* Search + Filter button row */}
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search weapons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {/* Filter icon button */}
          <button
            onClick={() => setFilterOpen((v) => !v)}
            title="Open filters"
            className={[
              'shrink-0 w-9 h-9 rounded-md border flex items-center justify-center transition-all relative',
              filterOpen || activeFilterCount > 0
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20',
            ].join(' ')}
          >
            {/* Sliders icon */}
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

        {/* Filter Drawer — drops below the header */}
        {filterOpen && (
          <FilterDrawer
            filters={filters}
            setFilters={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        {/* Sort + active filter chips row */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(['alpha', 'season'] as SortMode[]).map((mode, i) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={[
                  'text-[10px] font-bold px-3 py-1.5 transition-colors',
                  i > 0 ? 'border-l border-white/10' : '',
                  sortMode === mode ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {mode === 'alpha' ? 'A–Z' : 'Season'}
              </button>
            ))}
          </div>

          {anyFilter && (
            <button
              onClick={() => { setQuery(''); setFilters({ damage: '', ammo: '', rarity: '', adeptOnly: false }); }}
              className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors ml-auto"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Weapon list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && <p className="text-slate-500 text-sm text-center mt-8">Loading weapons…</p>}
        {error    && <p className="text-red-400  text-xs text-center mt-8 px-2">{error}</p>}
        {!isLoading && !error && filteredGroups.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">No weapons found.</p>
        )}

        {filteredGroups.map((group) => {
          const d = group.default;
          const isActive   = group.variants.some((v) => v.hash === activeWeapon?.hash);
          const hasVariants = group.variants.length > 1;
          const isExotic   = d.rarity === 'Exotic';
          const hasAdept   = group.variants.some((v) => v.isAdept);
          const hasCrafted = group.variants.some((v) => v.hasCraftedPattern);

          return (
            <div
              key={group.baseName}
              className={[
                'rounded-lg border transition-all overflow-hidden',
                tileBorderClass(group, isActive),
                isActive ? 'bg-amber-500/8' : '',
              ].join(' ')}
            >
              {/* ── Main tile row ────────────────────────────── */}
              <button
                onClick={() => loadWeapon(group.default, group.variants)}
                className="w-full text-left p-2 flex items-center gap-2.5 hover:bg-white/4 transition-colors"
              >
                {/* 64×64 icon with watermark overlay */}
                <div className="relative w-14 h-14 shrink-0">
                  {/* Rarity-colored icon border */}
                  <div className={[
                    'w-14 h-14 rounded overflow-hidden border',
                    isExotic  ? 'border-yellow-500/50' :
                    hasAdept  ? 'border-amber-500/40'  :
                    hasCrafted? 'border-red-500/40'    : 'border-white/10',
                  ].join(' ')}>
                    {d.icon && (
                      <img
                        src={BUNGIE_ROOT + d.icon}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {/* Season watermark — top-left corner */}
                  {d.iconWatermark && (
                    <img
                      src={d.iconWatermark}
                      alt=""
                      className="absolute top-0 left-0 w-5 h-5 object-contain"
                    />
                  )}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-bold truncate leading-tight',
                    isActive ? 'text-amber-400' : isExotic ? 'text-yellow-400' : 'text-slate-200',
                  ].join(' ')}>
                    {group.baseName}
                  </p>

                  <p className={[
                    'text-[10px] uppercase tracking-wider opacity-70 mt-0.5',
                    DAMAGE_COLORS[d.damageType] ?? 'text-slate-500',
                  ].join(' ')}>
                    {d.damageType}
                  </p>

                  <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                    {d.itemTypeDisplayName}
                    {d.seasonName && (
                      <span className="text-slate-700"> · {d.seasonName}</span>
                    )}
                  </p>

                  {/* Ammo type badge */}
                  <span className={[
                    'text-[9px] font-bold',
                    AMMO_COLORS[d.ammoType] ?? 'text-slate-500',
                  ].join(' ')}>
                    {AMMO_LABELS[d.ammoType] ?? ''}
                  </span>
                </div>
              </button>

              {/* ── Variant pills ──────────────────────────── */}
              {hasVariants && (
                <div className="flex gap-1 px-2 pb-2 flex-wrap">
                  {group.variants.map((variant) => {
                    const isSelected  = variant.hash === activeWeapon?.hash;
                    const isAdeptType = !!variant.variantLabel;
                    const label = variant.seasonName ?? (variant.variantLabel ?? 'Base');

                    const adeptStyle = isSelected
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                      : 'bg-amber-500/10 text-amber-500/70 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-400';
                    const baseStyle = isSelected
                      ? 'bg-white/15 text-white border-white/40'
                      : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-slate-300';

                    return (
                      <button
                        key={variant.hash}
                        onClick={() => loadWeapon(variant, group.variants)}
                        title={variant.variantLabel ? `${variant.variantLabel} · ${label}` : label}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all leading-none ${isAdeptType ? adeptStyle : baseStyle}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer count ─────────────────────────────────────────────── */}
      {weapons.length > 0 && (
        <div className="p-2.5 border-t border-white/10 text-[10px] text-slate-600 text-center">
          {filteredGroups.length} / {groups.length} weapons
        </div>
      )}
    </nav>
  );
};
