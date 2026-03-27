'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWeaponStore } from '../store/useWeaponStore';
import { useCompareStore } from '../store/useCompareStore';
import { useWeaponDb } from '../store/useWeaponDb';
import { SearchSidebar } from '../components/layout/SearchSidebar';
import { RollEditor } from '../components/weapon/RollEditor';
import { StatDisplay } from '../components/weapon/StatDisplay';
import { BuffToggle } from '../components/ui/BuffToggle';
import { TTKPanel } from '../components/ui/TTKPanel';
import { ComparisonGrid } from '../components/compare/ComparisonGrid';
import { calculateTTK } from '../lib/damageMath';

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
  const { loadWeapon, activeWeapon, selectedPerks, selectPerk, getCalculatedStats, getDamageMultiplier, mode } = useWeaponStore();
  const { addSnapshot, snapshots } = useCompareStore();
  const { weapons, fetchWeapons } = useWeaponDb();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'editor' | 'compare'>('editor');
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch weapon database on mount
  useEffect(() => { fetchWeapons(); }, [fetchWeapons]);

  // Close sidebar when weapon changes
  useEffect(() => { setSidebarOpen(false); }, [activeWeapon?.hash]);

  // Auto-select first weapon once the database loads (if none active)
  useEffect(() => {
    if (weapons.length > 0 && !activeWeapon && !searchParams.get('w')) {
      loadWeapon(weapons[0]);
    }
  }, [weapons, activeWeapon, loadWeapon, searchParams]);

  // URL-based weapon/perk loading
  useEffect(() => {
    const weaponHash = searchParams.get('w');
    const perkParam  = searchParams.get('p');
    if (!weaponHash || weapons.length === 0) return;

    const found = weapons.find((w) => w.hash === weaponHash);
    if (!found) return;

    loadWeapon(found);
    if (perkParam) {
      const hashes = perkParam.split(',');
      found.perkSockets.forEach((col) =>
        col.perks.forEach((p) => {
          if (hashes.includes(p.hash)) selectPerk(col.name, p.hash);
        })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, weapons.length]);

  const handleShare = () => {
    if (!activeWeapon) return;
    const params = new URLSearchParams({ w: activeWeapon.hash });
    const perkHashes = Object.values(selectedPerks);
    if (perkHashes.length) params.set('p', perkHashes.join(','));
    navigator.clipboard
      .writeText(`${window.location.origin}${window.location.pathname}?${params}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleAddToCompare = () => {
    if (!activeWeapon) return;
    const ttkResult = calculateTTK(mode, activeWeapon.itemSubType, activeWeapon.rpm, getDamageMultiplier(), 0, 336);
    addSnapshot({
      label: activeWeapon.name,
      weapon: activeWeapon,
      calculatedStats: getCalculatedStats(),
      selectedPerks,
      ttk: ttkResult?.ttk ?? null,
      mode,
    });
  };

  if (!activeWeapon) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        <p role="status">Loading...</p>
      </div>
    );
  }

  const damageLabel = activeWeapon.damageType.charAt(0).toUpperCase() + activeWeapon.damageType.slice(1);

  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
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
        'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:static md:translate-x-0 md:z-auto md:transition-none',
        'border-r border-slate-800 shrink-0 overflow-hidden',
      ].join(' ')}>
        <SearchSidebar />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Weapon theorycrafting editor"
        className="flex-1 overflow-y-auto overscroll-y-contain min-w-0 focus:outline-none"
      >
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
          <header className="border-b border-slate-800 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  aria-label={sidebarOpen ? 'Close weapon database' : 'Open weapon database'}
                  aria-expanded={sidebarOpen}
                  onClick={() => setSidebarOpen((o) => !o)}
                  className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors shrink-0"
                >
                  <MenuIcon open={sidebarOpen} />
                </button>

                {activeWeapon.icon && (
                  <img
                    src={`https://www.bungie.net${activeWeapon.icon}`}
                    alt={`${activeWeapon.name} icon`}
                    width={56} height={56}
                    className="w-12 h-12 md:w-14 md:h-14 rounded border border-slate-700 shrink-0"
                  />
                )}

                <div className="min-w-0">
                  <h1 className="text-xl md:text-3xl font-bold text-amber-500 truncate">
                    {activeWeapon.name}
                  </h1>
                  <p className="text-slate-400 text-xs md:text-sm">
                    {activeWeapon.itemTypeDisplayName}
                    {activeWeapon.rpm > 0 && ` · ${activeWeapon.rpm} RPM`}
                    {` · ${damageLabel}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div role="tablist" aria-label="View mode" className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  {(['editor', 'compare'] as const).map((tab) => (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className={
                        'px-3 py-1.5 text-sm rounded-md font-medium transition-colors min-h-[44px] flex items-center gap-1.5 capitalize ' +
                        (activeTab === tab ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200')
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

                {activeTab === 'editor' && (
                  <>
                    <button
                      onClick={handleShare}
                      aria-label="Copy share link to clipboard"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors border border-slate-700 min-h-[44px]"
                    >
                      {copied ? 'Copied!' : 'Share'}
                    </button>
                    <button
                      onClick={handleAddToCompare}
                      aria-label={`Save current ${activeWeapon.name} roll to comparison`}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors min-h-[44px]"
                    >
                      + Compare
                    </button>
                  </>
                )}
              </div>
            </div>
          </header>

          <div role="tabpanel" aria-label="Roll editor" hidden={activeTab !== 'editor'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-6">
                <RollEditor />
                <BuffToggle />
              </div>
              <div className="lg:col-span-5 space-y-6">
                <StatDisplay />
                <TTKPanel />
              </div>
            </div>
          </div>

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
