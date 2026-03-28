'use client';

import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff } from '../../lib/buffDatabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pctStr(multiplier: number): string {
  return `+${(multiplier * 100 - 100).toFixed(0)}%`;
}

// ─── Individual buff button ───────────────────────────────────────────────────

interface BuffButtonProps {
  buff: DamageBuff;
  isActive: boolean;
  isLinkedToPerk: boolean; // buff was triggered by a selected perk
  onToggle: () => void;
}

function BuffButton({ buff, isActive, isLinkedToPerk, onToggle }: BuffButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={buff.description}
      className={[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border text-left w-full',
        isActive
          ? isLinkedToPerk
            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
          : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200',
      ].join(' ')}
    >
      {/* Active indicator dot */}
      <span className={[
        'shrink-0 w-2 h-2 rounded-full border',
        isActive
          ? isLinkedToPerk
            ? 'bg-emerald-400 border-emerald-400'
            : 'bg-amber-400 border-amber-400'
          : 'bg-transparent border-white/20',
      ].join(' ')} />

      <span className="flex-1 truncate">{buff.name}</span>

      {isLinkedToPerk && isActive && (
        <span className="shrink-0 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded border border-emerald-500/30 leading-none">
          AUTO
        </span>
      )}

      <span className={[
        'shrink-0 text-xs font-bold tabular-nums',
        isActive ? (isLinkedToPerk ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-600',
      ].join(' ')}>
        {pctStr(buff.multiplier)}
      </span>
    </button>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full leading-none">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const BuffToggle: React.FC = () => {
  const { activeBuffs, toggleBuff, selectedPerks, activeWeapon } = useWeaponStore();
  const [showOtherPerks, setShowOtherPerks] = useState(false);

  // Collect buff keys linked to currently-selected perks
  // Also handle enhanced perks: look at both base and enhanced version
  const linkedBuffKeys = new Set<string>();
  if (activeWeapon) {
    for (const [colName, perkHash] of Object.entries(selectedPerks)) {
      const col = activeWeapon.perkSockets.find((c) => c.name === colName);
      if (!col) continue;
      // Check base perk
      const basePerk = col.perks.find((p) => p.hash === perkHash);
      if (basePerk?.buffKey) linkedBuffKeys.add(basePerk.buffKey);
      // Check enhanced version (in case an enhanced perk is selected)
      for (const p of col.perks) {
        if (p.enhancedVersion?.hash === perkHash && p.enhancedVersion.buffKey) {
          linkedBuffKeys.add(p.enhancedVersion.buffKey);
        }
      }
    }
  }

  const allBuffs = Object.values(BUFF_DATABASE);

  // Weapon perk buffs linked to current roll — surfaced prominently
  const linkedPerkBuffs = allBuffs.filter(
    (b) => b.category === 'weapon_perk' && linkedBuffKeys.has(b.hash)
  );

  // Weapon perk buffs NOT linked to current roll — hidden behind "More" toggle
  const otherPerkBuffs = allBuffs.filter(
    (b) => b.category === 'weapon_perk' && !linkedBuffKeys.has(b.hash)
  );

  // Subclass buffs — always shown
  const subclassBuffs = allBuffs.filter((b) => b.category === 'subclass');

  // Mod buffs — always shown
  const modBuffs = allBuffs.filter((b) => b.category === 'mod');

  // Count active buffs for header
  const activeCount = activeBuffs.length;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Active Buffs</h2>
        {activeCount > 0 && (
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            {activeCount} active
          </span>
        )}
      </div>

      <div className="space-y-5">

        {/* ── Weapon Perk Buffs (dynamic, perk-linked) ── */}
        {linkedPerkBuffs.length > 0 && (
          <div>
            <SectionLabel label="Perk Buffs" count={linkedPerkBuffs.filter((b) => activeBuffs.includes(b.hash)).length} />
            <div className="space-y-1.5">
              {linkedPerkBuffs.map((buff) => (
                <BuffButton
                  key={buff.hash}
                  buff={buff}
                  isActive={activeBuffs.includes(buff.hash)}
                  isLinkedToPerk={true}
                  onToggle={() => toggleBuff(buff.hash)}
                />
              ))}
            </div>
            {linkedPerkBuffs.length > 0 && (
              <p className="text-[10px] text-slate-600 mt-1.5">
                <span className="text-emerald-500">AUTO</span> = buff auto-toggled when perk is selected. Click to override.
              </p>
            )}
          </div>
        )}

        {/* Placeholder when no perk buffs are linked */}
        {linkedPerkBuffs.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/8 p-3 text-center">
            <p className="text-xs text-slate-600">Select a damage-boosting perk in the roll editor to see it here.</p>
          </div>
        )}

        {/* ── Subclass / Empowering ── */}
        <div>
          <SectionLabel label="Subclass & Super" />
          <div className="space-y-1.5">
            {subclassBuffs.map((buff) => (
              <BuffButton
                key={buff.hash}
                buff={buff}
                isActive={activeBuffs.includes(buff.hash)}
                isLinkedToPerk={false}
                onToggle={() => toggleBuff(buff.hash)}
              />
            ))}
          </div>
        </div>

        {/* ── Armor Mods ── */}
        <div>
          <SectionLabel label="Armor Mods" />
          <div className="space-y-1.5">
            {modBuffs.map((buff) => (
              <BuffButton
                key={buff.hash}
                buff={buff}
                isActive={activeBuffs.includes(buff.hash)}
                isLinkedToPerk={false}
                onToggle={() => toggleBuff(buff.hash)}
              />
            ))}
          </div>
        </div>

        {/* ── Other Weapon Perks (collapsible) ── */}
        {otherPerkBuffs.length > 0 && (
          <div>
            <button
              onClick={() => setShowOtherPerks((v) => !v)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                Other Perk Buffs
              </span>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">
                {showOtherPerks ? '▲' : '▼'} {otherPerkBuffs.length}
              </span>
            </button>
            {showOtherPerks && (
              <div className="space-y-1.5 mt-2">
                {otherPerkBuffs.map((buff) => (
                  <BuffButton
                    key={buff.hash}
                    buff={buff}
                    isActive={activeBuffs.includes(buff.hash)}
                    isLinkedToPerk={false}
                    onToggle={() => toggleBuff(buff.hash)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
