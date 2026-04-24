'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MasterworkPanel } from './MasterworkPanel';
import { AmmoPanel } from './AmmoPanel';
import { ArmorModPanel } from './ArmorModPanel';
import { TTKAndFalloffPanel } from '../ui/TTKAndFalloffPanel';
import { SubclassVerbPanel } from './SubclassVerbPanel';
import { DpsPanel } from './DpsPanel';

// ── Panel options ─────────────────────────────────────────────────────────────

type PanelKey = 'masterwork' | 'ammo' | 'ttk-falloff' | 'dps' | 'subclass';

interface TabDef {
  key: PanelKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'masterwork', label: 'Masterwork' },
  { key: 'ammo',       label: 'Ammo'       },
  { key: 'ttk-falloff', label: 'TTK'       },
  { key: 'dps',        label: 'DPS'        },
  { key: 'subclass',   label: 'Subclass'   },
];

// ── Main component ────────────────────────────────────────────────────────────

export function WeaponDataPanel() {
  const [active, setActive] = useState<PanelKey>('masterwork');
  const [open, setOpen]     = useState(true);

  return (
    <div>
      {/* Collapsible section header */}
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
          className={`w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
          {/* Tab strip */}
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={[
                  'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                  active === tab.key
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content — cross-fade on tab switch */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
            >
              {active === 'masterwork' && (
                <div className="space-y-4">
                  <MasterworkPanel />
                  <ArmorModPanel />
                </div>
              )}
              {active === 'ammo'        && <AmmoPanel />}
              {active === 'ttk-falloff' && <TTKAndFalloffPanel />}
              {active === 'dps'         && <DpsPanel />}
              {active === 'subclass'    && <SubclassVerbPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
