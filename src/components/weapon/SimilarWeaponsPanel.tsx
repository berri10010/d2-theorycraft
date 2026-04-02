'use client';

import React, { useMemo, useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Archetype label from intrinsic trait name (e.g. "Adaptive Frame"). */
function archetypeOf(w: Weapon): string {
  return w.intrinsicTrait?.name ?? '';
}

/**
 * Manhattan distance across every shared base stat.
 * Lower = more similar. Returns null if the weapon is not comparable.
 */
function similarityScore(active: Weapon, candidate: Weapon): number | null {
  if (candidate.hash === active.hash) return null;
  if (archetypeOf(candidate) !== archetypeOf(active)) return null;
  if (candidate.itemTypeDisplayName !== active.itemTypeDisplayName) return null;

  const keys = Object.keys(active.baseStats) as (keyof typeof active.baseStats)[];
  const dist = keys.reduce((sum, k) => {
    return sum + Math.abs((active.baseStats[k] ?? 0) - (candidate.baseStats[k] ?? 0));
  }, 0);
  return dist;
}

/** 0–100 match percentage derived from the Manhattan distance. */
function matchPct(distance: number, numStats: number): number {
  if (numStats === 0) return 100;
  // Treat 100 as the maximum possible range per stat
  const maxDist = numStats * 100;
  return Math.round(Math.max(0, 1 - distance / maxDist) * 100);
}

// ─── Result row ───────────────────────────────────────────────────────────────

function SimilarRow({
  weapon,
  score,
  numStats,
  onLoad,
}: {
  weapon: Weapon;
  score: number;
  numStats: number;
  onLoad: (w: Weapon) => void;
}) {
  const pct = matchPct(score, numStats);
  const pctClass =
    pct >= 80 ? 'text-green-400'
    : pct >= 60 ? 'text-amber-400'
    : 'text-slate-500';

  const ELEMENT_DOT: Record<string, string> = {
    arc:     'bg-sky-400',
    solar:   'bg-orange-400',
    void:    'bg-violet-500',
    strand:  'bg-emerald-400',
    stasis:  'bg-cyan-400',
    kinetic: 'bg-slate-400',
  };
  const dot = ELEMENT_DOT[weapon.damageType ?? 'kinetic'] ?? 'bg-slate-400';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
          {weapon.name}
        </p>
        <p className="text-[10px] text-slate-500 leading-tight">
          {weapon.seasonName ?? `S${weapon.seasonNumber ?? '?'}`} · {weapon.intrinsicTrait?.name ?? weapon.itemTypeDisplayName}
        </p>
      </div>

      {/* Match percentage */}
      <span className={`text-[10px] font-bold tabular-nums shrink-0 ${pctClass}`}>
        {pct}%
      </span>

      <button
        onClick={() => onLoad(weapon)}
        className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 transition-colors shrink-0"
      >
        Load
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export const SimilarWeaponsPanel: React.FC = () => {
  const { activeWeapon, loadWeapon, variantGroup } = useWeaponStore();
  const { weapons } = useWeaponDb();
  const [showAll, setShowAll] = useState(false);

  // Pre-compute groups so we can pass the correct variant group when loading
  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const numStats = useMemo(
    () => Object.keys(activeWeapon?.baseStats ?? {}).length,
    [activeWeapon],
  );

  const recommendations = useMemo<{ weapon: Weapon; score: number }[]>(() => {
    if (!activeWeapon || !weapons?.length) return [];

    const groupHashes = new Set(variantGroup.map((w) => w.hash));

    const scored: { weapon: Weapon; score: number }[] = [];
    for (const w of weapons) {
      if (groupHashes.has(w.hash)) continue;
      const score = similarityScore(activeWeapon, w);
      if (score !== null) scored.push({ weapon: w, score });
    }

    // Most similar first (lowest distance), then newest season as tiebreak
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return (b.weapon.seasonNumber ?? 0) - (a.weapon.seasonNumber ?? 0);
    });

    return scored.slice(0, 15);
  }, [activeWeapon, weapons, variantGroup]);

  if (!activeWeapon) return null;
  if (recommendations.length === 0) return null;

  const visible = showAll ? recommendations : recommendations.slice(0, 5);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white">Similar Weapons</h2>
        <span className="text-[10px] text-slate-500">
          {recommendations.length} found
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">
        Same archetype · ranked by stat similarity
      </p>

      {/* Header row */}
      <div className="flex items-center gap-3 pb-1.5 mb-1 border-b border-white/10">
        <span className="w-2 shrink-0" />
        <span className="flex-1 text-[9px] text-slate-600 uppercase tracking-wider">Weapon</span>
        <span className="text-[9px] text-slate-600 uppercase tracking-wider shrink-0">Match</span>
        <span className="w-8 shrink-0" />
      </div>

      {visible.map(({ weapon, score }) => (
        <SimilarRow
          key={weapon.hash}
          weapon={weapon}
          score={score}
          numStats={numStats}
          onLoad={(w) => {
            const group = groups.find((g) => g.variants.some((v) => v.hash === w.hash));
            loadWeapon(w, group?.variants);
          }}
        />
      ))}

      {recommendations.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full text-center text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showAll ? 'Show fewer' : `Show all ${recommendations.length} →`}
        </button>
      )}
    </div>
  );
};
