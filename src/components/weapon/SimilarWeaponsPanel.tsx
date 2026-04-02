'use client';

import React, { useMemo, useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon, WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Scan all variants in the group for the first non-null season name/number.
 * Base weapons often lack seasonHash in the manifest; adept/variant copies usually have it.
 */
function bestSeasonLabel(group: WeaponGroup): string | null {
  const name = group.variants.map((v) => v.seasonName).find(Boolean);
  if (name) return name;
  const num = group.variants.map((v) => v.seasonNumber).find((n) => n != null);
  if (num != null) return `Season ${num}`;
  return null;
}

/** Archetype label from intrinsic trait name (e.g. "Adaptive Frame"). */
function archetypeOf(w: Weapon): string {
  return w.intrinsicTrait?.name ?? '';
}

/** Collect all trait perk names from perk/origin columns (excludes barrel & mag). */
function perkPool(w: Weapon): Set<string> {
  const names = new Set<string>();
  for (const col of w.perkSockets) {
    if (col.columnType !== 'perk' && col.columnType !== 'origin') continue;
    for (const p of col.perks) {
      if (!p.isEnhanced) names.add(p.name);
    }
  }
  return names;
}

/** Jaccard index: |intersection| / |union|. Returns 1 if both sets are empty. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const inter = Array.from(a).filter((name) => b.has(name)).length;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Combined 0–1 similarity (higher = more similar).
 * 50% stat closeness + 50% perk pool Jaccard overlap.
 * Returns null if the candidate is not comparable to the active weapon.
 */
function similarityScore(active: Weapon, candidate: Weapon): number | null {
  if (candidate.hash === active.hash) return null;
  if (archetypeOf(candidate) !== archetypeOf(active)) return null;
  if (candidate.itemTypeDisplayName !== active.itemTypeDisplayName) return null;

  const statKeys = Object.keys(active.baseStats) as (keyof typeof active.baseStats)[];
  const statDist = statKeys.reduce((sum, k) =>
    sum + Math.abs((active.baseStats[k] ?? 0) - (candidate.baseStats[k] ?? 0)), 0);
  const statSim = statKeys.length > 0 ? 1 - statDist / (statKeys.length * 100) : 1;

  const perkSim = jaccard(perkPool(active), perkPool(candidate));

  return 0.5 * statSim + 0.5 * perkSim;
}

// ─── Result row ───────────────────────────────────────────────────────────────

function SimilarRow({
  weapon,
  score,
  seasonLabel,
  onLoad,
}: {
  weapon: Weapon;
  score: number;
  seasonLabel: string | null;
  onLoad: (w: Weapon) => void;
}) {
  const pct = Math.round(score * 100);
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
          {seasonLabel ?? 'Unknown season'} · {weapon.intrinsicTrait?.name ?? weapon.itemTypeDisplayName}
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
  // and resolve season labels (base weapons often lack seasonHash directly).
  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const hashToGroup = useMemo(() => {
    const map = new Map<string, WeaponGroup>();
    for (const g of groups) {
      for (const v of g.variants) map.set(v.hash, g);
    }
    return map;
  }, [groups]);

  const recommendations = useMemo<{ weapon: Weapon; score: number }[]>(() => {
    if (!activeWeapon || !weapons?.length) return [];

    const groupHashes = new Set(variantGroup.map((w) => w.hash));

    const scored: { weapon: Weapon; score: number }[] = [];
    for (const w of weapons) {
      if (groupHashes.has(w.hash)) continue;
      const score = similarityScore(activeWeapon, w);
      if (score !== null) scored.push({ weapon: w, score });
    }

    // Most similar first (highest combined score), then newest season as tiebreak
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
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

      {visible.map(({ weapon, score }) => {
        const group = hashToGroup.get(weapon.hash);
        return (
          <SimilarRow
            key={weapon.hash}
            weapon={weapon}
            score={score}
            seasonLabel={group ? bestSeasonLabel(group) : null}
            onLoad={(w) => loadWeapon(w, group?.variants)}
          />
        );
      })}

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
