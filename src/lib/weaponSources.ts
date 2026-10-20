import { parseCSV } from './parseCSV';

/**
 * Where each weapon drops, from Sax's "ALL Monument of Triumph Legendary Loot Sources" sheet
 * (https://docs.google.com/spreadsheets/d/1WDj-vExf9c982PVc1nRRfjadhkcZFqa7nv14cCMI8C8).
 * Tabs: Vendors, Destinations, Dungeons, Raids and Craftable Weapon Sources.
 */

export const SAX_SHEET_ID = '1WDj-vExf9c982PVc1nRRfjadhkcZFqa7nv14cCMI8C8';
export const SAX_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SAX_SHEET_ID}`;
export const SAX_TABS = ['Vendors', 'Destinations', 'Dungeons', 'Raids', 'Craftable Weapon Sources'] as const;
export type SaxTab = (typeof SAX_TABS)[number];

export type SourceKind = 'vendor' | 'destination' | 'dungeon' | 'raid' | 'craft';

export interface WeaponSource {
  kind: SourceKind;
  /** Vendor, destination, dungeon or raid name (or the craft source for `craft`). */
  place: string;
  /** Raid encounter(s) that drop it. */
  encounters?: string;
  /** How a vendor sells it (Purchase, Focused Decoding, ...). */
  method?: string;
  notes?: string;
  /** From the sheet: the weapon has Tier 1-5 variants / can be crafted. */
  tiered?: boolean;
  craftable?: boolean;
}

export type WeaponSourceDatabase = Record<string, WeaponSource[]>;

const TAB_KIND: Record<Exclude<SaxTab, 'Craftable Weapon Sources'>, SourceKind> = {
  Vendors: 'vendor', Destinations: 'destination', Dungeons: 'dungeon', Raids: 'raid',
};

/** Lowercase, drop accents and punctuation: "Fang of Ir Yut" matches regardless of diacritics. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Normalised name without a version suffix: "Reckless Oracle | Rev. 1" -> "reckless oracle". */
function stripVersion(s: string): string {
  return normalizeName(s.replace(/\|\s*rev\.?\s*\d+/i, '').replace(/\((?:adept|timelost|harrowed|brave)\)?/i, ''));
}

interface SheetRow { name: string; type: string; source: WeaponSource }

/** Turn one tab's CSV into rows (armour and section headers dropped). */
export function parseSaxTab(tab: SaxTab, csv: string): SheetRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];
  const header = rows[0];
  const out: SheetRow[] = [];

  if (tab === 'Craftable Weapon Sources') {
    // "", Weapon Name, Type, Source, Note, ...
    for (const r of rows.slice(1)) {
      const name = r[1]?.trim();
      if (!name || !r[3]?.trim() || r[3].trim() === '?') continue; // "?" = source not known yet
      out.push({
        name,
        type: r[2]?.trim() ?? '',
        source: { kind: 'craft', place: r[3].trim(), notes: r[4]?.trim() || undefined, craftable: true },
      });
    }
    return out;
  }

  const col = (label: string) => header.findIndex((h) => h.trim() === label);
  const iLoot = col('Loot'), iTier = col('Tiered?'), iType = col('Loot Type'), iCraft = col('Craftable?');
  const iMethod = col('Acquisition Method'), iEnc = col('Encounter(s)'), iNotes = col('Notes');
  let place = '';

  for (const r of rows.slice(1)) {
    const loot = r[iLoot]?.trim();
    if (!loot) { if (r[1]?.trim()) place = r[1].trim(); continue; } // "", Place, "", ... = section header
    const type = r[iType]?.trim() ?? '';
    if (/armor$/i.test(type) || /armor$/i.test(loot)) continue;
    out.push({
      name: loot,
      type,
      source: {
        kind: TAB_KIND[tab],
        place,
        encounters: iEnc >= 0 ? r[iEnc]?.trim() || undefined : undefined,
        method: iMethod >= 0 ? r[iMethod]?.trim() || undefined : undefined,
        notes: iNotes >= 0 ? r[iNotes]?.trim() || undefined : undefined,
        tiered: iTier >= 0 ? /^yes$/i.test(r[iTier]?.trim() ?? '') : undefined,
        craftable: iCraft >= 0 ? /^yes$/i.test(r[iCraft]?.trim() ?? '') : undefined,
      },
    });
  }
  return out;
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Match sheet weapon names to real weapons (exact, then without version suffixes, then a
 * small edit distance for the sheet's typos) and key the sources by the weapon's own name.
 */
export function buildSourceTable(
  tabs: Partial<Record<SaxTab, string>>,
  weapons: Array<{ name: string; baseName: string }>,
): { sources: WeaponSourceDatabase; unmatched: string[] } {
  const exact = new Map<string, string>(); // normalised full name -> weapon name
  const loose = new Map<string, string>(); // normalised, version-stripped -> weapon name (base preferred)
  for (const w of weapons) {
    exact.set(normalizeName(w.name), w.name);
    const key = stripVersion(w.name);
    if (!loose.has(key) || w.name === w.baseName) loose.set(key, w.name);
  }
  const looseKeys = [...loose.keys()];

  const resolve = (sheetName: string): string | null => {
    const e = exact.get(normalizeName(sheetName));
    if (e) return e;
    const key = stripVersion(sheetName);
    const l = loose.get(key);
    if (l) return l;
    if (key.length < 8) return null;
    let best: string | null = null;
    let bestD = 3;
    let tie = false;
    for (const k of looseKeys) {
      const d = editDistance(key, k, 2);
      if (d < bestD) { best = k; bestD = d; tie = false; }
      else if (d === bestD) tie = true;
    }
    return best && !tie && bestD <= 2 ? loose.get(best)! : null;
  };

  const sources: WeaponSourceDatabase = {};
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const tab of SAX_TABS) {
    const csv = tabs[tab];
    if (!csv) continue;
    for (const row of parseSaxTab(tab, csv)) {
      const weapon = resolve(row.name);
      if (!weapon) { unmatched.push(`${tab}: ${row.name}`); continue; }
      const sig = [weapon, row.source.kind, row.source.place, row.source.encounters ?? '', row.source.method ?? ''].join('|');
      if (seen.has(sig)) continue;
      seen.add(sig);
      (sources[weapon] ??= []).push(row.source);
    }
  }
  return { sources, unmatched };
}

export function lookupSources(db: WeaponSourceDatabase, weapon: { name: string; baseName: string }): WeaponSource[] {
  return db[weapon.name] ?? db[weapon.baseName] ?? [];
}

const KIND_LABEL: Record<SourceKind, string> = {
  vendor: 'Vendor', destination: 'Destination', dungeon: 'Dungeon', raid: 'Raid', craft: 'Craft',
};

/** "Raid · Pantheon - Consecrated Mind", "Vendor · Xur (Purchase)". */
export function describeSource(s: WeaponSource): string {
  const where = s.encounters ? `${s.place} — ${s.encounters}` : s.place;
  const how = s.method ? ` (${s.method})` : '';
  return `${KIND_LABEL[s.kind]} · ${where}${how}`;
}
