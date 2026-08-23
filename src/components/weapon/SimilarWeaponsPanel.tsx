'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useWeaponDb } from '../../store/useWeaponDb';
import { Weapon, WeaponGroup } from '../../types/weapon';
import { groupWeapons } from '../../lib/weaponGroups';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';

// ─── Stat importance weights ───────────────────────────────────────────────────
// Stats that directly affect gameplay (TTK, range, handling) matter more than
// cosmetic stats like Zoom or Airborne Effectiveness.

const STAT_WEIGHTS: Record<string, number> = {
  'Impact':                 3.0,
  'Range':                  2.5,
  'Stability':              2.0,
  'Reload Speed':           2.0,
  'Handling':               1.5,
  'Aim Assistance':         1.5,
  'Magazine':               1.0,
  'Zoom':                   0.5,
  'Airborne Effectiveness': 0.5,
  'Recoil Direction':       0.5,
};
const DEFAULT_STAT_WEIGHT = 1.0;

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function d2Year(seasonNumber: number): number {
  if (seasonNumber <= 3) return 1;
  return Math.floor((seasonNumber - 4) / 4) + 2;
}

function bestSeasonLabel(group: WeaponGroup): string | null {
  const seasonName = group.variants.map((v) => v.seasonName).find(Boolean) ?? null;
  const seasonNumber = group.variants.map((v) => v.seasonNumber).find((n) => n != null) ?? null;
  if (!seasonName && seasonNumber === null) return null;
  const isEpisode = seasonNumber !== null && seasonNumber >= 24;
  const displayName = seasonName
    ? (isEpisode ? `Episode: ${seasonName}` : seasonName)
    : `Season ${seasonNumber}`;
  if (seasonNumber !== null) {
    return `${displayName} (Season ${seasonNumber}, Year ${d2Year(seasonNumber)})`;
  }
  return displayName;
}

function archetypeOf(w: Weapon): string {
  return w.intrinsicTrait?.name ?? '';
}

/** Collect trait perk names from perk/origin columns (base variants only). */
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

/**
 * Build an IDF map across all weapons so common perks (Outlaw, Firefly) carry
 * less weight than rare unique perks in similarity scoring.
 * Weight = log((N+1)/(df+1)) + 1  (smoothed, always >= 1)
 */
function buildPerkIdf(weapons: Weapon[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of weapons) {
    for (const name of perkPool(w)) {
      freq.set(name, (freq.get(name) ?? 0) + 1);
    }
  }
  const N = weapons.length;
  const idf = new Map<string, number>();
  for (const [name, df] of freq) {
    idf.set(name, Math.log((N + 1) / (df + 1)) + 1);
  }
  return idf;
}

/** IDF-weighted Jaccard: rare shared perks count more than common ones. */
function weightedPerkSim(a: Set<string>, b: Set<string>, idf: Map<string, number>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let interW = 0, aW = 0, bW = 0;
  for (const name of a) {
    const w = idf.get(name) ?? 1;
    aW += w;
    if (b.has(name)) interW += w;
  }
  for (const name of b) {
    bW += idf.get(name) ?? 1;
  }
  const unionW = aW + bW - interW;
  return unionW === 0 ? 1 : interW / unionW;
}

/**
 * Combined 0–1 similarity (50% weighted-stat closeness + 50% IDF-perk overlap).
 * Returns null if the candidate is not eligible (different archetype, weapon type, or ammo type).
 */
function similarityScore(
  active: Weapon,
  candidate: Weapon,
  idf: Map<string, number>,
): number | null {
  if (candidate.hash === active.hash) return null;
  if (archetypeOf(candidate) !== archetypeOf(active)) return null;
  if (candidate.itemTypeDisplayName !== active.itemTypeDisplayName) return null;
  // Ammo type filter: Primary/Special/Heavy weapons are not interchangeable roles
  if (candidate.ammoType !== active.ammoType) return null;

  const statKeys = Object.keys(active.baseStats);
  const totalWeight = statKeys.reduce((s, k) => s + (STAT_WEIGHTS[k] ?? DEFAULT_STAT_WEIGHT), 0);
  const weightedDist = statKeys.reduce((s, k) => {
    const w = STAT_WEIGHTS[k] ?? DEFAULT_STAT_WEIGHT;
    return s + w * Math.abs((active.baseStats[k] ?? 0) - (candidate.baseStats[k] ?? 0));
  }, 0);
  const statSim = totalWeight > 0 ? 1 - weightedDist / (totalWeight * 100) : 1;

  const perkSim = weightedPerkSim(perkPool(active), perkPool(candidate), idf);

  return 0.5 * Math.max(0, statSim) + 0.5 * perkSim;
}

