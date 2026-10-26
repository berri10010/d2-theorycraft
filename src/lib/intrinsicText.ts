import type { Perk } from '../types/weapon';
import type { ClarityDatabase, ClarityEntry } from './clarity';

/**
 * Last-resort descriptions for frame intrinsics whose plug items carry no
 * description in the Bungie manifest and are absent from the Clarity DB.
 * Text matches Bungie's in-game tooltips.
 */
export const FRAME_FALLBACK: Record<string, string> = {
  'Adaptive Frame':         'A well-rounded grip, reliable and sturdy.',
  'Aggressive Frame':       "High damage, high recoil. This weapon's recoil pattern kicks violently upward.",
  'Lightweight Frame':      'Superb handling. Move faster with this weapon equipped.',
  'Rapid-Fire Frame':       'Deeper ammo reserves. Slightly faster reload when magazine is empty.',
  'Precision Frame':        'Recoil pattern on this weapon is more predictably vertical. To compensate, the hipfire of this weapon is harder to control.',
  'Pinpoint Slug Frame':    'Fires a single-slug payload. Significant recoil. Excellent accuracy.',
  'Spread Shot Frame':      'Standard spread-shot payload. Versatile and great against groups.',
  'Aggressive Burst':       'Fires 4-round bursts.',
  'Adaptive Burst':         'Fires 3-round bursts.',
  'Wave Frame':             'Fires a wave of energy along the ground, tracing its surface.',
  'Area Denial Frame':      'Fires a burst of containment mortars that suppress detonation on impact.',
  'Caster Frame':           'Fires large, slow-moving projectiles that deal substantial damage.',
  'Häkke Precision Frame':  'This weapon fires armor-piercing rounds. Increased damage against shields.',
  'Double Fire':            'Fires 2 rounds at a slight offset from the reticle at the cost of 1 Ammo.',
  'Aggressive Tracking':    'Fires a self-guided missile that tracks its target.',
  'Volatile Launch':        'Fired projectile has greatly increased blast radius.',
  'Precision Draw':         'Slightly longer draw time for higher accuracy.',
  'Komplex Draw':           'Long draw time, high damage.',
  'Lightweight Draw':       'Faster draw and movement speed.',
  'Explosive Light':        'Collecting an Orb of Power fills a reserve of explosive rounds.',
  'Heavy Burst':            'Fires a powerful 2-round burst.',
};

/** Flattens a Clarity entry's English description into plain text. */
function clarityPlainText(entry: ClarityEntry): string | null {
  const lines: string[] = [];
  for (const group of entry.descriptions?.en ?? []) {
    if (!group.linesContent?.length) continue;
    const line = group.linesContent.map((seg) => seg.text ?? '').join('').trim();
    if (line) lines.push(line);
  }
  return lines.length ? lines.join(' ') : null;
}

/** A frame or trait description: the manifest's, else Clarity's, else the hardcoded one for frames with neither. */
export function intrinsicDescription(trait: Pick<Perk, 'hash' | 'name' | 'description'>, clarity: ClarityDatabase | null | undefined): string | null {
  const manifest = trait.description || null;
  const entry = clarity?.[trait.hash];
  const fromClarity = entry ? clarityPlainText(entry) : null;
  return manifest ?? fromClarity ?? FRAME_FALLBACK[trait.name] ?? null;
}
