'use client';

import React, { useState, useMemo } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon, WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-200', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};

type SortMode = 'alpha' | 'season';

/**
 * Weapons from the same season share the same iconWatermark URL.
 * We sort by that URL string — it won't give you a named season label, but it
 * groups same-season weapons together consistently.
 */
function sortGroupsBySeason(groups: WeaponGroup[]): WeaponGroup[] {
  return [...groups].sort((a, b) => {
    const wa = a.default.iconWatermark ?? '';
    const wb = b.default.iconWatermark ?? '';
    if (wa === wb) return a.baseName.localeCompare(b.baseName);
    // Push weapons without watermarks (base game) to the top
    if (!wa && wb) return -1;
    if (wa && !wb) return 1;
    return wa.localeCompare(wb);
  });
}

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error, forceSync, isSyncing } = useWeaponDb();

  const [query, setQuery] = useState('');
  const [damageFilter, setDamageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [adeptOnly, setAdeptOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('alpha');

  const weaponTypes = useMemo(() => {
    const types = new Set(weapons.map((w) => w.itemTypeDisplayName));
    return Array.from(types).sort();
  }, [weapons]);

  // Build groups then filter
  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase();
    let result = groups.filter((g) => {
      const nameMatch = !q || g.variants.some((v) => v.name.toLowerCase().includes(q));
      const d = g.default;
      const dmgMatch  = !damageFilter || d.damageType === damageFilter;
      const typeMatch = !typeFilter   || d.itemTypeDisplayName === typeFilter;
      const adeptMatch = !adeptOnly   || g.variants.some((v) => v.isAdept);
      return nameMatch && dmgMatch && typeMatch && adeptMatch;
    });

    if (sortMode === 'season') {
      result = sortGroupsBySeason(result);
    }
    return result;
  }, [groups, query, damageFilter, typeFilter, adeptOnly, sortMode]);

  const handleGroupClick = (group: WeaponGroup) => {
    loadWeapon(group.default, group.variants);
  };

  return (
    <nav aria-label="Weapon database" className="bg-black h-full flex flex-col">
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-white">Database</h2>
          <button
            onClick={forceSync}
            disabled={isSyncing}
            title="Force re-sync from Bungie"
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-40"
          >
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>

        <input
          type="search"
          placeholder="Search weapons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={damageFilter}
            onChange={(e) => setDamageFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Elements</option>
            {['kinetic','solar','arc','void','stasis','strand'].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Types</option>
            {weaponTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Sort + Adept filter row */}
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden flex-1">
            <button
              onClick={() => setSortMode('alpha')}
              className={[
                'flex-1 text-[10px] font-bold py-1.5 transition-colors',
                sortMode === 'alpha'
                  ? 'bg-white/10 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              A–Z
            </button>
            <button
              onClick={() => setSortMode('season')}
              className={[
                'flex-1 text-[10px] font-bold py-1.5 border-l border-white/10 transition-colors',
                sortMode === 'season'
                  ? 'bg-white/10 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              Season
            </button>
          </div>

          {/* Adept-only toggle */}
          <button
            onClick={() => setAdeptOnly((v) => !v)}
            title="Show only weapons with an Adept variant"
            className={[
              'text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors',
              adeptOnly
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300',
            ].join(' ')}
          >
            Adept ★
          </button>
        </div>

        {(query || damageFilter || typeFilter || adeptOnly) && (
          <button
            onClick={() => { setQuery(''); setDamageFilter(''); setTypeFilter(''); setAdeptOnly(false); }}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors w-full text-right"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && <p className="text-slate-500 text-sm text-center mt-8">Loading weapons…</p>}
        {error   && <p className="text-red-400 text-xs text-center mt-8 px-2">{error}</p>}
        {!isLoading && !error && filteredGroups.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">No weapons found.</p>
        )}

        {filteredGroups.map((group) => {
          const d = group.default;
          const isActive = group.variants.some((v) => v.hash === activeWeapon?.hash);
          const hasVariants = group.variants.length > 1;

          return (
            <div
              key={group.baseName}
              className={[
                'rounded-lg border transition-colors overflow-hidden',
                isActive
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'border-transparent hover:border-white/10',
              ].join(' ')}
            >
              {/* Main row — loads the best variant */}
              <button
                onClick={() => handleGroupClick(group)}
                className="w-full text-left p-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                {/* Icon + season watermark */}
                <div className="relative w-9 h-9 shrink-0">
                  <div className="w-9 h-9 bg-white/5 rounded border border-white/10 overflow-hidden">
                    {d.icon && (
                      <img
                        src={'https://www.bungie.net' + d.icon}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {d.iconWatermark && (
                    <img
                      src={d.iconWatermark}
                      alt=""
                      className="absolute bottom-0 right-0 w-4 h-4 object-contain"
                    />
                  )}
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <p className={
                    'text-sm font-bold truncate ' + (isActive ? 'text-amber-400' : 'text-slate-200')
                  }>
                    {group.baseName}
                  </p>
                  <p className={
                    'text-xs uppercase tracking-wider opacity-60 ' +
                    (DAMAGE_COLORS[d.damageType] ?? 'text-slate-500')
                  }>
                    {d.damageType} &bull; {d.itemTypeDisplayName}
                  </p>
                </div>
              </button>

              {/* Variant pills — only shown when family has multiple versions */}
              {hasVariants && (
                <div className="flex gap-1 px-2 pb-2 flex-wrap">
                  {group.variants.map((variant) => {
                    const isSelected = variant.hash === activeWeapon?.hash;
                    const isAdeptType = !!variant.variantLabel; // Adept/Timelost/Harrowed/Brave

                    // Label: season name when available, otherwise variant type or "Base"
                    const label = variant.seasonName ?? (variant.variantLabel ?? 'Base');

                    const adeptStyle = isSelected
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                      : 'bg-amber-500/10 text-amber-500/70 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-400';
                    const baseStyle = isSelected
                      ? 'bg-white/15 text-white border-white/40'
                      : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-slate-300';
                    const cls = isAdeptType ? adeptStyle : baseStyle;

                    return (
                      <button
                        key={variant.hash}
                        onClick={() => loadWeapon(variant, group.variants)}
                        title={variant.variantLabel ? `${variant.variantLabel} · ${label}` : label}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all leading-none ${cls}`}
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

      {weapons.length > 0 && (
        <div className="p-3 border-t border-white/10 text-xs text-slate-600 text-center">
          {filteredGroups.length} / {groups.length} weapons
        </div>
      )}
    </nav>
  );
};
