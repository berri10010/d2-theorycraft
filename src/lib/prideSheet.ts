import { parseCSV } from './parseCSV';
import { PRIDE_SHEET_ID, PRIDE_SHEET_URL, type GodRollEntry, type GodRollDatabase } from './godRolls';
import { normalizeName, editDistance } from './weaponSources';

/**
 * Pride Eternal / Finnald's PvP spreadsheet -> pride.json.
 * https://docs.google.com/spreadsheets/d/1TVgtTRWNGEPi6OMlTLxXFSKUTi_ycwykhwuw8EW_jJ0
 *
 * Built on Aegis's template, but every rating is for the Crucible. Two tabs are read:
 *  - "Legendary Weapons": frame, preferred perks per column, origin trait, role notes, tier (S-F).
 *  - "Exotic Weapons": tier plus how well the weapon does in Trials / Comp / Quickplay / vs DR / Duels.
 * The result has the same shape as god-rolls.json (Aegis, PvE), so the god-roll UI can render either.
 */

export { PRIDE_SHEET_ID, PRIDE_SHEET_URL };
export const PRIDE_LEGENDARY_GID = '1601244275';
export const PRIDE_EXOTIC_GID = '780887844';
export const PRIDE_STATUS_GID = '421457262';

/** Best to worst. */
export const TIER_RANK = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
const tierIndex = (t: string | null) => { const i = t ? TIER_RANK.indexOf(t) : -1; return i < 0 ? 99 : i; };

/** The sheet's type names -> the labels god-rolls.json (Aegis) uses. */
const TYPE_LABELS: Record<string, string> = {
  'LFR': 'Linear Fusion Rifle',
  'SMG': 'Submachine Gun',
  'Special GL': 'Breech Grenade Launcher',
};

const USAGE_LABELS: Record<string, string> = { '✔': 'Optimal', '▲': 'Viable', '!': 'Situational', '✖': 'Wasted' };

/** The sheet's shorthand for perks Bungie names differently. */
const PERK_ALIASES: Record<string, string> = {
  'extended magazine': 'Extended Mag',
  'ricochet': 'Ricochet Rounds',
  'high explosive': 'High-Explosive Ordnance',
  'tempered truss': 'Tempered Truss Rod',
  'auxiliary': 'Auxiliary Reserves',
  'overclocked': 'Overclocked Heatsink',
  'fluted barrel barrel': 'Fluted Barrel',
};

/**
 * One perk cell -> perk names. Drops the comments the sheet puts in perk cells ("None (Has access to
 * Stocks instead)"), strips a trailing "(???)", and applies the aliases above.
 */
function perkNames(cell: string | undefined): string[] {
  const out: string[] = [];
  for (const raw of (cell ?? '').split(/\r?\n/)) {
    let l = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!l || /^none\b/i.test(l) || /access to|up to user|preference/i.test(raw)) continue;
    l = PERK_ALIASES[l.toLowerCase()] ?? l;
    if (!out.some((x) => x.toLowerCase() === l.toLowerCase())) out.push(l);
  }
  return out;
}

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const lines = (s: string | undefined) => (s ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && l.toLowerCase() !== 'none');