// ─── Ammo slot label ──────────────────────────────────────────────────────────

const AMMO_META: Record<number, { label: string; cls: string }> = {
  1: { label: 'Primary', cls: 'text-slate-400' },
  2: { label: 'Special', cls: 'text-green-400' },
  3: { label: 'Heavy',   cls: 'text-purple-400' },
};

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

  const ELEMENT_BORDER: Record<string, string> = {
    arc:     'border-sky-500/60',
    solar:   'border-orange-500/60',
    void:    'border-violet-500/60',
    strand:  'border-emerald-500/60',
    stasis:  'border-cyan-500/60',
    kinetic: 'border-slate-600/60',
  };
  const iconBorder = ELEMENT_BORDER[weapon.damageType ?? 'kinetic'] ?? 'border-slate-600/60';
  const ammoMeta = AMMO_META[weapon.ammoType] ?? AMMO_META[1];

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className={`w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-white/5 border ${iconBorder}`}>
        {weapon.icon ? (
          <Image
            src={BUNGIE_ROOT + weapon.icon}
            alt=""
            width={36}
            height={36}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-white/5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
          {weapon.name}
        </p>
        <p className="text-[10px] text-slate-500 leading-tight">
          {seasonLabel ?? 'Unknown season'} · {weapon.intrinsicTrait?.name ?? weapon.itemTypeDisplayName}
          {' · '}<span className={ammoMeta.cls}>{ammoMeta.label}</span>
        </p>
      </div>

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

  const groups = useMemo(() => groupWeapons(weapons), [weapons]);

  const hashToGroup = useMemo(() => {
    const map = new Map<string, WeaponGroup>();
    for (const g of groups) {
      for (const v of g.variants) map.set(v.hash, g);
    }
    return map;
  }, [groups]);

  // IDF map computed once across all weapons for weighted perk similarity
  const perkIdf = useMemo(() => buildPerkIdf(weapons ?? []), [weapons]);

  const recommendations = useMemo<{ weapon: Weapon; score: number }[]>(() => {
    if (!activeWeapon || !weapons?.length) return [];

    const groupHashes = new Set(variantGroup.map((w) => w.hash));

    // Score all eligible variants
    const rawScored: { weapon: Weapon; score: number }[] = [];
    for (const w of weapons) {
      if (groupHashes.has(w.hash)) continue;
      const score = similarityScore(activeWeapon, w, perkIdf);
      if (score !== null) rawScored.push({ weapon: w, score });
    }

    // Deduplicate: keep only the best-scoring variant per weapon family
    // so Adept and base of the same gun don't both appear
    const seen = new Map<string, { weapon: Weapon; score: number }>();
    for (const entry of rawScored) {
      const existing = seen.get(entry.weapon.baseName);
      if (!existing || entry.score > existing.score) seen.set(entry.weapon.baseName, entry);
    }

    const deduped = Array.from(seen.values());
    deduped.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
      // Tiebreak: newer season first
      return (b.weapon.seasonNumber ?? 0) - (a.weapon.seasonNumber ?? 0);
    });

    return deduped.slice(0, 15);
  }, [activeWeapon, weapons, variantGroup, perkIdf]);

  if (!activeWeapon) return null;
  if (recommendations.length === 0) return null;

  const visible = showAll ? recommendations : recommendations.slice(0, 5);

  return (
    <CollapsiblePanel
      defaultOpen={false}
      storageKey="similar-weapons"
      title={
        <div>
          <div>Similar Weapons</div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-normal">Same archetype · stat &amp; perk match</p>
        </div>
      }
      headerRight={
        <span className="text-[10px] text-slate-500">{recommendations.length} found</span>
      }
    >
      <div className="flex items-center gap-3 pb-1.5 mb-1 border-b border-white/10">
        <span className="w-9 shrink-0" />
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
    </CollapsiblePanel>
  );
};
