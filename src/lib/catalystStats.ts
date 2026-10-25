import type { ClarityEntry } from './clarity';

/** Clarity's wording for a stat -> the name the site uses. */
const STAT_NAMES: Record<string, string> = {
  range: 'Range',
  stability: 'Stability',
  handling: 'Handling',
  'reload speed': 'Reload',
  'aim assist': 'Aim Assistance',
  'airborne effectiveness': 'Airborne Effectiveness',
  zoom: 'Zoom',
  'recoil direction': 'Recoil Direction',
  'ammo generation': 'Ammo Generation',
  impact: 'Impact',
  'blast radius': 'Blast Radius',
  velocity: 'Velocity',
  accuracy: 'Accuracy',
};

const STAT_RE = new RegExp(String.raw`(\d+)\s+(${Object.keys(STAT_NAMES).join('|')})\b`, 'gi');
/** A sentence that only describes when something happens, not a flat bonus. */
const CONDITIONAL_RE = /\b(while|when|whenever|upon|after|during|if|for \d)/i;

/**
 * Clarity's description of a weapon's catalyst. Most are keyed by the catalyst plug's hash, but some by an older
 * plug, so fall back to the weapon they belong to (Clarity records the weapon's hash and name on each entry).
 */
export function findCatalystEntry(
  clarity: Record<string, ClarityEntry>,
  weapon: { hash: string; name: string; catalyst?: { hash: string } | null },
): ClarityEntry | null {
  if (!weapon.catalyst) return null;
  const direct = clarity[weapon.catalyst.hash];
  if (direct) return direct;
  const isCatalyst = (e: ClarityEntry) => /Catalyst/.test(e.type ?? '');
  return Object.values(clarity).find((e) => isCatalyst(e) && String(e.itemHash) === weapon.hash)
    ?? Object.values(clarity).find((e) => isCatalyst(e) && e.itemName === weapon.name)
    ?? null;
}

/** The first line of a Clarity description, as plain text. */
export function firstLine(entry: ClarityEntry): string {
  for (const group of entry.descriptions?.en ?? []) {
    const line = (group.linesContent ?? []).map((seg) => seg.text ?? '').join('').replace(/\s+/g, ' ').trim();
    if (line) return line;
  }
  return '';
}

/**
 * The flat stat bonuses a catalyst gives, read from the start of Clarity's description ("Grants 30 Range and 20
 * Stability.", "Passively grants 15 Range, 5 Stability, and 5 Airborne Effectiveness."). Only the leading
 * sentences that start with "grants" / "increases" and are not conditional count; anything after that (stacks,
 * "while Amplified", kill rewards) is an effect, not a stat bonus, and is left to the description.
 */
export function catalystStatsFromText(line: string): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const sentence of line.split(/\.(?:\s+|$)/)) {
    const s = sentence.trim();
    if (!s) continue;
    if (!/^(passively\s+)?(grants|increases|i gain)\b/i.test(s) || CONDITIONAL_RE.test(s)) break;
    for (const m of s.matchAll(STAT_RE)) {
      const stat = STAT_NAMES[m[2].toLowerCase()];
      stats[stat] = (stats[stat] ?? 0) + Number(m[1]);
    }
  }
  return stats;
}
