'use client';

import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import { useSiteSettings, SiteSettings, BadgeStyle, AppTheme } from '../../store/useSiteSettings';

// ── Sub-components ────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={[
        'relative w-11 h-6 md:w-8 md:h-4 rounded-full transition-colors shrink-0',
        on ? 'bg-amber-500' : 'bg-white/15',
      ].join(' ')}
    >
      <span className={[
        'absolute left-0 top-0.5 w-5 h-5 md:w-3 md:h-3 rounded-full bg-[#fff] transition-transform shadow-sm',
        on ? 'translate-x-[22px] md:translate-x-[18px]' : 'translate-x-0.5',
      ].join(' ')} />
    </button>
  );
}

function SegmentControl<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex bg-white/5 rounded-md p-0.5 border border-white/10 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-1.5 md:px-2 md:py-0.5 text-xs md:text-2xs font-semibold rounded transition-colors',
            value === o.value
              ? 'bg-amber-500/25 text-amber-300'
              : 'text-ink-4 hover:text-ink-2',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-4 pt-3 md:pt-2 pb-1 text-2xs font-semibold text-ink-4 uppercase tracking-widest">
      {label}
    </p>
  );
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 md:py-1.5 hover:bg-white/4 transition-colors">
      <span className="text-sm md:text-xs text-ink-2">{label}</span>
      <ToggleSwitch on={value} onChange={onChange} />
    </div>
  );
}

function SegmentRow<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:py-1.5">
      <span className="text-sm md:text-xs text-ink-2 shrink-0">{label}</span>
      <SegmentControl value={value} onChange={onChange} options={options} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/** The settings rows only (no popover chrome) — shared by the desktop popover and the mobile sheet. */
export function SettingsBody() {
  const store = useSiteSettings();
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => store.setSetting(k, v);

  return (
    <div className="py-2">
      {/* Appearance */}
      <SectionLabel label="Appearance" />
      <SegmentRow<AppTheme>
        label="Theme"
        value={store.theme}
        onChange={(v) => set('theme', v)}
        options={[
          { value: 'dark',   label: 'Dark'   },
          { value: 'system', label: 'System' },
          { value: 'light',  label: 'Light'  },
        ]}
      />
      <SegmentRow<BadgeStyle>
        label="Tier badge"
        value={store.tierBadgeStyle}
        onChange={(v) => set('tierBadgeStyle', v)}
        options={[
          { value: 'pill',   label: 'Pill'   },
          { value: 'letter', label: 'Letter' },
          { value: 'dot',    label: 'Dot'    },
        ]}
      />

      {/* Defaults */}
      <SectionLabel label="Defaults" />
      <SegmentRow<'pve' | 'pvp'>
        label="Default mode"
        value={store.defaultMode}
        onChange={(v) => set('defaultMode', v)}
        options={[
          { value: 'pve', label: 'PvE' },
          { value: 'pvp', label: 'PvP' },
        ]}
      />

      {/* Editing */}
      <SectionLabel label="Editing" />
      <ToggleRow label="In-app tier editing"  value={store.inAppTierEditing} onChange={(v) => set('inAppTierEditing', v)} />
      <ToggleRow label="Auto-apply god roll"  value={store.autoApplyGodRoll} onChange={(v) => set('autoApplyGodRoll', v)} />

      {/* Panels */}
      <SectionLabel label="Panels" />
      <ToggleRow label="God Roll"       value={store.showGodRollPanel}   onChange={(v) => set('showGodRollPanel', v)} />
      <ToggleRow label="Wishlists & Saved Rolls" value={store.showWishlistPanel}  onChange={(v) => set('showWishlistPanel', v)} />
      <ToggleRow label="Perk Effects"   value={store.showEffectsPanel}   onChange={(v) => set('showEffectsPanel', v)} />
      <ToggleRow label="External Buffs" value={store.showExternalBuffs}  onChange={(v) => set('showExternalBuffs', v)} />
      <ToggleRow label="Similar Weapons"value={store.showSimilarWeapons} onChange={(v) => set('showSimilarWeapons', v)} />
      <ToggleRow label="Weapon Data"    value={store.showWeaponData}     onChange={(v) => set('showWeaponData', v)} />
      <ToggleRow label="Tier Lists"     value={store.showTierListPanel}  onChange={(v) => set('showTierListPanel', v)} />

      {/* About */}
      <SectionLabel label="About" />
      <Link
        href="/credits"
        className="flex items-center justify-between px-3 py-2 text-sm text-ink-3 hover:text-amber-400 transition-colors"
      >
        Sources &amp; credits
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Site settings"
        aria-expanded={open}
        title="Site settings"
        className={[
          'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors',
          open
            ? 'bg-white/10 border-white/20 text-ink'
            : 'bg-white/5 border-white/10 text-ink-4 hover:text-ink-2 hover:border-white/20',
        ].join(' ')}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-xs font-semibold text-ink-2">Settings</p>
          </div>
          <div className="max-h-[80vh] overflow-y-auto">
            <SettingsBody />
          </div>
        </div>
      )}
    </div>
  );
}
