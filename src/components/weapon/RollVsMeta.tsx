'use client';

import React, { useMemo } from 'react';
import type { Weapon, GameMode } from '../../types/weapon';
import { useMetaRoll } from '../../lib/useMetaRoll';
import { scoreRoll, picksFromSelection, selectionFromHashes, type Grade, type RollScore, type Verdict } from '../../lib/rollScore';

const GRADE_STYLE: Record<Grade, { chip: string; ring: string; text: string }> = {
  'God roll': { chip: 'bg-amber-400 text-slate-950', ring: 'border-amber-400', text: 'text-amber-400' },
  Great:      { chip: 'bg-green-400 text-slate-950', ring: 'border-green-400', text: 'text-green-400' },
  Good:       { chip: 'bg-blue-400 text-slate-950',  ring: 'border-blue-400',  text: 'text-blue-400' },
  Mixed:      { chip: 'bg-slate-500 text-white',     ring: 'border-slate-500', text: 'text-ink-2' },
  Weak:       { chip: 'bg-red-500/80 text-white',    ring: 'border-red-500',   text: 'text-red-400' },
};

const VERDICT: Record<Verdict, { mark: string; cls: string; label: string }> = {
  best:   { mark: '✓', cls: 'text-green-400', label: 'Top pick' },
  listed: { mark: '✓', cls: 'text-lime-300',  label: 'Recommended' },
  off:    { mark: '✗', cls: 'text-red-400',   label: 'Not recommended' },
  unset:  { mark: '–', cls: 'text-ink-4',     label: 'Nothing selected' },
};

/** Score a selection against the meta for this weapon and mode. */
export function useRollScore(
  weapon: Weapon | null,
  mode: GameMode,
  selected: Record<string, string>,
  masterwork?: string | null,
): { score: RollScore | null; source: string; loading: boolean; hasEntry: boolean; empty: boolean } {
  const { entry, source, loading } = useMetaRoll(weapon, mode);
  const score = useMemo(() => {
    if (!weapon || !entry) return null;
    const { picks, options } = picksFromSelection(weapon, selected, masterwork);
    return scoreRoll(picks, entry, options);
  }, [weapon, entry, selected, masterwork]);
  // Nothing picked yet: a score of 0 would only say "you haven't chosen anything".
  const empty = !!score && score.columns.every((c) => c.verdict === 'unset');
  return { score, source, loading, hasEntry: !!entry, empty };
}

/** The full breakdown: overall score and, per column, how the pick ranks and what to try instead. */
export function RollVsMeta({
  weapon, mode, selected, masterwork,
}: { weapon: Weapon; mode: GameMode; selected: Record<string, string>; masterwork?: string | null }) {
  const { score, source, loading, empty } = useRollScore(weapon, mode, selected, masterwork);
  if (loading || !score) return null;
  if (empty) {
    return (
      <p className="mb-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-ink-4">
        Pick perks in the editor to see how your roll compares with the meta.
      </p>
    );
  }
  const style = GRADE_STYLE[score.grade];

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3" aria-label="Your roll compared with the meta">
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 w-14 h-14 rounded-full border-2 ${style.ring} flex flex-col items-center justify-center`}
          aria-label={`Score ${score.score} out of 100`}
        >
          <span className={`text-lg font-black leading-none tabular-nums ${style.text}`}>{score.score}</span>
          <span className="text-[8px] text-ink-4 leading-none mt-0.5">/ 100</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ink-4 uppercase tracking-widest">Your roll vs the meta</p>
          <p className={`text-sm font-bold ${style.text}`}>{score.grade}</p>
          <p className="text-[10px] text-ink-4 truncate">{source}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {score.columns.map((c) => {
          const v = VERDICT[c.verdict];
          return (
            <li key={c.key} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 w-4 text-center font-bold ${v.cls}`} title={v.label} aria-label={v.label}>{v.mark}</span>
              <span className="shrink-0 w-16 text-ink-4">{c.label}</span>
              <span className="min-w-0 flex-1 text-ink-2">
                <span className="font-medium">{c.picked ?? 'None'}</span>
                {c.position !== null && c.position > 0 && <span className="text-ink-4"> · #{c.position + 1} pick</span>}
                {c.suggestion && <span className="text-amber-400/90"> → try {c.suggestion}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A one-line version for compare cards and saved rolls. */
export function RollScoreBadge({
  weapon, mode, selected, masterwork, className = '',
}: { weapon: Weapon | null; mode: GameMode; selected: Record<string, string>; masterwork?: string | null; className?: string }) {
  const { score, loading, empty } = useRollScore(weapon, mode, selected, masterwork);
  if (loading || !score || empty) return null;
  const style = GRADE_STYLE[score.grade];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black leading-none ${style.chip} ${className}`}
      title={`${score.grade}: ${score.score}/100 vs the ${mode === 'pvp' ? 'PvP' : 'PvE'} meta`}
    >
      {score.score}
      <span className="font-semibold opacity-80">{score.grade}</span>
    </span>
  );
}

/** Score a saved roll (a flat list of perk hashes) for the list of Saved Rolls. */
export function SavedRollScore({ weapon, hashes, mode }: { weapon: Weapon | null; hashes: string[]; mode: GameMode }) {
  const selected = useMemo(() => (weapon ? selectionFromHashes(weapon, hashes) : {}), [weapon, hashes]);
  return <RollScoreBadge weapon={weapon} mode={mode} selected={selected} />;
}
