import icons from '../data/localIcons.json';
import { BUNGIE_URL } from './bungieUrl';

/**
 * Icons for the damage-buff toggles and armor-mod rows, neither of which stores its own.
 * Most are Bungie CDN paths taken from the manifest; a few the manifest lacks are small WebP files in
 * public/icons. Regenerate with `node scripts/build-icons.mjs`.
 */
export type LocalIconKind = 'buff' | 'mod';

const table: Record<string, string> = icons;

export function localIcon(kind: LocalIconKind, name: string): string | null {
  const path = table[`${kind}:${name}`];
  if (!path) return null;
  return path.startsWith('/icons/') ? path : BUNGIE_URL + path;
}
