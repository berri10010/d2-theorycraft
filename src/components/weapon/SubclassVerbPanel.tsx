'use client';

import React, { useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import {
  SUBCLASS_VERBS,
  ENEMY_TIERS,
  EnemyTier,
  SubclassElement,
  VerbDef,
} from '../../data/subclassVerbs';

// ─── Element color helpers ─────────────────────────────────────────────────────

const ELEMENT_COLORS: Record<SubclassElement, {
  bg: string; border: string; text: string; badge: string; dot: string;
}> = {
  arc:    { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    text: 'text-sky-300',    badge: 'bg-sky-500',    dot: 'bg-sky-400'   },
  solar:  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500', dot: 'bg-orange-400' },
  void:   { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', badge: 'bg-violet-500', dot: 'bg-violet-400' },
  strand: { bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',text: 'text-emerald-300',badge: 'bg-emerald-600', dot: 'bg-emerald-400'},
  stasis: { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-300',   badge: 'bg-cyan-600',   dot: 'bg-cyan-400'  },
};

// ─── Verb selector chip ────────────────────────────────────────────────────────

function VerbChip({ verb, active, onSelect }: {
  verb: VerbDef;
  active: boolean;
  onSelect: () => void;
}) {
  const c = ELEMENT_COLORS[verb.element];
  return (
    <button
      onClick={onSelect}
      className={[
        'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all text-center',
        active
          ? `${c.bg} ${c.border} ${c.text}`
          : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-300',
      ].join(' ')}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide leading-none">
        {verb.element}
      </span>
      <span className="text-xs font-semibold leading-tight">{verb.perkName}</span>
      <span className="text-[9px] text-slate-500 leading-tight">→ {verb.name}</span>
    </button>
  );
}

// ─── Enemy tier selector ───────────────────────────────────────────────────────

function TierPicker({ value, onChange }: {
  value: EnemyTier;
  onChange: (t: EnemyTier) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ENEMY_TIERS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={[
            'px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all',
            value === t.key
              ? 'bg-white/15 border-white/30 text-white'
              : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Calculation result card ───────────────────────────────────────────────────

function ResultCard({ verb, baseImpact, rps, tier }: {
  verb: VerbDef;
  baseImpact: number;
  rps: number;
  tier: EnemyTier;
}) {
  const result = verb.calcBonus(baseImpact, rps, tier);
  const c = ELEMENT_COLORS[result.element];

  return (
    <div className={`rounded-lg border p-4 ${c.bg} ${c.border}`}>
      <p className={`text-sm font-bold mb-3 ${c.text}`}>{result.headline}</p>
      <div className="space-y-1.5">
        {result.rows.map((row) => (
          <div key={row.label} className="flex justify-between items-baseline gap-4">
            <span className="text-[11px] text-slate-400">{row.label}</span>
            <span className="text-[11px] font-semibold text-slate-200 tabular-nums shrink-0">
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 pt-2 border-t border-white/5 text-[9px] text-slate-600 leading-snug">
        {verb.tagline}
      </p>
      <p className="mt-1 text-[9px] text-slate-700 italic">
        Estimates based on community testing. Actual values vary with buffs, mods & patch notes.
      </p>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const SubclassVerbPanel: React.FC = () => {
  const { activeWeapon, getCalculatedStats } = useWeaponStore();
  const [activeVerbKey, setActiveVerbKey] = useState<string | null>(null);
  const [enemyTier, setEnemyTier] = useState<EnemyTier>('major');

  if (!activeWeapon) return null;

  const stats = getCalculatedStats();
  const impact = stats['Impact'] ?? activeWeapon.baseStats['Impact'] ?? 50;
  const rpm = activeWeapon.baseStats['Rounds Per Minute'] ?? stats['Rounds Per Minute'] ?? 90;
  const rps = rpm / 60;

  const activeVerb = SUBCLASS_VERBS.find((v) => v.key === activeVerbKey) ?? null;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Subclass Verb Math</h2>
        {activeVerbKey && (
          <button
            onClick={() => setActiveVerbKey(null)}
            className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Verb chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUBCLASS_VERBS.map((v) => (
          <VerbChip
            key={v.key}
            verb={v}
            active={activeVerbKey === v.key}
            onSelect={() => setActiveVerbKey((prev) => prev === v.key ? null : v.key)}
          />
        ))}
      </div>

      {activeVerb && (
        <>
          {/* Enemy tier */}
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
              Enemy Tier
            </p>
            <TierPicker value={enemyTier} onChange={setEnemyTier} />
          </div>

          {/* Result */}
          <ResultCard
            verb={activeVerb}
            baseImpact={impact}
            rps={rps}
            tier={enemyTier}
          />
        </>
      )}

      {!activeVerb && (
        <p className="text-[11px] text-slate-600 italic">
          Select a subclass verb perk above to see estimated damage contribution.
        </p>
      )}
    </div>
  );
};
