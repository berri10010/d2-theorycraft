import buffData from '../data/buffs.json';

export type BuffCategory = 'weapon_perk' | 'subclass' | 'mod';

export interface DamageBuff {
  hash: string;
  name: string;
  /** UI grouping: weapon_perk | subclass | mod */
  category: BuffCategory;
  type: 'empowering' | 'perk' | 'surge';
  multiplier: number;
  description: string;
  /** Perk names that auto-activate this buff when selected */
  perkNames: string[];
  /**
   * Bungie CDN icon path (relative, without root).
   * For weapon_perk buffs this is typically null — the UI uses the live perk icon instead.
   * For subclass / mod buffs this is the ability/mod icon from the manifest.
   */
  icon?: string | null;
}

export const BUFF_DATABASE = buffData as Record<string, DamageBuff>;

/** Returns the buff key for a given perk name, or null if none. */
export function getBuffKeyForPerk(perkName: string): string | null {
  for (const [key, buff] of Object.entries(BUFF_DATABASE)) {
    if (buff.perkNames.includes(perkName)) return key;
  }
  return null;
}
