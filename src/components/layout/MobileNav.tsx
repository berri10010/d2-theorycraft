'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import { SettingsBody } from '../ui/SettingsPanel';

/**
 * Phone-first chrome for the editor (hidden at md+, where the desktop header
 * and sidebar take over):
 *   - MobileTopBar:    sticky weapon switcher + PvE/PvP
 *   - MobileBottomNav: thumb-reach primary actions
 *   - MobileMoreSheet: share / clear / settings in a bottom sheet
 */

type Tab = 'editor' | 'compare';
type Mode = 'pve' | 'pvp';

// ── Icons ────────────────────────────────────────────────────────────────────

const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: 'w-6 h-6' } as const;

const ListIcon    = () => <svg {...iconProps}><path d="M4 6h16M4 12h16M4 18h10" /></svg>;
const SlidersIcon = () => <svg {...iconProps}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
const ColumnsIcon = () => <svg {...iconProps}><rect x="4" y="4" width="7" height="16" rx="1.5" /><rect x="13" y="4" width="7" height="16" rx="1.5" /></svg>;
const PlusIcon    = () => <svg {...iconProps} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>;
const MoreIcon    = () => <svg {...iconProps}><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></svg>;
const LinkIcon    = () => <svg {...iconProps}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>;
const StarIcon    = () => <svg {...iconProps}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>;
const TrashIcon   = () => <svg {...iconProps}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></svg>;
const GearIcon    = () => <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
const ChevronRight = () => <svg {...iconProps} className="w-4 h-4"><path d="M9 6l6 6-6 6" /></svg>;
const ChevronLeft  = () => <svg {...iconProps} className="w-5 h-5"><path d="M15 6l-6 6 6 6" /></svg>;
const ChevronDown  = () => <svg {...iconProps} className="w-4 h-4"><path d="M6 9l6 6 6-6" /></svg>;

// ── Top bar ──────────────────────────────────────────────────────────────────

interface TopBarProps {
  activeTab: Tab;
  weapon: { name: string; icon: string; itemTypeDisplayName: string; variantLabel: string | null };
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onOpenWeapons: () => void;
}

export function MobileTopBar({ activeTab, weapon, mode, onModeChange, onOpenWeapons }: TopBarProps) {
  return (
    <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-3 bg-black/85 backdrop-blur-md border-b border-white/10">
      {activeTab === 'editor' ? (
        <>
          <button
            onClick={onOpenWeapons}
            aria-label={`Change weapon — currently ${weapon.name}`}
            className="flex-1 min-w-0 flex items-center gap-2.5 h-11 rounded-xl pl-1 pr-2 text-left active:bg-white/5"
          >
            <span className="relative w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-white/15 bg-white/5">
              <Image src={BUNGIE_URL + weapon.icon} alt="" fill sizes="36px" className="object-cover" unoptimized />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white leading-tight">{weapon.name}</span>
              <span className="block truncate text-[11px] text-ink-4 leading-tight">
                {weapon.itemTypeDisplayName}{weapon.variantLabel ? ` · ${weapon.variantLabel}` : ''}
              </span>
            </span>
            <span className="text-ink-4 shrink-0"><ChevronDown /></span>
          </button>

          <div role="group" aria-label="Game mode" className="flex shrink-0 bg-white/5 rounded-xl p-0.5 border border-white/10">
            {(['pve', 'pvp'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                aria-pressed={mode === m}
                className={[
                  'h-10 px-3.5 text-xs font-bold rounded-[10px] uppercase transition-colors',
                  mode === m ? 'bg-amber-500/20 text-amber-400' : 'text-ink-4',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </>
      ) : (
        <h1 className="flex-1 text-base font-bold text-white px-1">Compare</h1>
      )}
    </div>
  );
}

// ── Bottom nav ───────────────────────────────────────────────────────────────

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  compareCount: number;
  onOpenWeapons: () => void;
  onAddToCompare: () => void;
  onOpenMore: () => void;
  moreOpen: boolean;
}

export function MobileBottomNav({ activeTab, onTabChange, compareCount, onOpenWeapons, onAddToCompare, onOpenMore, moreOpen }: BottomNavProps) {
  const item = 'relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[10px] font-semibold transition-colors active:bg-white/5';
  const idle = 'text-ink-4';
  const active = 'text-amber-400';

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-surface-2/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <button onClick={onOpenWeapons} className={`${item} ${idle}`}>
        <ListIcon />
        Weapons
      </button>

      <button onClick={() => onTabChange('editor')} aria-current={activeTab === 'editor' ? 'page' : undefined} className={`${item} ${activeTab === 'editor' ? active : idle}`}>
        <SlidersIcon />
        Editor
      </button>

      <button onClick={onAddToCompare} aria-label="Save current roll to comparison" className={`${item} text-slate-950`}>
        <span className="flex items-center justify-center w-12 h-12 -mt-5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/25 ring-4 ring-surface-2 active:scale-95 transition-transform">
          <PlusIcon />
        </span>
        <span className="text-amber-400 -mt-0.5">Save</span>
      </button>

      <button onClick={() => onTabChange('compare')} aria-current={activeTab === 'compare' ? 'page' : undefined} className={`${item} ${activeTab === 'compare' ? active : idle}`}>
        <span className="relative">
          <ColumnsIcon />
          {compareCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold leading-4 text-center">
              {compareCount}
            </span>
          )}
        </span>
        Compare
      </button>

      <button onClick={onOpenMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={`${item} ${moreOpen ? active : idle}`}>
        <MoreIcon />
        More
      </button>
    </nav>
  );
}

// ── "Copied" toast ───────────────────────────────────────────────────────────

export function MobileToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 px-4 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-semibold backdrop-blur-md shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── More sheet ───────────────────────────────────────────────────────────────

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  onSharePermalink: () => void;
  onShareDim: () => void;
  onClear: () => void;
  clearPending: boolean;
}

function SheetRow({ icon, title, hint, onClick, danger, trailing }: {
  icon: React.ReactNode; title: string; hint?: string; onClick: () => void; danger?: boolean; trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-4 px-5 min-h-[60px] text-left active:bg-white/5 transition-colors',
        danger ? 'text-red-400' : 'text-ink',
      ].join(' ')}
    >
      <span className={danger ? 'text-red-400' : 'text-ink-3'}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold leading-tight">{title}</span>
        {hint && <span className="block text-xs text-ink-4 mt-0.5 leading-tight">{hint}</span>}
      </span>
      {trailing}
    </button>
  );
}

