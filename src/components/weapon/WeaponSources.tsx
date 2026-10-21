'use client';

import React from 'react';
import type { Weapon } from '../../types/weapon';
import { useWeaponSources } from '../../lib/useStaticJson';
import { lookupSources, describeSource, SAX_SHEET_URL } from '../../lib/weaponSources';

/**
 * Where the weapon drops. Prefers Sax's Monument of Triumph loot-source sheet (specific vendor /
 * activity / encounter) and falls back to Bungie's own source text for weapons it doesn't list.
 */
export function WeaponSources({ weapon }: { weapon: Weapon }) {
  const { data } = useWeaponSources();
  const sources = data ? lookupSources(data, weapon) : [];

  if (sources.length === 0) {
    return weapon.source ? <p className="text-xs text-ink-4">{weapon.source}</p> : null;
  }

  const craftable = sources.some((s) => s.craftable);
  const tiered = sources.some((s) => s.tiered);

  return (
    <div className="space-y-0.5">
      {sources.map((s, i) => (
        <p key={i} className="text-xs text-ink-4">
          {describeSource(s)}
          {s.notes && <span className="text-ink-4/80"> — {s.notes}</span>}
        </p>
      ))}
      <p className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {craftable && (
          <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Craftable</span>
        )}
        {tiered && (
          <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">Tiered</span>
        )}
        <a
          href={SAX_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xs text-ink-4 underline underline-offset-2 hover:text-ink-2"
        >
          via Sax&apos;s loot sources
        </a>
      </p>
    </div>
  );
}
