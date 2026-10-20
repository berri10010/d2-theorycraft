'use client';

import React from 'react';
import { BUFF_DATABASE } from '../../lib/buffDatabase';
import { Tooltip } from '../ui/Tooltip';
import type { AuditAnnotation } from '../../lib/perkAudit';

// ── Effect controls ───────────────────────────────────────────────────────────

/**
 * Simple pill toggle for boolean (on/off) conditional perks.
 * Calls onSet(0) to turn off, onSet(1) to turn on.
 */
export function EffectToggle({ on, onSet, label }: { on: boolean; onSet: (v: number) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={`${on ? 'Deactivate' : 'Activate'} ${label}`}
      onClick={() => onSet(on ? 0 : 1)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
        on ? 'border-amber-500 bg-amber-500/30' : 'border-white/20 bg-white/5',
      ].join(' ')}
    >
      <span className={[
        'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 mt-[1px]',
        on ? 'translate-x-3.5 bg-amber-400' : 'translate-x-0.5 bg-slate-500',
      ].join(' ')} />
    </button>
  );
}

/**
 * Stack selector for multi-state perks (Rampage ×1/×2/×3, Swashbuckler ×1–×5, etc.).
 * Renders an "Off" button plus one button per stack level.
 * `currentState` is the activeEffects value (0 = off, N = stack N).
 */
export function EffectStackSelector({
  buffKey,
  currentState,
  onSet,
}: {
  buffKey: string;
  currentState: number;
  onSet: (v: number) => void;
}) {
  const buff = BUFF_DATABASE[buffKey];
  if (!buff?.stacks?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {/* Off button */}
      <button
        onClick={() => onSet(0)}
        className={[
          'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
          currentState === 0
            ? 'bg-slate-700 border-slate-500 text-ink'
            : 'bg-white/5 border-white/10 text-ink-4 hover:text-ink-2 hover:border-white/20',
        ].join(' ')}
      >
        Off
      </button>
      {/* Stack buttons — state N = stacks[N-1] */}
      {buff.stacks.map((stack, idx) => {
        const stateVal = idx + 1;
        const isActive = currentState === stateVal;
        const pctLabel = `+${((stack.multiplier - 1) * 100).toFixed(0)}%`;
        return (
          <button
            key={stack.count}
            onClick={() => onSet(stateVal)}
            className={[
              'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
              isActive
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-white/5 border-white/10 text-ink-4 hover:text-ink hover:border-white/20',
            ].join(' ')}
          >
            {stack.label}
            <span className="ml-1 text-[9px] font-normal opacity-70">{pctLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── StatDelta helper ──────────────────────────────────────────────────────────
export function StatDelta({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={
        'font-mono text-xs font-bold ' +
        (positive ? 'text-green-400' : 'text-red-400')
      }
    >
      {positive ? '+' : ''}{value}
    </span>
  );
}

// ── StatModPills helper ───────────────────────────────────────────────────────
export function StatModPills({
  mods,
  annotation,
}: {
  mods: Array<{ statName: string; value: number; isConditional?: boolean }>;
  annotation?: AuditAnnotation | null;
}) {
  const nonZero = mods.filter((m) => m.value !== 0);
  if (nonZero.length === 0) return null;

  const sourceNode = annotation?.clarityVerified
    ? <span className="text-emerald-400">✓ Clarity DB</span>
    : annotation?.notes
    ? <span className="text-ink-4">{annotation.notes}</span>
    : null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {nonZero.map((mod) => {
        const positive = mod.value > 0;
        const pillClass = positive
          ? 'bg-green-500/10 text-green-400 border-green-500/25'
          : 'bg-red-500/10 text-red-400 border-red-500/25';
        const pill = (
          <span
            key={mod.statName}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none cursor-default ${pillClass}`}
          >
            {positive ? '+' : ''}{mod.value} {mod.statName}
          </span>
        );
        const tipContent = (
          <div className="space-y-1 text-[11px]">
            <p className="font-semibold text-ink">
              {positive ? '+' : ''}{mod.value} {mod.statName}
            </p>
            {mod.isConditional && (
              <p className="text-ink-3">Activates with perk</p>
            )}
            {sourceNode && (
              <div className="border-t border-white/10 pt-1.5 mt-0.5 text-[10px]">{sourceNode}</div>
            )}
          </div>
        );
        return (
          <Tooltip key={mod.statName} content={tipContent} delay={150}>
            {pill}
          </Tooltip>
        );
      })}
    </div>
  );
}