function mwLabel(cell: string | undefined): string | null {
  const parts = lines(cell);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`;
}

function normType(raw: string | undefined): string {
  const t = clean(raw);
  return TYPE_LABELS[t] ?? (t || 'Other');
}

function findHeader(rows: string[][], firstCells: string[]): number {
  return rows.findIndex((r) => firstCells.every((c, i) => clean(r[i]).toLowerCase() === c.toLowerCase()));
}

/** "Adamantite (Pit of Heresy Dungeon Variant)" -> "Adamantite"; names that are really named with parentheses are left alone. */
function baseOf(name: string): string {
  return name.replace(/\s*\((?:[^)]*variant|[^)]*season[^)]*|original[^)]*)\)\s*$/i, '').trim();
}

export interface ParsedPride {
  entries: GodRollDatabase;
  legendary: number;
  exotic: number;
  /** The status tab's "updated" date for each weapon tab, when available. */
  updated: Record<string, string>;
}

/** Merge rows of the same weapon (its variants): best tier wins, perk lists are combined. */
function mergeEntries(into: GodRollEntry, add: GodRollEntry): GodRollEntry {
  const union = (a: string[], b: string[]) => [...a, ...b.filter((x) => !a.some((y) => y.toLowerCase() === x.toLowerCase()))];
  // The better-rated variant leads, so its perks stay first (the sheet orders perks by usefulness).
  const [lead, rest] = tierIndex(add.tier) < tierIndex(into.tier) ? [add, into] : [into, add];
  return {
    ...lead,
    barrel: union(lead.barrel, rest.barrel),
    mag: union(lead.mag, rest.mag),
    perk1: union(lead.perk1, rest.perk1),
    perk2: union(lead.perk2, rest.perk2),
    originTrait: lead.originTrait ?? rest.originTrait,
    mw: lead.mw ?? rest.mw,
  };
}

export function parseLegendary(csv: string): Array<{ name: string; entry: GodRollEntry }> {
  const rows = parseCSV(csv);
  const hdr = findHeader(rows, ['Icon', 'Name', 'Type']);
  if (hdr < 0) throw new Error('Pride "Legendary Weapons" header row (Icon, Name, Type) not found');
  const H = rows[hdr].map((h) => clean(h).toLowerCase());
  const col = (n: string) => H.indexOf(n);
  const idx = {
    name: col('name'), type: col('type'), affinity: col('affinity'), frame: col('frame'), barrel: col('barrel'),
    mag: col('magazine'), mw: col('mw'), c1: col('column 1'), c2: col('column 2'), origin: col('origin trait'),
    notes: col('role / notes'), tier: col('tier'), where: col('where to get'), craft: col('craftable'),
  };
  if (Object.values(idx).some((i) => i < 0)) throw new Error('Pride "Legendary Weapons" is missing an expected column');

  const out: Array<{ name: string; entry: GodRollEntry }> = [];
  for (const r of rows.slice(hdr + 1)) {
    const name = clean(r[idx.name]);
    const tier = clean(r[idx.tier]).toUpperCase();
    if (!name || !tier) continue;
    const origin = perkNames(r[idx.origin]);
    const craftable = /^yes/i.test(clean(r[idx.craft]));
    const where = clean(r[idx.where]);
    out.push({
      name,
      entry: {
        weaponType: normType(r[idx.type]),
        season: null,
        energy: clean(r[idx.affinity]) || null,
        frame: clean(r[idx.frame]) || null,
        source: where ? `${where}${craftable ? ' (craftable)' : ''}` : null,
        barrel: perkNames(r[idx.barrel]),
        mag: perkNames(r[idx.mag]),
        mw: mwLabel(r[idx.mw]),
        perk1: perkNames(r[idx.c1]),
        perk2: perkNames(r[idx.c2]),
        originTrait: origin.length ? origin.join('\n') : null,
        notes: lines(r[idx.notes]).join('\n') || null,
        rank: null,
        tier,
      },
    });
  }
  return out;
}

export function parseExotics(csv: string): Array<{ name: string; entry: GodRollEntry }> {
  const rows = parseCSV(csv);
  const hdr = rows.findIndex((r) => clean(r[0]) === '#' && clean(r[2]).toLowerCase() === 'name');
  if (hdr < 0) throw new Error('Pride "Exotic Weapons" header row (#, INFO, Name) not found');
  const H = rows[hdr].map((h) => clean(h).toLowerCase());
  const find = (pred: (h: string) => boolean) => H.findIndex(pred);
  const idx = {
    name: find((h) => h === 'name'), tags: find((h) => h === 'tags'), desc: find((h) => h === 'description'),
    shift: find((h) => h.startsWith('weapons stat to shift')), tier: find((h) => h === 'tier'),
    trials: find((h) => h.endsWith('trials')), comp: find((h) => h === 'comp'), quick: find((h) => h === 'quickplay'),
    dr: find((h) => h === 'vs dr'), duel: find((h) => h === 'duel'),
  };
  if (Object.values(idx).some((i) => i < 0)) throw new Error('Pride "Exotic Weapons" is missing an expected column');

  const usage = (cell: string | undefined) => USAGE_LABELS[clean(cell)] ?? null;
  const out: Array<{ name: string; entry: GodRollEntry }> = [];
  for (const r of rows.slice(hdr + 1)) {
    const name = clean(r[idx.name]);
    const tier = clean(r[idx.tier]).toUpperCase();
    if (!name || !tier || !TIER_RANK.includes(tier)) continue;
    const modes = ([['Trials', idx.trials], ['Comp', idx.comp], ['Quickplay', idx.quick], ['vs DR', idx.dr], ['Duels', idx.duel]] as const)
      .map(([label, i]) => (usage(r[i]) ? `${label}: ${usage(r[i])}` : null))
      .filter(Boolean)
      .join(' · ');
    const tags = clean(r[idx.tags]);
    const shift = clean(r[idx.shift]);
    const notes = [
      ...lines(r[idx.desc]),
      shift ? `Weapons stat to shift TTK: ${shift}` : null,
      tags ? `Role: ${tags}` : null,
      modes || null,
    ].filter(Boolean).join('\n');
    out.push({
      name,
      entry: {
        weaponType: 'Exotic', season: null, energy: null, frame: null, source: null,
        barrel: [], mag: [], mw: null, perk1: [], perk2: [], originTrait: null,
        notes: notes || null, rank: null, tier,
      },
    });
  }
  return out;
}

/** Parse both tabs into one lookup-by-weapon-name database. */
export function parsePrideSheet(legendaryCsv: string, exoticCsv: string, statusCsv = ''): ParsedPride {
  const entries: GodRollDatabase = {};
  const put = (key: string, entry: GodRollEntry) => { entries[key] = entries[key] ? mergeEntries(entries[key], entry) : entry; };

  const legendary = parseLegendary(legendaryCsv);
  for (const { name, entry } of legendary) {
    put(name, entry);
    const base = baseOf(name);
    if (base !== name) put(base, entry);
  }
  const exotics = parseExotics(exoticCsv);
  for (const { name, entry } of exotics) put(name, entry);

  const updated: Record<string, string> = {};
  if (statusCsv) {
    for (const r of parseCSV(statusCsv)) {
      if (clean(r[0]) === 'Legendary Weapons' || clean(r[0]) === 'Exotic Weapons') updated[clean(r[0])] = clean(r[1]);
    }
  }
  return { entries, legendary: legendary.length, exotic: exotics.length, updated };
}

/**
 * The sheet misspells or miscapitalises some weapons ("Willful Harmatia", "Fire And Forget"). Move those
 * entries to the real weapon's exact name (the lookup is by exact name), matching on a normalised name
 * within two edits. Returns the names that found no weapon.
 */
export function rekeyToWeapons(entries: GodRollDatabase, weaponNames: string[]): string[] {
  const exact = new Set(weaponNames);
  const byLower = new Map(weaponNames.map((n) => [n.toLowerCase(), n]));
  const normalised = weaponNames.map((n) => ({ name: n, key: normalizeName(n) }));
  const unmatched: string[] = [];
  for (const key of Object.keys(entries)) {
    if (exact.has(key) || /\(.*(variant|season)/i.test(key)) continue;
    let target = byLower.get(key.toLowerCase()) ?? null;
    if (!target) {
      const k = normalizeName(key);
      let bestD = 3;
      for (const w of normalised) {
        const d = editDistance(k, w.key, 2);
        if (d <= 2 && k.length > 6 && d < bestD) { bestD = d; target = w.name; }
      }
    }
    if (!target) { unmatched.push(key); continue; }
    if (!entries[target]) entries[target] = entries[key];
    delete entries[key];
  }
  return unmatched;
}

/**
 * Snap the remaining misspelled perk names ("Ambition Assassin", "Destablizing Rounds") to real perk
 * names: the closest one within two edits, and only when it is unambiguous. Returns how many were fixed.
 */
export function snapPerkNames(entries: GodRollDatabase, perkNames: string[]): number {
  const real = new Map<string, string>();
  for (const n of perkNames) real.set(n.toLowerCase(), n);
  const normalised = [...real.values()].map((n) => ({ name: n, key: normalizeName(n) }));
  const cache = new Map<string, string | null>();
  const snap = (name: string): string => {
    const exact = real.get(name.toLowerCase());
    if (exact) return exact;
    if (!cache.has(name)) {
      const k = normalizeName(name);
      let best: { name: string; d: number } | null = null;
      let tie = false;
      if (k.length > 6) {
        for (const w of normalised) {
          const d = editDistance(k, w.key, 2);
          if (d > 2) continue;
          if (!best || d < best.d) { best = { name: w.name, d }; tie = false; }
          else if (d === best.d && w.name !== best.name) tie = true;
        }
      }
      cache.set(name, best && !tie ? best.name : null);
    }
    return cache.get(name) ?? name;
  };
  let fixed = 0;
  const fix = (list: string[]) => list.map((n) => { const s = snap(n); if (s !== n) fixed++; return s; });
  for (const e of Object.values(entries)) {
    e.barrel = fix(e.barrel);
    e.mag = fix(e.mag);
    e.perk1 = fix(e.perk1);
    e.perk2 = fix(e.perk2);
    if (e.originTrait) e.originTrait = fix(e.originTrait.split('\n')).join('\n');
  }
  return fixed;
}
