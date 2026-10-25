'use client';

import React from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { renderClarityDesc } from '../../lib/clarityRender';
import { findCatalystEntry } from '../../lib/catalystStats';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import { SourceNote } from '../ui/SourceNote';

/**
 * An exotic's catalyst, in place of the masterwork card: a switch for "catalyst complete" that applies its flat stat
 * bonuses, and Clarity's description of everything else it does.
 */
export function CatalystCard() {
  const { activeWeapon, catalystActive, setCatalystActive } = useWeaponStore(
    useShallow((s) => ({ activeWeapon: s.activeWeapon, catalystActive: s.catalystActive, setCatalystActive: s.setCatalystActive })),
  );
  const { data: clarity } = useClarityPerks();
  if (!activeWeapon) return null;

  const catalyst = activeWeapon.catalyst ?? null;
  if (!catalyst) {
    return (
      <div className="p-3 md:p-4 rounded-xl border border-white/10">
        <h3 className="text-sm font-bold text-ink-2 mb-1">Catalyst</h3>
        <p className="text-sm text-ink-3 leading-relaxed">This exotic has no catalyst, so there is nothing to upgrade.</p>
      </div>
    );
  }

  const entry = clarity ? findCatalystEntry(clarity, activeWeapon) : null;
  const stats = Object.entries(catalyst.stats);

  return (
    <div className={['p-3 md:p-4 rounded-xl border transition-colors duration-200', catalystActive ? 'border-amber-500/40' : 'border-white/10'].join(' ')}>
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden border border-white/15 bg-black/30">
          {catalyst.icon && <Image src={BUNGIE_URL + catalyst.icon} alt="" fill sizes="40px" className="object-cover" unoptimized />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink-2 truncate">{catalyst.name}</h3>
          <p className="text-2xs text-ink-4">Exotics upgrade with a catalyst instead of a masterwork</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={catalystActive}
          aria-label={`${catalyst.name} complete`}
          onClick={() => setCatalystActive(!catalystActive)}
          className="shrink-0 flex items-center gap-2 text-xs font-semibold text-ink-3 hover:text-ink transition-colors min-h-[44px] md:min-h-0"
        >
          <span>{catalystActive ? 'Complete' : 'Not complete'}</span>
          <span className={['relative w-9 h-5 rounded-full border transition-colors duration-200', catalystActive ? 'bg-amber-500/30 border-amber-500/60' : 'bg-white/5 border-white/15'].join(' ')}>
            <span className={['absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200', catalystActive ? 'translate-x-4 bg-amber-400' : 'bg-ink-4'].join(' ')} />
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {stats.length > 0 ? stats.map(([stat, value]) => (
          <span
            key={stat}
            className={['text-2xs font-semibold px-2 py-1 rounded-md border tabular-nums transition-colors duration-200', catalystActive ? 'text-green-400 border-green-500/40 bg-green-500/10' : 'text-ink-3 border-white/10 bg-white/5'].join(' ')}
          >
            {value > 0 ? '+' : ''}{value} {stat}
          </span>
        )) : (
          <span className="text-2xs text-ink-4">No flat stat bonuses, only the effects below.</span>
        )}
      </div>

      {entry && <p className="text-xs text-ink-3 mt-3 leading-relaxed">{renderClarityDesc(entry)}</p>}
      <p className="text-2xs text-ink-4 mt-2">Only the stat bonuses are applied here; the catalyst&apos;s other effects are not modelled.</p>
      <SourceNote className="mt-1" label="Catalyst text" ids={['clarity']} />
    </div>
  );
}
