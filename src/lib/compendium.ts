/**
 * Server-side fetcher for the Destiny Data Compendium.
 * https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4
 *
 * Runs on the Next.js server (user's machine) which can reach Google Sheets.
 * Responses are cached for 24 hours via Next.js fetch cache.
 */

const COMPENDIUM_ID = '1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4';
const BASE = `https://docs.google.com/spreadsheets/d/${COMPENDIUM_ID}/gviz/tq?tqx=out:csv&sheet=`;

export interface PerkDescription {
  /** Full description including enhanced markers (↑) */
  description: string;
  /** Base (non-enhanced) description only */
  baseDescription: string;
  /** Text fragments that are exclusive to enhanced versions */
  enhancedBonuses: string[];
  section: string;
}

export type PerkDescriptionDatabase = Record<string, PerkDescription>;

// ── CSV parser ────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const SKIP_NAMES = new Set([
  'Weapon Traits', 'Weapon Mods', 'Intrinsic Traits', 'Origin Traits',
  'Armor Set Bonuses', 'Perk', 'Gear Perks, Traits, and Mods',
  'Enhanced Traits will have their bonuses in',
]);

// ── Gear Perks fetcher ────────────────────────────────────────────────

export async function fetchPerkDescriptions(): Promise<PerkDescriptionDatabase> {
  const res = await fetch(BASE + encodeURIComponent('Gear Perks'), {
    next: { revalidate: 86400 }, // cache 24 hours
  });
  if (!res.ok) throw new Error(`Compendium fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);

  const db: PerkDescriptionDatabase = {};
  let section = 'Weapon Traits';

  for (const r of rows) {
    const name = r[0]?.trim();
    const desc = r[2]?.trim(); // column C holds descriptions

    if (!name) continue;

    // Section header detection
    if (['Weapon Traits', 'Weapon Mods', 'Intrinsic Traits', 'Origin Traits', 'Armor Set Bonuses'].includes(name)) {
      section = name;
      continue;
    }
    if (SKIP_NAMES.has(name) || name.startsWith('↑') || name.startsWith('(')) continue;
    if (!desc || desc.length < 10) continue;

    // Split base vs enhanced:
    // ↑text marks bonus that only applies to the enhanced version.
    const baseDescription = desc
      .replace(/↑[^\n]*/g, '')
      .replace(/\n+/g, '\n')
      .replace(/\n/g, ' ')
      .trim();

    const enhancedBonuses = Array.from(desc.matchAll(/↑([^\n]+)/g)).map((m) => m[1].trim());

    db[name] = {
      description: desc.replace(/\n/g, ' ').trim(),
      baseDescription,
      enhancedBonuses,
      section,
    };
  }

  return db;
}
