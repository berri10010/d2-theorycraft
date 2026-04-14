'use client';

import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff, getBuffMultiplier } from '../../lib/buffDatabase';

// Pre-computed buff lists — static since BUFF_DATABASE is module-level.
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

// ─── Stack selector ───────────────────────────────────────────────────────────

interface StackSelectorProps {
  buff: DamageBuff;
  activeStackIndex: number;
  onSelect: (idx: number) => void;
}

function StackSelector({ buff, activeStackIndex, onSelect }: StackSelectorProps) {
  if (!buff.stacks?.length) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5 ml-4 flex-wrap">
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
  const isDebuff    = buff.stackType === 'debuff';
  const activeColor = isDebuff ? 'red' : 'amber';

  const effectiveMult = isActive
    ? getBuffMultiplier(buff, buff.stacks?.length ? activeStackIndex : undefined)
    : buff.multiplier;

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
        {/* Active dot */}
        <span className={[
          'shrink-0 w-1.5 h-1.5 rounded-full mt-1.5',
          isActive
            ? activeColor === 'red' ? 'bg-red-400' : 'bg-amber-400'
            : 'bg-white/15',
        ].join(' ')} />

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
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

      {isActive && buff.stacks?.length ? (
        <StackSelector buff={buff} activeStackIndex={activeStackIndex} onSelect={onSelectStack} />
      ) : null}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  label: string;
  note?: string;
  activeCount: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ label, note, activeCount, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {activeCount > 0 && (
          <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full leading-none">
            {activeCount}
          </span>
        )}
        <div className="flex-1 h-px bg-white/5" />
        {note && !open && (
          <span className="text-[9px] text-slate-600 italic shrink-0">{note}</span>
        )}
        {/* Chevron */}
        <svg
          className={[
            'shrink-0 w-3 h-3 text-slate-600 transition-transform duration-200 group-hover:text-slate-400',
            open ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {note && (
            <p className="text-[9px] text-slate-600 italic mb-2">{note}</p>
          )}
          <div className="space-y-1.5">{children}</div>
        </>
      )}
    </div>
  );
}

// ─── External multiplier breakdown ───────────────────────────────────────────

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

export const BuffToggle: React.FC = () => {
  const { activeBuffs, toggleBuff, buffStacks, setBuffStack } = useWeaponStore(
    useShallow((s) => ({
      activeBuffs:  s.activeBuffs,
      toggleBuff:   s.toggleBuff,
      buffStacks:   s.buffStacks,
      setBuffStack: s.setBuffStack,
    }))
  );

  const [empoweringOpen, setEmpoweringOpen] = useState(false);
  const [debuffOpen,     setDebuffOpen]     = useState(false);

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

      <ExternalMultiplierBreakdown activeBuffs={activeBuffs} />

      <div className="space-y-5">

        {/* Empowering */}
        <CollapsibleSection
          label="Empowering"
          note="only highest applies"
          activeCount={_empoweringBuffs.filter((b) => activeSet.has(b.hash)).length}
          open={empoweringOpen}
          onToggle={() => setEmpoweringOpen((v) => !v)}
        >
          {_empoweringBuffs.map((buff) => {
            const isActive     = activeSet.has(buff.hash);
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
        </CollapsibleSection>

        {/* Debuffs */}
        <CollapsibleSection
          label="Debuffs"
          note="only highest applies"
          activeCount={_debuffBuffs.filter((b) => activeSet.has(b.hash)).length}
          open={debuffOpen}
          onToggle={() => setDebuffOpen((v) => !v)}
        >
          {_debuffBuffs.map((buff) => {
            const isActive     = activeSet.has(buff.hash);
            const isOverridden = isActive && winningDebuff !== null && buff.hash !== winningDebuff;
            const stackIndex   = buffStacks[buff.hash] ?? 0;
            return (
              <BuffRow
                key={buff.hash}
                buff={buff}
                isActive={isActive}
                isOverridden={isOverridden}
                activeStackIndex={stackIndex}
                onToggle={() => toggleBuff(buff.hash)}
                onSelectStack={(idx) => setBuffStack(buff.hash, idx)}
              />
            );
          })}
        </CollapsibleSection>

      </div>
    </div>
  );
};
