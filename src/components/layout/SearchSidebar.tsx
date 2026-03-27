'use client';

import React, { useState, useMemo } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon } from '../../types/weapon';

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-200', solar: 'text-orange-400', arc: 'text-blue-400',
  void: 'text-purple-400', stasis: 'text-cyan-400', strand: 'text-emerald-400',
};

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error, forceSync, isSyncing } = useWeaponDb();

  const [query, setQuery] = useState('');
  const [damageFilter, setDamageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Derive unique weapon types from actual data
  const weaponTypes = useMemo(() => {
    const types = new Set(weapons.map((w) => w.itemTypeDisplayName));
    return Array.from(types).sort();
  }, [weapons]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return weapons.filter((w: Weapon) => {
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (damageFilter && w.damageType !== damageFilter) return false;
      if (typeFilter && w.itemTypeDisplayName !== typeFilter) return false;
      return true;
    });
  }, [weapons, query, damageFilter, typeFilter]);

  return (
    <nav aria-label="Weapon database" className="bg-slate-900 h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-100">Database</h2>
          <button
            onClick={forceSync}
            disabled={isSyncing}
            title="Force re-sync from Bungie"
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors disabled:opacity-40"
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        <input
          type="search"
          placeholder="Search weapons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={damageFilter}
            onChange={(e) => setDamageFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Elements</option>
            {['kinetic','solar','arc','void','stasis','strand'].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Types</option>
            {weaponTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {(query || damageFilter || typeFilter) && (
          <button
            onClick={() => { setQuery(''); setDamageFilter(''); setTypeFilter(''); }}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors w-full text-right"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <p className="text-slate-500 text-sm text-center mt-8">Loading weapons...</p>
        )}
        {error && (
          <p className="text-red-400 text-xs text-center mt-8 px-2">{error}</p>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">No weapons found.</p>
        )}
        {filtered.map((weapon) => {
          const isActive = activeWeapon?.hash === weapon.hash;
          return (
            <button
              key={weapon.hash}
              onClick={() => loadWeapon(weapon)}
              className={
                'w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors border ' +
                (isActive ? 'bg-amber-500/10 border-amber-500/50' : 'hover:bg-slate-800 border-transparent')
              }
            >
              <div className="w-9 h-9 bg-slate-800 rounded flex-shrink-0 border border-slate-700 overflow-hidden">
                {weapon.icon && (
                  <img src={'https://www.bungie.net' + weapon.icon} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={'text-sm font-bold truncate ' + (isActive ? 'text-amber-400' : 'text-slate-200')}>
                  {weapon.name}
                </p>
                <p className={'text-xs uppercase tracking-wider truncate opacity-70 ' + (DAMAGE_COLORS[weapon.damageType] ?? 'text-slate-500')}>
                  {weapon.damageType} &bull; {weapon.itemTypeDisplayName}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {weapons.length > 0 && (
        <div className="p-3 border-t border-slate-800 text-xs text-slate-600 text-center">
          {filtered.length} / {weapons.length} weapons
        </div>
      )}
    </nav>
  );
};
