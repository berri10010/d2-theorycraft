export interface GodRollEntry {
  weaponType: string;
  season: string | null;
  energy: string | null;
  frame: string | null;
  /** Recommended barrel / bowstring / blade perks */
  barrel: string[];
  /** Recommended magazine / battery / arrow perks */
  mag: string[];
  /** Recommended options for Trait 1 (first trait column) */
  perk1: string[];
  /** Recommended options for Trait 2 (second trait column) */
  perk2: string[];
  originTrait: string | null;
  /** Analyst notes about the weapon */
  notes: string | null;
  /** Rank within its weapon type category */
  rank: number | null;
  /** Overall tier for PvE: S / A / B / C / D */
  tier: string | null;
}

export type GodRollDatabase = Record<string, GodRollEntry>;

const SHEET_ID = '1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY';

const WEAPON_TABS = [
  'Autos', 'Bows', 'HCs', 'Pulses', 'Scouts', 'Sidearms', 'SMGs', 'BGLs',
  'Fusions', 'Glaives', 'Shotguns', 'Snipers', 'Rocket Sidearms', 'Traces',
  'HGLs', 'LFRs', 'LMGs', 'Rockets', 'Swords', 'Other', 'Exotic Weapons',
];

const TAB_TO_TYPE: Record<string, string> = {
  Autos: 'Auto Rifle',
  Bows: 'Bow',
  HCs: 'Hand Cannon',
  Pulses: 'Pulse Rifle',
  Scouts: 'Scout Rifle',
  Sidearms: 'Sidearm',
  SMGs: 'Submachine Gun',
  BGLs: 'Breech Grenade Launcher',
  Fusions: 'Fusion Rifle',
  Glaives: 'Glaive',
  Shotguns: 'Shotgun',
  Snipers: 'Sniper Rifle',
  'Rocket Sidearms': 'Rocket Sidearm',
  Traces: 'Trace Rifle',
  HGLs: 'Heavy Grenade Launcher',
  LFRs: 'Linear Fusion Rifle',
  LMGs: 'Machine Gun',
  Rockets: 'Rocket Launcher',
  Swords: 'Sword',
  Other: 'Other',
  'Exotic Weapons': 'Exotic',
};

/** Minimal RFC-4180-compliant CSV parser that handles newlines inside quoted fields. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Fetches PvE god roll data from the community Google Sheets spreadsheet.
 * Designed to run server-side (Next.js Route Handler / Server Component).
 * Fetches are de-duped and cached for 1 hour by Next.js fetch cache.
 */
export async function fetchGodRolls(): Promise<GodRollDatabase> {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
  const db: GodRollDatabase = {};

  await Promise.all(
    WEAPON_TABS.map(async (tab) => {
      try {
        const res = await fetch(base + encodeURIComponent(tab), {
          next: { revalidate: 3600 },
        });
        if (!res.ok) return;
        const text = await res.text();
        const rows = parseCSV(text);

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = r[1]?.trim();
          if (!name || name === 'Name' || r.length < 12) continue;

          const split = (s?: string): string[] =>
            s ? s.split('\n').map((p) => p.trim()).filter(Boolean) : [];

          db[name] = {
            weaponType: TAB_TO_TYPE[tab] ?? tab,
            season: r[2]?.trim() || null,
            energy: r[3]?.trim() || null,
            frame: r[4]?.trim() || null,
            barrel: split(r[7]),
            mag: split(r[8]),
            perk1: split(r[9]),
            perk2: split(r[10]),
            originTrait: r[11]?.trim() || null,
            notes: r[12]?.trim() || null,
            rank: r[13] ? parseInt(r[13], 10) || null : null,
            tier: r[14]?.trim() || null,
          };
        }
      } catch {
        // Skip tabs that fail to load
      }
    }),
  );

  return db;
}

// ──────────────────────────────────────────────────
// Column-name → god-roll field mapping
// ──────────────────────────────────────────────────

const BARREL_PATTERNS = ['barrel', 'sight', 'bowstring', 'blade', 'guard', 'battery'];
const MAG_PATTERNS = ['magazine', 'arrow', 'projectile'];

export type GodRollField = keyof Pick<GodRollEntry, 'barrel' | 'mag' | 'perk1' | 'perk2' | 'originTrait'>;

/**
 * Given a perk-socket column name (e.g. "Barrel", "Magazine", "Trait 1", "Origin Trait"),
 * returns which field in GodRollEntry holds the recommendation(s) for it,
 * or null if this column isn't tracked.
 *
 * Note: 'originTrait' maps to a string | null (single value), all others to string[].
 */
export function godRollFieldForColumn(columnName: string): GodRollField | null {
  const lower = columnName.toLowerCase();
  if (lower === 'origin trait') return 'originTrait';
  if (BARREL_PATTERNS.some((p) => lower.includes(p))) return 'barrel';
  if (MAG_PATTERNS.some((p) => lower.includes(p))) return 'mag';
  if (lower.startsWith('trait 1')) return 'perk1';
  if (lower.startsWith('trait 2')) return 'perk2';
  return null;
}
