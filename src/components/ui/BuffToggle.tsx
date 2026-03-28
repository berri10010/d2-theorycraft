'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff } from '../../lib/buffDatabase';
import { Perk } from '../../types/weapon';

const BUNGIE_ROOT = 'https://www.bungie.net';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctStr(multiplier: number): string {
  return `+${(multiplier * 100 - 100).toFixed(0)}%`;
}

// ─── Icon resolvers ───────────────────────────────────────────────────────────

/**
 * For weapon_perk buffs: pull the 24×24 icon from the matching selected perk.
 * For subclass/mod buffs: use buff.icon if it exists.
 */
function BuffIcon({
  buff,
  linkedPerk,
}: {
  buff: DamageBuff;
  linkedPerk: Perk | null;
}) {
  const iconPath = buff.category === 'weapon_perk'
    ? (linkedPerk?.icon ?? null)
    : (buff.icon ?? null);

  if (!iconPath) {
    // Fallback: small category-coloured dot
    const dotColor =
      buff.category === 'subclass' ? 'bg-amber-400' :
      buff.category === 'mod'      ? 'bg-purple-400' : 'bg-blue-400';
    return <span className={`shrink-0 w-5 h-5 rounded ${dotColor}/20 border border-${dotColor}/30 flex items-center justify-center`} />;
  }

  const src = iconPath.startsWith('http') ? iconPath : BUNGIE_ROOT + iconPath;

  return (
    <div className="shrink-0 w-6 h-6 rounded overflow-hidden bg-white/5 border border-white/10">
      <Image
        src={src}
        alt=""
        width={24}
        height={24}
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  );
}

// ─── Buff button ──────────────────────────────────────────────────────────────

interface BuffButtonProps {
  buff: DamageBuff;
  isActive: boolean;
  isLinkedToPerk: boolean;
  linkedPerk: Perk | null;
  onToggle: () => void;
}

function BuffButton({ buff, isActive, isLinkedToPerk, linkedPerk, onToggle }: BuffButtonProps) {
  return (
    <button
      onClick={onToggle}
      title={buff.description}
      className={[
        'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border text-left w-full',
        isActive
          ? isLinkedToPerk
            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
          : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200',
      ].join(' ')}
    >
      {/* Bungie icon */}
      <BuffIcon buff={buff} linkedPerk={linkedPerk} />

      {/* Active indicator dot */}
      <span className={[
        'shrink-0 w-1.5 h-1.5 rounded-full',
        isActive
          ? isLinkedToPerk ? 'bg-emerald-400' : 'bg-amber-400'
          : 'bg-white/15',
      ].join(' ')} />

      <span className="flex-1 truncate text-xs">{buff.name}</span>

      {isLinkedToPerk && isActive && (
        <span className="shrink-0 text-[8px] font-bold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded border border-emerald-500/30 leading-none">
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

  // Build a map: buffKey → linked Perk (for icon resolution)
  const linkedPerkByBuffKey = new Map<string, Perk>();
  const linkedBuffKeys = new Set<string>();

  if (activeWeapon) {
    for (const [colName, perkHash] of Object.entries(selectedPerks)) {
      const col = activeWeapon.perkSockets.find((c) => c.name === colName);
      if (!col) continue;

      const basePerk = col.perks.find((p) => p.hash === perkHash);
      if (basePerk?.buffKey) {
        linkedBuffKeys.add(basePerk.buffKey);
        linkedPerkByBuffKey.set(basePerk.buffKey, basePerk);
      }

      // Enhanced version selected
      for (const p of col.perks) {
        if (p.enhancedVersion?.hash === perkHash) {
          const enh = p.enhancedVersion;
          if (enh.buffKey) {
            linkedBuffKeys.add(enh.buffKey);
            linkedPerkByBuffKey.set(enh.buffKey, enh);
          }
        }
      }
    }
  }

  const allBuffs = Object.values(BUFF_DATABASE);

  const linkedPerkBuffs = allBuffs.filter(
    (b) => b.category === 'weapon_perk' && linkedBuffKeys.has(b.hash)
  );
  const otherPerkBuffs = allBuffs.filter(
    (b) => b.category === 'weapon_perk' && !linkedBuffKeys.has(b.hash)
  );
  const subclassBuffs = allBuffs.filter((b) => b.category === 'subclass');
  const modBuffs      = allBuffs.filter((b) => b.category === 'mod');

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

        {/* ── Perk-linked buffs (dynamic) ── */}
        {linkedPerkBuffs.length > 0 ? (
          <div>
            <SectionLabel label="Perk Buffs" count={linkedPerkBuffs.filter((b) => activeBuffs.includes(b.hash)).length} />
            <div className="space-y-1.5">
              {linkedPerkBuffs.map((buff) => (
                <BuffButton
                  key={buff.hash}
                  buff={buff}
                  isActive={activeBuffs.includes(buff.hash)}
                  isLinkedToPerk={true}
                  linkedPerk={linkedPerkByBuffKey.get(buff.hash) ?? null}
                  onToggle={() => toggleBuff(buff.hash)}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              <span className="text-emerald-500">AUTO</span> = buff auto-toggled when perk is selected.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/8 p-3 text-center">
            <p className="text-xs text-slate-600">Select a damage-boosting perk to see it here.</p>
          </div>
        )}

        {/* ── Subclass / Super ── */}
        <div>
          <SectionLabel label="Subclass & Super" />
          <div className="space-y-1.5">
            {subclassBuffs.map((buff) => (
              <BuffButton
                key={buff.hash}
                buff={buff}
                isActive={activeBuffs.includes(buff.hash)}
                isLinkedToPerk={false}
                linkedPerk={null}
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
                linkedPerk={null}
                onToggle={() => toggleBuff(buff.hash)}
              />
            ))}
          </div>
        </div>

        {/* ── Other weapon perk buffs (collapsible) ── */}
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
                    linkedPerk={null}
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
