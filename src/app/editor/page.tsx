'use client';

import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWeaponStore, MASTERWORK_STATS } from '../../store/useWeaponStore';
import { useCompareStore } from '../../store/useCompareStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { SearchSidebar } from '../../components/layout/SearchSidebar';
import { WeaponHeader } from '../../components/weapon/WeaponHeader';
import { RollEditor } from '../../components/weapon/RollEditor';
import { EffectsPanel } from '../../components/weapon/EffectsPanel';
import { StatDisplay } from '../../components/weapon/StatDisplay';
import { BuffToggle } from '../../components/ui/BuffToggle';
import { ComparisonGrid } from '../../components/compare/ComparisonGrid';
import { groupWeapons } from '../../lib/weaponGroups';
import { GodRollPanel } from '../../components/weapon/GodRollPanel';
import { WishlistPanel } from '../../components/weapon/WishlistPanel';
import { SimilarWeaponsPanel } from '../../components/weapon/SimilarWeaponsPanel';
import { WeaponDataPanel } from '../../components/weapon/WeaponDataPanel';
import { calculateTTK } from '../../lib/damageMath';
import { MasterworkStat } from '../../store/useWeaponStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      {open ? (
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      )}
    </svg>
  );
}

function Dashboard() {
  const {
    loadWeapon, activeWeapon, activeWeaponHash, selectedPerks, selectPerk,
    getCalculatedStats, getDamageMultiplier, mode, setMode,
    masterworkStat, activeBuffs, setWeaponsStat, weaponsStat,
    setMasterworkStat, toggleBuff, clearRoll,
  } = useWeaponStore();
  const { addSnapshot, snapshots } = useCompareStore();
  const { weapons, isLoading, error, fetchWeapons } = useWeaponDb();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'editor' | 'compare'>('editor');
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<'permalink' | 'dim' | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => setSidebarOpen(true),
    onEscape: () => { if (sidebarOpen) setSidebarOpen(false); },
    onPve: () => setMode('pve'),
    onPvp: () => setMode('pvp'),
    onCompare: () => setActiveTab((t) => (t === 'editor' ? 'compare' : 'editor')),
  });

  // Memoize grouped weapons — only recompute when the weapons array changes.
  const weaponGroups = useMemo(() => groupWeapons(weapons), [weapons]);

  useEffect(() => { fetchWeapons(); }, [fetchWeapons]);
  useEffect(() => { setSidebarOpen(false); }, [activeWeapon?.hash]);

  useEffect(() => {
    if (weapons.length === 0 || activeWeapon || searchParams.get('w')) return;
    // Try to restore the last active weapon from the persisted hash.
    if (activeWeaponHash) {
      const group = weaponGroups.find((g) =>
        g.default.hash === activeWeaponHash ||
        g.variants.some((v) => v.hash === activeWeaponHash)
      );
      if (group) {
        // loadWeapon will restore the saved roll from weaponRolls automatically.
        loadWeapon(group.default, group.variants);
        return;
      }
    }
    // Fallback: first weapon in the list.
    const firstGroup = weaponGroups[0];
    if (firstGroup) loadWeapon(firstGroup.default, firstGroup.variants);
  }, [weapons, activeWeapon, loadWeapon, searchParams, weaponGroups, activeWeaponHash]);

  useEffect(() => {
    const weaponHash  = searchParams.get('w');
    const perkParam   = searchParams.get('p');
    const modeParam   = searchParams.get('m');
    const mwParam     = searchParams.get('mw');
    const wsParam     = searchParams.get('ws');
    const buffsParam  = searchParams.get('b');

    if (!weaponHash || weapons.length === 0) return;
    const found = weapons.find((w) => w.hash === weaponHash);
    if (!found) return;

    const group = weaponGroups.find((g) => g.variants.some((v) => v.hash === weaponHash));
    loadWeapon(found, group?.variants);

    // Restore selected perks
    if (perkParam) {
      const hashes = perkParam.split(',');
      found.perkSockets.forEach((col) =>
        col.perks.forEach((p) => {
          if (hashes.includes(p.hash)) selectPerk(col.name, p.hash);
          // Also check enhanced versions
          if (p.enhancedVersion && hashes.includes(p.enhancedVersion.hash)) {
            selectPerk(col.name, p.enhancedVersion.hash);
          }
        })
      );
    }

    // Restore mode
    if (modeParam === 'pvp' || modeParam === 'pve') setMode(modeParam);

    // Restore masterwork stat — validate against known stat list before casting
    if (mwParam && (MASTERWORK_STATS as readonly string[]).includes(mwParam)) {
      setMasterworkStat(mwParam as MasterworkStat);
    }

    // Restore weapons stat
    if (wsParam) setWeaponsStat(Number(wsParam));

    // Restore active buffs
    if (buffsParam) {
      const toActivate = buffsParam.split(',').filter(Boolean);
      const currentBuffs = useWeaponStore.getState().activeBuffs;
      toActivate.forEach((hash) => {
        if (!currentBuffs.includes(hash)) toggleBuff(hash);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, weapons.length]);

  const buildPermalink = () => {
    if (!activeWeapon) return '';
    const params = new URLSearchParams({ w: activeWeapon.hash });
    const perkHashes = Object.values(selectedPerks);
    if (perkHashes.length) params.set('p', perkHashes.join(','));
    params.set('m', mode);
    if (masterworkStat) params.set('mw', masterworkStat);
    if (weaponsStat !== 0) params.set('ws', String(weaponsStat));
    if (activeBuffs.length) params.set('b', activeBuffs.join(','));
    return `${window.location.origin}${window.location.pathname}?${params}`;
  };

  const handleSharePermalink = () => {
    const url = buildPermalink();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedType('permalink');
      setTimeout(() => setCopiedType(null), 2000);
    });
    setShareOpen(false);
  };

  const handleShareDim = () => {
    if (!activeWeapon) return;

    // Build hash → {socketIndex, isOrigin} lookup
    const hashMeta = new Map<string, { idx: number; isOrigin: boolean }>();
    activeWeapon.perkSockets.forEach((col, i) => {
      const isOrigin = col.columnType === 'origin';
      col.perks.forEach(p => {
        hashMeta.set(p.hash, { idx: i, isOrigin });
        if (p.enhancedVersion) hashMeta.set(p.enhancedVersion.hash, { idx: i, isOrigin });
      });
    });

    // Sort: non-origin perks descending by socket index, then origin perks
    const perkHashes = Object.values(selectedPerks);
    const sorted = [...perkHashes].sort((a, b) => {
      const ma = hashMeta.get(a);
      const mb = hashMeta.get(b);
      const aOrigin = ma?.isOrigin ?? false;
      const bOrigin = mb?.isOrigin ?? false;
      if (aOrigin !== bOrigin) return aOrigin ? 1 : -1;
      return (mb?.idx ?? 0) - (ma?.idx ?? 0);
    });

    let entry = `dimwishlist:item=${activeWeapon.hash}`;
    if (sorted.length) entry += `&perks=${sorted.join(',')}`;
    entry += `\n//notes:${activeWeapon.name} — via D2 Theorycraft`;
    navigator.clipboard.writeText(entry).then(() => {
      setCopiedType('dim');
      setTimeout(() => setCopiedType(null), 2000);
    });
    setShareOpen(false);
  };

  // Close share dropdown on outside click
  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  const handleAddToCompare = () => {
    if (!activeWeapon) return;
    const multiplier = getDamageMultiplier();
    const ttkResult = calculateTTK(mode, activeWeapon, multiplier, 230, 'Minor');
    addSnapshot({
      label: activeWeapon.name,
      weapon: activeWeapon,
      calculatedStats: getCalculatedStats(),
      selectedPerks,
      ttk: ttkResult?.ttk ?? null,
      mode,
      multiplier,
    });
  };

  if (!activeWeapon) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-slate-500 p-8">
        {isLoading && <p role="status" className="text-lg">Loading weapon database...</p>}
        {error && (
          <div className="text-center space-y-3 max-w-md">
            <p className="text-red-400 font-bold text-lg">Failed to load weapons</p>
            <p className="text-slate-400 text-sm font-mono bg-slate-900 p-3 rounded-lg break-all">{error}</p>
            <p className="text-slate-500 text-sm">
              Weapon data is loaded from the static build. Try refreshing — if the problem
              persists the site may need to be redeployed.
            </p>
            <button
              onClick={() => fetchWeapons()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !error && <p className="text-slate-600 text-sm">No weapons found.</p>}
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-slate-200 font-sans flex overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-amber-500 focus:text-slate-950 focus:font-bold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {sidebarOpen && (
        <div aria-hidden="true" className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={[
        'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-72 transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:static md:translate-x-0 md:z-auto md:transition-all md:duration-300',
        sidebarCollapsed ? 'md:w-0' : 'md:w-72',
        'border-r border-white/10 shrink-0 overflow-hidden',
      ].join(' ')}>
        <SearchSidebar />
      </div>

      {/* Desktop sidebar collapse toggle — lives outside the sidebar so it's always reachable */}
      <button
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? 'Expand weapon list' : 'Collapse weapon list'}
        title={sidebarCollapsed ? 'Expand weapon list' : 'Collapse weapon list'}
        className="hidden md:flex self-center shrink-0 items-center justify-center w-4 h-10 text-slate-600 hover:text-slate-300 transition-colors"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Weapon theorycrafting editor"
        className="flex-1 overflow-y-auto overscroll-y-contain min-w-0 focus:outline-none"
      >
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

          {/* ── Top action bar ──────────────────────────── */}
          <header className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar toggle */}
              <button
                aria-label={sidebarOpen ? 'Close weapon database' : 'Open weapon database'}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((o) => !o)}
                className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0 border border-white/10"
              >
                <MenuIcon open={sidebarOpen} />
              </button>

              {/* Editor / Compare tabs */}
              <div role="tablist" aria-label="View mode" className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                {(['editor', 'compare'] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                    className={
                      'px-3 py-1.5 text-sm rounded-md font-medium transition-colors min-h-[44px] flex items-center gap-1.5 capitalize ' +
                      (activeTab === tab ? 'bg-white/10 text-amber-400' : 'text-slate-400 hover:text-slate-200')
                    }
                  >
                    {tab}
                    {tab === 'compare' && snapshots.length > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-xs px-1.5 py-0.5 rounded-full font-bold leading-none">
                        {snapshots.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── PvE / PvP mode toggle ─────────────────── */}
              {activeTab === 'editor' && (
                <div
                  role="group"
                  aria-label="Game mode"
                  className="flex bg-white/5 rounded-lg p-1 border border-white/10"
                >
                  <button
                    onClick={() => setMode('pve')}
                    aria-pressed={mode === 'pve'}
                    className={[
                      'px-4 py-1.5 text-sm rounded-md font-medium transition-colors min-h-[44px]',
                      mode === 'pve'
                        ? 'bg-white/10 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200',
                    ].join(' ')}
                  >
                    PvE
                  </button>
                  <button
                    onClick={() => setMode('pvp')}
                    aria-pressed={mode === 'pvp'}
                    className={[
                      'px-4 py-1.5 text-sm rounded-md font-medium transition-colors min-h-[44px]',
                      mode === 'pvp'
                        ? 'bg-white/10 text-amber-400'
                        : 'text-slate-400 hover:text-slate-200',
                    ].join(' ')}
                  >
                    PvP
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'editor' && (
              <div className="flex items-center gap-2">
                {/* Share dropdown */}
                <div className="relative" ref={shareRef}>
                  <button
                    onClick={() => setShareOpen(v => !v)}
                    aria-label="Share options"
                    aria-expanded={shareOpen}
                    className={[
                      'flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors border min-h-[44px]',
                      copiedType
                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10',
                    ].join(' ')}
                  >
                    {copiedType === 'permalink' ? 'Link copied!' : copiedType === 'dim' ? 'DIM copied!' : 'Share'}
                    {!copiedType && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 text-slate-500 transition-transform ${shareOpen ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.937a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {shareOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#111] border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <button
                        onClick={handleSharePermalink}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/6 transition-colors text-left"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-sky-400 shrink-0 mt-0.5">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Roll Permalink</p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Copies a URL with your full roll state</p>
                        </div>
                      </button>
                      <div className="border-t border-white/8" />
                      <button
                        onClick={handleShareDim}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/6 transition-colors text-left"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">DIM Wishlist Item</p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Copies a wishlist entry to paste into DIM</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Clear all perks, mods, and masterwork for ${activeWeapon.name}?`)) {
                      clearRoll();
                    }
                  }}
                  aria-label="Clear all perks and mods for this weapon"
                  title="Reset perks, mods, and masterwork for this weapon"
                  className="bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors border border-white/10 hover:border-red-500/30 min-h-[44px]"
                >
                  Clear Roll
                </button>
                <button
                  onClick={handleAddToCompare}
                  aria-label={`Save current ${activeWeapon.name} roll to comparison`}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors min-h-[44px]"
                >
                  + Compare
                </button>
              </div>
            )}
          </header>

          {/* ── Editor tab ──────────────────────────────── */}
          <div role="tabpanel" aria-label="Roll editor" hidden={activeTab !== 'editor'}>
            <div key={activeWeapon.hash} className="space-y-6 animate-weapon-in">
              <WeaponHeader />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── Left column (always visible) ───────── */}
                <div className="lg:col-span-6 space-y-6">
                  <RollEditor />

                  {/* PvE — god roll guide, wishlists, effects, buffs */}
                  {mode === 'pve' && (
                    <>
                      <GodRollPanel />
                      <WishlistPanel />
                      <EffectsPanel />
                      <BuffToggle />
                    </>
                  )}

                  {/* PvP — wishlists, effects, buffs */}
                  {mode === 'pvp' && (
                    <>
                      <WishlistPanel />
                      <EffectsPanel />
                      <BuffToggle />
                    </>
                  )}
                </div>

                {/* ── Right column ───────────────────────── */}
                <div className="lg:col-span-6 space-y-6">
                  <StatDisplay />
                  <WeaponDataPanel />
                  <SimilarWeaponsPanel />
                </div>
              </div>
            </div>
          </div>

          {/* ── Compare tab ─────────────────────────────── */}
          <div role="tabpanel" aria-label="Comparison grid" hidden={activeTab !== 'compare'}>
            <ComparisonGrid />
          </div>

        </div>
      </main>
    </div>
  );
}

export default function TheorycraftDashboard() {
  return (
    <Suspense fallback={
      <div role="status" aria-label="Loading" className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center">
        Loading...
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
