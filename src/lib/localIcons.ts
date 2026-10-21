import icons from '../data/localIcons.json';

/**
 * Icons the Bungie manifest can't give us (subclass buffs, debuffs, armor mods), shipped as small
 * WebP files in public/icons. Regenerate with `node scripts/build-icons.mjs`.
 */
export type LocalIconKind = 'buff' | 'mod';

const table: Record<string, string> = icons;

export function localIcon(kind: LocalIconKind, name: string): string | null {
  return table[`${kind}:${name}`] ?? null;
}
