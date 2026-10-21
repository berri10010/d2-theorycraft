'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MasterworkPanel } from './MasterworkPanel';
import { AmmoPanel } from './AmmoPanel';
import { ArmorModPanel } from './ArmorModPanel';
import { TTKAndFalloffPanel } from '../ui/TTKAndFalloffPanel';
import { SubclassVerbPanel } from './SubclassVerbPanel';
import { DpsPanel } from './DpsPanel';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';

// ── Panel options ─────────────────────────────────────────────────────────────

type PanelKey = 'masterwork' | 'ammo' | 'ttk-falloff' | 'dps' | 'subclass';

interface TabDef {
  key: PanelKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'masterwork', label: 'Mods' },
  { key: 'ammo',       label: 'Ammo'       },
  { key: 'ttk-falloff', label: 'TTK'       },
  { key: 'dps',        label: 'DPS'        },
  { key: 'subclass',   label: 'Subclass'   },
];

// ── Main component ────────────────────────────────────────────────────────────

export function WeaponDataPanel() {
  const [active, setActive] = useState<PanelKey>('masterwork');

  return (
    <CollapsiblePanel
      storageKey="weapon-data"
      title={
        <div>
          <div>Weapon Data</div>
          <p className="text-xs text-ink-4 mt-0.5 font-normal">Masterwork and mods, ammo, time to kill and DPS</p>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Tab strip */}
        <div className="flex gap-1 flex-wrap" role="tablist" aria-label="Weapon data">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={[
                'text-xs font-semibold px-3 py-2.5 md:py-1.5 rounded-lg border transition-all',
                active === tab.key
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                  : 'bg-white/5 text-ink-3 border-white/10 hover:border-white/20 hover:text-ink',
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
    </CollapsiblePanel>
  );
}
