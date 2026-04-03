/**
 * Fetches perk descriptions from the Database-Clarity community database.
 * Keyed by perk hash (number stored as string key).
 * https://github.com/Database-Clarity/Live-Clarity-Database
 *
 * Each entry's description is a list of "line groups", each containing
 * "linesContent" segments — either plain text or element/icon class names
 * (e.g. { classNames: ["strand"] }).  The classNames reference DIM's custom
 * icon font; we render them as small coloured inline badges instead.
 */

const CLARITY_URL =
  'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/master/descriptions/clarity.json';

export interface ClarityLineContent {
  text?: string;
  classNames?: string[];
}

export interface ClarityDescriptionGroup {
  linesContent: ClarityLineContent[];
}

export interface ClarityEntry {
  hash: number;
  name: string;
  /** e.g. "Weapon Trait Exotic", "Weapon Trait Legendary", "Origin Trait", "Armor Mod General" */
  type: string;
  lastUpload?: number;
  uploadedBy?: string;
  /** Optional: for exotic perks, the weapon/armor this perk belongs to */
  itemHash?: number;
  itemName?: string;
  descriptions: {
    en: ClarityDescriptionGroup[];
  };
}

export type ClarityDatabase = Record<string, ClarityEntry>;

/**
 * Server-side fetch of the full Clarity database.
 * Only weapon-relevant entries are returned to keep the client payload small.
 * Next.js will cache the server-side fetch for 24 hours.
 */
export async function fetchClarityDescriptions(): Promise<ClarityDatabase> {
  const res = await fetch(CLARITY_URL, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Clarity fetch failed: ${res.status}`);
  const full = await res.json() as ClarityDatabase;

  // Filter to weapon-relevant entries only (drops armor mods/traits, etc.)
  const filtered: ClarityDatabase = {};
  for (const [key, entry] of Object.entries(full)) {
    const t = entry.type ?? '';
    if (
      t.includes('Weapon') ||
      t.includes('Origin Trait') ||
      t.includes('Intrinsic')
    ) {
      filtered[key] = entry;
    }
  }
  return filtered;
}