export function MobileMoreSheet({ open, onClose, onSharePermalink, onShareDim, onClear, clearPending }: MoreSheetProps) {
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const controls = useDragControls();

  // Always reopen on the main menu; close on Escape.
  useEffect(() => { if (open) setView('menu'); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <motion.div
            key="sheet-backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={view === 'menu' ? 'More actions' : 'Settings'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) onClose(); }}
            className="absolute bottom-0 inset-x-0 max-h-[88dvh] flex flex-col bg-surface border-t border-white/15 rounded-t-3xl shadow-2xl"
          >
            {/* Drag handle + header */}
            <div onPointerDown={(e) => controls.start(e)} className="shrink-0 touch-none cursor-grab pt-2.5 pb-1">
              <div className="mx-auto w-10 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center h-12 px-3">
                {view === 'settings' ? (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setView('menu')}
                    aria-label="Back"
                    className="flex items-center justify-center w-11 h-11 -ml-1 text-ink-3 active:text-white"
                  >
                    <ChevronLeft />
                  </button>
                ) : null}
                <h2 className={`text-base font-bold text-white ${view === 'settings' ? '' : 'px-2'}`}>
                  {view === 'menu' ? 'More' : 'Settings'}
                </h2>
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+12px)]">
              {view === 'menu' ? (
                <div className="divide-y divide-white/5">
                  <SheetRow icon={<LinkIcon />} title="Copy roll link" hint="A URL with your full roll state" onClick={onSharePermalink} />
                  <SheetRow icon={<StarIcon />} title="Copy DIM wishlist entry" hint="Paste straight into DIM" onClick={onShareDim} />
                  <SheetRow
                    icon={<TrashIcon />}
                    title={clearPending ? 'Tap again to confirm' : 'Clear roll'}
                    hint={clearPending ? 'This resets perks, mods and masterwork' : 'Reset perks, mods and masterwork'}
                    onClick={onClear}
                    danger
                  />
                  <SheetRow icon={<GearIcon />} title="Settings" hint="Theme, panels, defaults" onClick={() => setView('settings')} trailing={<span className="text-ink-4"><ChevronRight /></span>} />
                </div>
              ) : (
                <SettingsBody />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
