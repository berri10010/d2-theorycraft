import React from 'react';
import type { Weapon } from '../../types/weapon';
import { statBasis } from '../../lib/weaponStats';

/**
 * Says so when a weapon's damage and timing are borrowed from the frame it is built on (an exotic the stat sheet
 * has no row for), so an estimate is never mistaken for an exact figure. Renders nothing for exact data.
 */
export function EstimateNote({ weapon, className = '' }: { weapon: Weapon; className?: string }) {
  const frame = statBasis(weapon.itemSubType, weapon.ammoType, weapon.intrinsicTrait?.name ?? null, weapon.baseName ?? weapon.name);
  if (!frame) return null;
  return (
    <p className={`text-2xs text-ink-3 leading-snug ${className}`} role="note">
      Estimate: the stat sheet has no row for {weapon.baseName ?? weapon.name}, so this uses the {frame} frame&apos;s damage and timing.
    </p>
  );
}
