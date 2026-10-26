/** A roll the user saved from the Wishlist panel. */
export interface PersonalRoll {
  weaponHash: string;
  weaponName: string;
  perkHashes: string[];
  savedAt: string; // ISO date
}

function isPersonalRoll(value: unknown): value is PersonalRoll {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.weaponHash === 'string'
    && typeof r.weaponName === 'string'
    && typeof r.savedAt === 'string'
    && Array.isArray(r.perkHashes)
    && r.perkHashes.every((h) => typeof h === 'string');
}

/** Saved rolls from a localStorage string. Anything unreadable or oddly shaped yields fewer rolls, never an error. */
export function parsePersonalRolls(raw: string | null): PersonalRoll[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPersonalRoll) : [];
  } catch {
    return [];
  }
}
