import React from 'react';
import type { Weapon } from '../../types/weapon';
import { lookupWeaponStat } from '../../lib/weaponStats';

/**
 * Says where an exotic's damage and timing come from when they are not the sheet's own exact row: borrowed from the
 * frame it is built on, taken from the Destiny Data Compendium, or carrying the compendium's PvE bonus. Renders
 * nothing for ordinary rows, so an estimate is never mistaken for an exact figure.
 */
export function EstimateNote({ weapon, className = '' }: { weapon: Weapon; className?: string }) {
  const entry = lookupWeaponStat(weapon.itemSubType, weapon.ammoType, weapon.intrinsicTrait?.name ?? null, weapon.baseName ?? weapon.name);
  if (!entry) return null;
  const name = weapon.baseName ?? weapon.name;
  const notes: string[] = [];
  if (entry.approxFrom) notes.push(`Estimate: the stat sheet has no row for ${name}, so this uses the ${entry.approxFrom} frame's damage and timing.`);
  if (entry.source === 'compendium') notes.push(`Damage per rocket comes from the Destiny Data Compendium, assuming every rocket of a volley hits.`);
  if (entry.pveFactor && entry.pveFactor !== 1) notes.push(`PvE damage includes ${name}'s own bonus (${entry.pveFactor.toFixed(2)}× a legendary of its type), from the Destiny Data Compendium.`);
  if (notes.length === 0) return null;
  return (
    <div className={`space-y-1 ${className}`} role="note">
      {notes.map((n) => <p key={n} className="text-2xs text-ink-3 leading-snug">{n}</p>)}
    </div>
  );
}
