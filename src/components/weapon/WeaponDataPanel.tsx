'use client';

import React, { useState } from 'react';
import { MasterworkPanel } from './MasterworkPanel';
import { AmmoPanel } from './AmmoPanel';
import { ArmorModPanel } from './ArmorModPanel';
import { TTKAndFalloffPanel } from '../ui/TTKAndFalloffPanel';
import { SubclassVerbPanel } from './SubclassVerbPanel';
import { DamageProfilePanel } from './DamageProfilePanel';

// ── Panel options ─────────────────────────────────────────────────────────────

type PanelKey =
  | 'masterwork'
  | 'ammo'
  | 'ttk-falloff'
  | 'damage-profile'
  | 'subclass';

interface PanelOption {
  key: PanelKey;
  label: string;
}

const OPTIONS: PanelOption[] = [
  { key: 'masterwork',     label: 'Masterwork & Mods'   },
  { key: 'ammo',           label: 'Ammo'                 },
  { key: 'ttk-falloff',    label: 'TTK & Falloff'        },
  { key: 'damage-profile', label: 'Damage Profile'       },
  { key: 'subclass',       label: 'Subclass Verb Math'   },
];

// ── Chevron icon ──────────────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.937a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeaponDataPanel() {
  const [active, setActive] = useState<PanelKey>('masterwork');
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Collapsible header — no card background, sub-panels provide their own */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3 group"
        aria-expanded={open}
      >
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
          Weapon Data
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-all ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="space-y-3">
          {/* Dropdown selector */}
          <div className="relative">
            <select
              value={active}
              onChange={e => setActive(e.target.value as PanelKey)}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-slate-200 cursor-pointer focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-colors"
            >
              {OPTIONS.map(o => (
                <option key={o.key} value={o.key} className="bg-[#0d0d0d] text-slate-200">
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown />
          </div>

          {/* Panel content */}
          <div>
            {active === 'masterwork' && (
              <div className="space-y-4">
                <MasterworkPanel />
                <ArmorModPanel />
              </div>
            )}
            {active === 'ammo'           && <AmmoPanel />}
            {active === 'ttk-falloff'    && <TTKAndFalloffPanel />}
            {active === 'damage-profile' && <DamageProfilePanel />}
            {active === 'subclass'       && <SubclassVerbPanel />}
          </div>
        </div>
      )}
    </div>
  );
}
