'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGodRolls } from '../../lib/useGodRolls';
import { usePride } from '../../lib/useStaticJson';
import { weaponTier } from '../../lib/godRolls';
import { WeaponListItem } from './WeaponListItem';
import { ActiveChip, FilterPanel } from './SidebarFilters';
import { MAX_RECENT, loadRecentWeaponHashes, pushRecentWeaponHash, loadRecentSearches, saveRecentSearches } from '../../lib/recents';
import {
  type SortMode, type SortDir, type FilterState, type CategoryId, type MultiKey, type ToggleKey,
  AMMO_LABELS, SLOT_LABELS, TIER_ORDER, DEFAULT_DIR, DEFAULT_FILTERS, emptyMF,
  cycleFilter, matchesMF, matchesMFAny, totalFilterCount, getPerkValues,
  weaponSeasonLabel, bestSeasonNumber, bestSeasonName,
} from '../../lib/weaponFilters';

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchSidebar: React.FC = () => {
  const { loadWeapon, activeWeapon } = useWeaponStore();
  const { weapons, isLoading, error } = useWeaponDb();
  const { data: godRollDb } = useGodRolls();
  const { data: prideDb } = usePride();
  const mode = useWeaponStore((s) => s.mode);

  const [query,         setQuery]         = useState('');
  const [sortMode,      setSortMode]      = useState<SortMode>('alpha');
  const [sortDir,       setSortDir]       = useState<SortDir>('asc');
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [filters,       setFilters]       = useState<FilterState>(DEFAULT_FILTERS);
  const [activeCat,     setActiveCat]     = useState<CategoryId | null>(null);
  const [colSubcat,     setColSubcat]     = useState<MultiKey | null>(null);
  const [searchFocused,       setSearchFocused]       = useState(false);
  const [recentSearches,      setRecentSearches]      = useState<string[]>([]);
  const [recentWeaponHashes,  setRecentWeaponHashes]  = useState<string[]>([]);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
    setRecentWeaponHashes(loadRecentWeaponHashes());
  }, []);

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
  const weaponListRef  = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onEscape: () => { if (query) setQuery(''); if (filterOpen) setFilterOpen(false); },
  });

  const handleLoadWeapon = useCallback((weapon: Parameters<typeof loadWeapon>[0], variants?: Parameters<typeof loadWeapon>[1]) => {
    if (query.trim()) pushRecentSearch(query);
    setRecentWeaponHashes((prev) => pushRecentWeaponHash(weapon.hash, prev));
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
      frame:    sorted(frameSet),
      trait:    sorted(traitSet),
      perkTier: ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
      energy:   ['kinetic', 'solar', 'arc', 'void', 'stasis', 'strand'],
      ammo:     ['Primary', 'Special', 'Heavy'],
      slot:     ['Kinetic', 'Energy', 'Power'],
      rarity:   ['Exotic', 'Legendary', 'Rare', 'Uncommon', 'Common'],
      perk:   sorted(perkSet),
      col1:   sorted(col1Set),
      col2:   sorted(col2Set),
      col3:   sorted(col3Set),
      col4:   sorted(col4Set),
      col5:   sorted(col5Set),
      source:     sorted(sourceSet),
      season:     sorted(seasonSet),
      foundry:    sorted(foundrySet),
      weaponTier: ['S', 'A', 'B', 'C', 'D'],
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

  // Map baseName → tier: Aegis's tiers in PvE, Pride Eternal's in PvP.
  const tierMap = useMemo(() => {
    const m = new Map<string, string>();
    const names = new Set([...Object.keys(godRollDb ?? {}), ...(mode === 'pvp' ? Object.keys(prideDb ?? {}) : [])]);
    for (const name of names) {
      const tier = weaponTier(mode, godRollDb?.[name] ?? null, prideDb?.[name] ?? null);
      if (tier) m.set(name, tier);
    }
    return m;
  }, [godRollDb, prideDb, mode]);

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
      // Perk tier filter — match weapons that have at least one rated perk in a perk column
      if (filters.perkTier.inc.length > 0 || filters.perkTier.exc.length > 0) {
        const perkTiers = d.perkSockets
          .filter(col => col.columnType === 'perk')
          .flatMap(col => col.perks.map(p => p.tier).filter((t): t is string => !!t));
        if (!matchesMFAny(filters.perkTier, perkTiers)) return false;
      }
      if (!matchesMFAny(filters.col1,  perks.cols[0] ?? [])) return false;
      if (!matchesMFAny(filters.col2,  perks.cols[1] ?? [])) return false;
      if (!matchesMFAny(filters.col3,  perks.cols[2] ?? [])) return false;
      if (!matchesMFAny(filters.col4,  perks.cols[3] ?? [])) return false;
      if (!matchesMFAny(filters.col5,  perks.cols[4] ?? [])) return false;

      if (filters.adeptOnly     && !g.variants.some(v => v.isAdept))           return false;
      if (filters.craftableOnly && !g.variants.some(v => v.hasCraftedPattern))  return false;
      if (filters.featured      && !(d.rarity === 'Exotic' || (d.seasonNumber !== null && d.seasonNumber >= 27))) return false;
      if (filters.sunsetOnly    && (d.rarity === 'Exotic' || !(d.seasonNumber !== null && d.seasonNumber <= 12))) return false;

      if (filters.weaponTier.inc.length > 0 || filters.weaponTier.exc.length > 0) {
        const wt = tierMap.get(g.baseName) ?? '';
        if (!matchesMF(filters.weaponTier, wt)) return false;
      }

      return true;
    });

    ranked.sort((a, b) => {
      if (q && a.rank !== b.rank) return a.rank - b.rank;
      let diff: number;
      if (sortMode === 'tier') {
        const ta = TIER_ORDER[tierMap.get(a.g.baseName) ?? ''] ?? 99;
        const tb = TIER_ORDER[tierMap.get(b.g.baseName) ?? ''] ?? 99;
        if (ta !== tb) {
          diff = ta - tb;
        } else {
          const ra = godRollDb?.[a.g.baseName]?.rank ?? 9999;
          const rb = godRollDb?.[b.g.baseName]?.rank ?? 9999;
          diff = ra - rb;
        }
      } else if (sortMode === 'season') {
        const sa = bestSeasonNumber(a.g), sb = bestSeasonNumber(b.g);
        diff = sa !== sb ? sa - sb : a.g.baseName.localeCompare(b.g.baseName);
      } else {
        diff = a.g.baseName.localeCompare(b.g.baseName);
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return ranked.map(({ g }) => g);
  }, [groups, query, filters, sortMode, sortDir, makeRankFn, tierMap, godRollDb]);

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
    ...mkChips('perkTier',   v => `${v}-Tier Perk`),
    ...mkChips('perk',       v => v),
    ...mkChips('col1',       v => `Barrel: ${v}`),
    ...mkChips('col2',       v => `Mag: ${v}`),
    ...mkChips('col3',       v => `P1: ${v}`),
    ...mkChips('col4',       v => `P2: ${v}`),
    ...mkChips('col5',       v => `Origin: ${v}`),
    ...mkChips('source',     v => v.length > 30 ? v.slice(0, 28) + '…' : v),
    ...mkChips('season',     v => v),
    ...mkChips('foundry',    v => v),
    ...mkChips('weaponTier', v => `${v}-Tier`),
    ...(filters.featured      ? [{ label: 'Featured',  isExclude: false, clear: () => handleToggleBool('featured') }]      : []),
    ...(filters.craftableOnly ? [{ label: 'Craftable', isExclude: false, clear: () => handleToggleBool('craftableOnly') }] : []),
    ...(filters.adeptOnly     ? [{ label: 'Adept',     isExclude: false, clear: () => handleToggleBool('adeptOnly') }]     : []),
    ...(filters.sunsetOnly    ? [{ label: 'Sunset',    isExclude: false, clear: () => handleToggleBool('sunsetOnly') }]    : []),
  ];

  const anyFilter = !!(query || activeFilterCount);
  const dirArrow = (m: SortMode) => sortMode === m ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // Recently viewed — only when no search/filters active, resolved from groups
  const recentGroups = useMemo(() => {
    if (anyFilter) return [];
    return recentWeaponHashes
      .map((hash) => groups.find((g) => g.variants.some((v) => v.hash === hash)))
      .filter((g): g is WeaponGroup => !!g);
  }, [anyFilter, recentWeaponHashes, groups]);

  // Virtualizer for the main filtered list (skips recently-viewed which is always short)
  const virtualizer = useVirtualizer({
    count:           filteredGroups.length,
    getScrollElement: () => weaponListRef.current,
    estimateSize:    () => 72, // ~p2 + 56px icon + padding
    overscan:        8,
  });

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
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-amber-500 transition-colors"
              />

              {/* Recent searches dropdown */}
              <AnimatePresence>
              {searchFocused && !query && recentSearches.length > 0 && (
                <motion.div
                  key="recent-searches"
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{ opacity: 0,    y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute top-full left-0 right-0 mt-1 bg-surface border border-white/15 rounded-lg shadow-xl z-50 overflow-hidden">
                  <p className="text-[9px] font-bold text-ink-4 uppercase tracking-widest px-3 pt-2.5 pb-1">Recent</p>
                  {recentSearches.map(term => (
                    <div
                      key={term}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/6 group"
                    >
                      <svg className="w-3 h-3 text-ink-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <button
                        onMouseDown={e => { e.preventDefault(); setQuery(term); }}
                        className="flex-1 text-left text-xs text-ink-3 group-hover:text-ink truncate transition-colors"
                      >
                        {term}
                      </button>
                      <button
                        onMouseDown={e => { e.preventDefault(); removeRecentSearch(term); }}
                        className="shrink-0 text-ink-4 hover:text-ink-3 transition-colors text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => setFilterOpen(v => !v)} title="Filters" aria-expanded={filterOpen}
              className={[
                'shrink-0 w-9 h-9 rounded-md border flex items-center justify-center transition-all relative',
                filterOpen || activeFilterCount > 0
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                  : 'bg-white/5 border-white/10 text-ink-3 hover:text-ink hover:border-white/20',
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
              {(['alpha', 'season', 'tier'] as SortMode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => handleSortClick(m)}
                  className={[
                    'text-[10px] font-bold px-3 py-1.5 transition-colors',
                    i > 0 ? 'border-l border-white/10' : '',
                    sortMode === m ? 'bg-white/10 text-ink' : 'text-ink-4 hover:text-ink-2',
                  ].join(' ')}
                >
                  {m === 'alpha' ? `A–Z${dirArrow('alpha')}` : m === 'season' ? `Season${dirArrow('season')}` : `Tier${dirArrow('tier')}`}
                </button>
              ))}
            </div>
            {anyFilter && (
              <button
                onClick={() => { setQuery(''); setFilters(DEFAULT_FILTERS); setActiveCat(null); setColSubcat(null); }}
                className="text-[10px] text-ink-4 hover:text-amber-400 transition-colors ml-auto"
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

        {/* Filter panel — animated height slide */}
        <AnimatePresence initial={false}>
          {filterOpen && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Weapon list ─────────────────────────────────────────────── */}
      <div ref={weaponListRef} className="flex-1 overflow-y-auto p-2">
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
          <p className="text-ink-4 text-sm text-center mt-8">
            {anyFilter ? 'No weapons match these filters.' : 'No weapons found.'}
          </p>
        )}

        {/* Recently viewed section — rendered outside virtualizer (always short) */}
        {!isLoading && !error && recentGroups.length > 0 && (
          <div className="mb-2 space-y-1">
            <p className="text-[9px] font-bold text-ink-4 uppercase tracking-widest px-2 py-1.5">Recently Viewed</p>
            {recentGroups.map((group) => (
              <WeaponListItem
                key={`recent-${group.baseName}`}
                group={group}
                activeWeapon={activeWeapon}
                onLoad={handleLoadWeapon}
                tier={tierMap.get(group.baseName)}
              />
            ))}
            <div className="border-t border-white/8 mx-2 mt-2 mb-1" />
          </div>
        )}

        {/* Virtualized main list */}
        {!isLoading && !error && filteredGroups.length > 0 && (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((vItem) => (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vItem.start}px)`,
                  paddingBottom: '4px',
                }}
              >
                <WeaponListItem
                  group={filteredGroups[vItem.index]}
                  activeWeapon={activeWeapon}
                  onLoad={handleLoadWeapon}
                  tier={tierMap.get(filteredGroups[vItem.index].baseName)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {weapons.length > 0 && (
        <div className="p-2.5 border-t border-white/10 text-[10px] text-ink-4 text-center">
          {filteredGroups.length} / {groups.length} weapons
        </div>
      )}
    </nav>
  );
};
