'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff, getBuffMultiplier } from '../../lib/buffDatabase';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';

// Pre-computed buff lists — static since BUFF_DATABASE is module-level.
// Weapon-perk buffs (category: 'weapon_perk') are now handled exclusively by
// the Effects Tab in EffectsPanel — they are intentionally excluded here to
// prevent duplication and confusion.
const _allBuffs        = Object.values(BUFF_DATABASE);
const _empoweringBuffs = _allBuffs.filter((b) => b.stackType === 'empowering');
const _debuffBuffs     = _allBuffs.filter((b) => b.stackType === 'debuff');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctStr(multiplier: number): string {
  return `+${(multiplier * 100 - 100).toFixed(0)}%`;
}
function multStr(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function BuffIcon({ buff }: { buff: DamageBuff }) {
  const iconPath = buff.icon ?? null;

  if (!iconPath) {
    const dotClass =
      buff.stackType === 'empowering'
        ? 'bg-amber-400/20 border-amber-400/40'
        : 'bg-red-400/20 border-red-400/40';
    return (
      <span className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center ${dotClass}`} />
    );
  }

  const src = iconPath.startsWith('http') ? iconPath : BUNGIE_ROOT + iconPath;
  return (
    <div className="shrink-0 w-6 h-6 rounded overflow-hidden bg-white/5 border border-white/10">
      <Image src={src} alt="" width={24} height={24} className="w-full h-full object-cover" unoptimized />
    </div>
  );
}

// ─── Stack selector ───────────────────────────────────────────────────────────

interface StackSelectorProps {
  buff: DamageBuff;
  activeStackIndex: number;
  onSelect: (idx: number) => void;
}

function StackSelector({ buff, activeStackIndex, onSelect }: StackSelectorProps) {
  if (!buff.stacks?.length) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5 ml-8 flex-wrap">
      {buff.stacks.map((stack, idx) => (
        <button
          key={stack.count}
          onClick={(e) => { e.stopPropagation(); onSelect(idx); }}
          className={[
            'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
            idx === activeStackIndex
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-200 hover:border-white/20',
          ].join(' ')}
        >
          {stack.label}
          <span className="ml-1 text-[9px] font-normal opacity-70">
            {pctStr(stack.multiplier)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Buff row ─────────────────────────────────────────────────────────────────

interface BuffRowProps {
  buff: DamageBuff;
  isActive: boolean;
  isOverridden: boolean;
  activeStackIndex: number;
  onToggle: () => void;
  onSelectStack: (idx: number) => void;
}

function BuffRow({
  buff, isActive, isOverridden,
  activeStackIndex, onToggle, onSelectStack,
}: BuffRowProps) {
  const isDebuff = buff.stackType === 'debuff';

  // Effective multiplier at the current stack level
  const effectiveMult = isActive
    ? getBuffMultiplier(buff, buff.stacks?.length ? activeStackIndex : undefined)
    : buff.multiplier;

  const activeColor = isDebuff ? 'red' : 'amber';

  const buttonClass = [
    'flex items-start gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border text-left w-full',
    isActive
      ? activeColor === 'red'
        ? 'bg-red-500/15 border-red-500/50 text-red-300'
        : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
      : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200',
  ].join(' ');

  return (
    <div>
      <button onClick={onToggle} title={buff.description} className={buttonClass}>
        {/* Icon */}
        <BuffIcon buff={buff} />

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Active dot */}
            <span className={[
              'shrink-0 w-1.5 h-1.5 rounded-full',
              isActive
                ? activeColor === 'red' ? 'bg-red-400' : 'bg-amber-400'
                : 'bg-white/15',
            ].join(' ')} />
            <span className="text-xs font-semibold truncate">{buff.name}</span>
            {isActive && isOverridden && (
              <span className="shrink-0 text-[8px] text-slate-500 bg-slate-900 px-1 py-0.5 rounded border border-slate-700 leading-none">
                overridden
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2 pr-1">
            {buff.description}
          </p>
        </div>

        {/* Percentage */}
        <span className={[
          'shrink-0 text-xs font-bold tabular-nums self-center',
          isActive && !isOverridden
            ? activeColor === 'red' ? 'text-red-400' : 'text-amber-400'
            : 'text-slate-600',
        ].join(' ')}>
          {pctStr(effectiveMult)}
        </span>
      </button>

      {/* Stack selector — shown only when active and buff has stacks */}
      {isActive && buff.stacks?.length ? (
        <StackSelector
          buff={buff}
          activeStackIndex={activeStackIndex}
          onSelect={onSelectStack}
        />
      ) : null}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ label, count, note }: { label: string; count?: number; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full leading-none">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/5" />
      {note && (
        <span className="text-[9px] text-slate-600 italic shrink-0">{note}</span>
      )}
    </div>
  );
}

// ─── Combined multiplier breakdown ───────────────────────────────────────────

// External-buff-only breakdown (empowering + debuff from activeBuffs).
// Weapon-perk multiplicatives are shown in the Effects Tab, not here.
function ExternalMultiplierBreakdown({ activeBuffs }: { activeBuffs: string[] }) {
  const { empoweringMult, debuffMult, total } = useMemo(() => {
    let empoweringMult = 1;
    let debuffMult     = 1;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (!buff) return;
      const mult = buff.multiplier;
      if (buff.stackType === 'empowering' && mult > empoweringMult) empoweringMult = mult;
      if (buff.stackType === 'debuff'     && mult > debuffMult)     debuffMult     = mult;
    });
    return { empoweringMult, debuffMult, total: empoweringMult * debuffMult };
  }, [activeBuffs]);

  if (total === 1) return null;

  const parts: { label: string; value: number; color: string }[] = [];
  if (empoweringMult > 1) parts.push({ label: 'Empowering', value: empoweringMult, color: 'text-amber-400' });
  if (debuffMult     > 1) parts.push({ label: 'Debuff',     value: debuffMult,     color: 'text-red-400'  });

  return (
    <div className="mb-5 p-3 bg-black/40 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">External Multiplier</span>
        <span className="text-xl font-black text-amber-400 tabular-nums">{multStr(total)}</span>
      </div>
      {parts.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {parts.map((p, i) => (
            <React.Fragment key={p.label}>
              {i > 0 && <span className="text-slate-600 text-xs">×</span>}
              <span className={`text-xs font-mono font-bold ${p.color}`}>
                {multStr(p.value)}
                <span className="text-[10px] font-normal text-slate-500 ml-0.5">{p.label}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
//
// This panel handles only external (non-weapon-perk) buffs:
//   • Empowering:  Radiant, Well of Radiance, Empowering Rift, etc.
//   • Debuffs:     Weaken, Shadowshot Tether, Divinity, etc.
//
// Weapon-perk damage buffs (Kill Clip, Rampage, …) are now managed exclusively
// in the Effects Tab (EffectsPanel) to avoid duplication.

export const BuffToggle: React.FC = () => {
  const { activeBuffs, toggleBuff, buffStacks } = useWeaponStore(
    useShallow((s) => ({
      activeBuffs:  s.activeBuffs,
      toggleBuff:   s.toggleBuff,
      buffStacks:   s.buffStacks,
    }))
  );

  const activeSet   = useMemo(() => new Set(activeBuffs), [activeBuffs]);
  const activeCount = activeBuffs.length;

  const winningEmpowering = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'empowering' && buff.multiplier > best) { best = buff.multiplier; winner = hash; }
    });
    return winner;
  }, [activeBuffs]);

  const winningDebuff = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'debuff' && buff.multiplier > best) { best = buff.multiplier; winner = hash; }
    });
    return winner;
  }, [activeBuffs]);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">External Buffs</h2>
        {activeCount > 0 && (
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            {activeCount} active
          </span>
        )}
      </div>

      {/* External multiplier breakdown */}
      <ExternalMultiplierBreakdown activeBuffs={activeBuffs} />

      <div className="space-y-5">

        {/* ── Empowering buffs ── */}
        <div>
          <SectionLabel
            label="Empowering"
            count={_empoweringBuffs.filter((b) => activeSet.has(b.hash)).length}
            note="only highest applies"
          />
          <div className="space-y-1.5">
            {_empoweringBuffs.map((buff) => {
              const isActive    = activeSet.has(buff.hash);
              const isOverridden = isActive && winningEmpowering !== null && buff.hash !== winningEmpowering;
              return (
                <BuffRow
                  key={buff.hash}
                  buff={buff}
                  isActive={isActive}
                  isOverridden={isOverridden}
                  activeStackIndex={0}
                  onToggle={() => toggleBuff(buff.hash)}
                  onSelectStack={() => {}}
                />
              );
            })}
          </div>
        </div>

        {/* ── Debuffs ── */}
        <div>
          <SectionLabel
            label="Debuffs"
            count={_debuffBuffs.filter((b) => activeSet.has(b.hash)).length}
            note="only highest applies"
          />
          <div className="space-y-1.5">
            {_debuffBuffs.map((buff) => {
              const isActive    = activeSet.has(buff.hash);
              const isOverridden = isActive && winningDebuff !== null && buff.hash !== winningDebuff;
              return (
                <BuffRow
                  key={buff.hash}
                  buff={buff}
                  isActive={isActive}
                  isOverridden={isOverridden}
                  activeStackIndex={0}
                  onToggle={() => toggleBuff(buff.hash)}
                  onSelectStack={() => {}}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
