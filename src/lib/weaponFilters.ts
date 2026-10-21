/**
 * Pure filter, sort and season-label logic for the weapon database sidebar.
 * Kept free of React so it can be unit-tested.
 */

import type { Weapon, WeaponGroup } from '../types/weapon';

export const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
export const SLOT_LABELS: Record<number, string> = { 1: 'Kinetic', 2: 'Energy', 3: 'Power' };

export type SortMode = 'alpha' | 'season' | 'tier';
export type SortDir  = 'asc'   | 'desc';
export const DEFAULT_DIR: Record<SortMode, SortDir> = { alpha: 'asc', season: 'asc', tier: 'asc' };

export const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
// ─── Filter types ─────────────────────────────────────────────────────────────

export interface MultiFilter { inc: string[]; exc: string[] }

export interface FilterState {
  weaponType: MultiFilter;
  frame:      MultiFilter;
  trait:      MultiFilter;   // perks in 'perk' columnType columns (3 & 4)
  perkTier:   MultiFilter;   // S/A/B/C tier rating on perk-column perks
  energy:     MultiFilter;
  ammo:       MultiFilter;
  slot:       MultiFilter;   // Kinetic / Energy / Power (derived from ammoType)
  rarity:     MultiFilter;
  perk:       MultiFilter;   // any perk in any column
  col1:       MultiFilter;
  col2:       MultiFilter;
  col3:       MultiFilter;
  col4:       MultiFilter;
  col5:       MultiFilter;
  source:     MultiFilter;
  season:     MultiFilter;
  foundry:    MultiFilter;
  weaponTier: MultiFilter;
  featured:      boolean;
  craftableOnly: boolean;
  adeptOnly:     boolean;
  sunsetOnly:    boolean;
}

export type MultiKey = Exclude<keyof FilterState, 'featured' | 'craftableOnly' | 'adeptOnly' | 'sunsetOnly'>;
export type ToggleKey = 'featured' | 'craftableOnly' | 'adeptOnly' | 'sunsetOnly';

export const emptyMF = (): MultiFilter => ({ inc: [], exc: [] });

export const DEFAULT_FILTERS: FilterState = {
  weaponType: emptyMF(), frame: emptyMF(), trait: emptyMF(), perkTier: emptyMF(),
  energy: emptyMF(), ammo: emptyMF(), slot: emptyMF(), rarity: emptyMF(),
  perk: emptyMF(), col1: emptyMF(), col2: emptyMF(), col3: emptyMF(),
  col4: emptyMF(), col5: emptyMF(), source: emptyMF(), season: emptyMF(),
  foundry: emptyMF(), weaponTier: emptyMF(),
  featured: false, craftableOnly: false, adeptOnly: false, sunsetOnly: false,
};

// ─── Category / toggle config ─────────────────────────────────────────────────

export type CategoryId = MultiKey | 'column';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  filterKey?: MultiKey;
  noSearch?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'weaponType', label: 'Weapon Type', filterKey: 'weaponType' },
  { id: 'frame',      label: 'Frame',       filterKey: 'frame' },
  { id: 'trait',      label: 'Trait',       filterKey: 'trait' },
  { id: 'perkTier',   label: 'Perk Tier',   filterKey: 'perkTier', noSearch: true },
  { id: 'energy',     label: 'Energy',      filterKey: 'energy' },
  { id: 'ammo',       label: 'Ammo',        filterKey: 'ammo' },
  { id: 'slot',       label: 'Slot',        filterKey: 'slot' },
  { id: 'rarity',     label: 'Rarity',      filterKey: 'rarity' },
  { id: 'perk',       label: 'Perk',        filterKey: 'perk' },
  { id: 'column',     label: 'Column 1–5' },
  { id: 'source',     label: 'Source',      filterKey: 'source' },
  { id: 'season',     label: 'Season',      filterKey: 'season' },
  { id: 'foundry',    label: 'Foundry',     filterKey: 'foundry' },
  { id: 'weaponTier', label: 'Aegis Tier',  filterKey: 'weaponTier', noSearch: true },
];

export const COL_SUBCATS: { id: MultiKey; label: string }[] = [
  { id: 'col1', label: 'Barrel' },
  { id: 'col2', label: 'Magazine' },
  { id: 'col3', label: 'Perk 1' },
  { id: 'col4', label: 'Perk 2' },
  { id: 'col5', label: 'Origin' },
];

export const TOGGLE_DEFS: { id: ToggleKey; label: string }[] = [
  { id: 'featured',      label: 'Featured' },
  { id: 'craftableOnly', label: 'Craftable' },
  { id: 'adeptOnly',     label: 'Adept' },
  { id: 'sunsetOnly',    label: 'Sunset' },
];

// ─── Filter logic helpers ─────────────────────────────────────────────────────

export function cycleFilter(f: FilterState, key: MultiKey, val: string): FilterState {
  const { inc, exc } = f[key];
  if (inc.includes(val)) return { ...f, [key]: { inc: inc.filter(v => v !== val), exc: [...exc, val] } };
  if (exc.includes(val)) return { ...f, [key]: { inc, exc: exc.filter(v => v !== val) } };
  return { ...f, [key]: { inc: [...inc, val], exc } };
}

export function matchesMF(mf: MultiFilter, val: string): boolean {
  if (mf.exc.includes(val)) return false;
  if (mf.inc.length > 0 && !mf.inc.includes(val)) return false;
  return true;
}

export function matchesMFAny(mf: MultiFilter, vals: string[]): boolean {
  if (mf.inc.length === 0 && mf.exc.length === 0) return true;
  if (mf.exc.length > 0 && vals.some(v => mf.exc.includes(v))) return false;
  if (mf.inc.length > 0 && !vals.some(v => mf.inc.includes(v))) return false;
  return true;
}

export function chipMode(mf: MultiFilter, val: string): 'none' | 'inc' | 'exc' {
  if (mf.inc.includes(val)) return 'inc';
  if (mf.exc.includes(val)) return 'exc';
  return 'none';
}

export function countMF(mf: MultiFilter) { return mf.inc.length + mf.exc.length; }

export function colCount(f: FilterState) {
  return countMF(f.col1) + countMF(f.col2) + countMF(f.col3) + countMF(f.col4) + countMF(f.col5);
}

export function categoryCount(f: FilterState, cat: CategoryDef): number {
  if (cat.id === 'column') return colCount(f);
  return cat.filterKey ? countMF(f[cat.filterKey]) : 0;
}

export function totalFilterCount(f: FilterState): number {
  return (
    countMF(f.weaponType) + countMF(f.frame) + countMF(f.trait) + countMF(f.perkTier) +
    countMF(f.energy) + countMF(f.ammo) + countMF(f.slot) + countMF(f.rarity) +
    countMF(f.perk) + colCount(f) + countMF(f.source) + countMF(f.season) + countMF(f.foundry) + countMF(f.weaponTier) +
    (f.featured ? 1 : 0) + (f.craftableOnly ? 1 : 0) + (f.adeptOnly ? 1 : 0) + (f.sunsetOnly ? 1 : 0)
  );
}

// ─── Filter suggestions while typing ──────────────────────────────────────────

/** A filter the search box offers to add for what the user has typed. */
export type FilterSuggestion =
  | { kind: 'multi';  key: MultiKey;  value: string;  label: string; category: string }
  | { kind: 'toggle'; key: ToggleKey; value: '';      label: string; category: string };

/** Categories offered as suggestions, in tie-break order. Perk matches any column. */
const SUGGEST_CATEGORIES: { key: MultiKey; category: string; label?: (v: string) => string }[] = [
  { key: 'weaponType', category: 'Weapon type' },
  { key: 'frame',      category: 'Frame', label: v => v.replace(/ Frame$/, '') },
  { key: 'energy',     category: 'Energy', label: v => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'ammo',       category: 'Ammo' },
  { key: 'slot',       category: 'Slot' },
  { key: 'rarity',     category: 'Rarity' },
  { key: 'perk',       category: 'Perk' },
  { key: 'foundry',    category: 'Foundry' },
  { key: 'season',     category: 'Season' },
  { key: 'source',     category: 'Source' },
];

/** 0 = starts with the text, 1 = a word starts with it, 2 = contains it, null = no match. */
function matchRank(text: string, q: string): number | null {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 0;
  if (t.split(/[\s\-–:/]+/).some(w => w.startsWith(q))) return 1;
  return t.includes(q) ? 2 : null;
}

/**
 * Filters worth offering for the typed text: frames, perks, weapon types, elements and so on whose name
 * matches, best matches first. Values already included are left out.
 */
export function filterSuggestions(
  query: string,
  options: Record<MultiKey, string[]>,
  filters: FilterState,
  limit = 8,
): FilterSuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const found: Array<{ rank: number; order: number; s: FilterSuggestion }> = [];
  SUGGEST_CATEGORIES.forEach(({ key, category, label }, order) => {
    for (const value of options[key] ?? []) {
      if (filters[key].inc.includes(value)) continue;
      const shown = label ? label(value) : value;
      const rank = matchRank(shown, q);
      if (rank !== null) found.push({ rank, order, s: { kind: 'multi', key, value, label: shown, category } });
    }
  });
  for (const t of TOGGLE_DEFS) {
    if (filters[t.id]) continue;
    const rank = matchRank(t.label, q);
    if (rank !== null) found.push({ rank, order: -1, s: { kind: 'toggle', key: t.id, value: '', label: t.label, category: 'Filter' } });
  }

  found.sort((a, b) => a.rank - b.rank || a.order - b.order || a.s.label.length - b.s.label.length || a.s.label.localeCompare(b.s.label));
  return found.slice(0, limit).map(f => f.s);
}

// ─── Season / event helpers ───────────────────────────────────────────────────

export const UNLABELLED_SEASON_NAMES: Record<number, string> = { 1: 'The Red War' };

export const EVENT_WATERMARKS: Record<string, string> = {
  '50c3ebe414c6946429934d79504922fa': 'Dawning',
  '83fbcacd223402c09af4b7ab067f8cce': 'Dawning',
  '53dc0b02306726ff1517af33ac908cef': 'Festival of the Lost',
  '9c091ec0e22c01dacc25efb63b46eb9b': 'Solstice',
  'fe8bcc20fbfaf4cac69dfb640bb0b84e': 'Vow of the Disciple',
};

export function eventLabelFor(iconWatermark: string | null): string | null {
  if (!iconWatermark) return null;
  const hash = (iconWatermark.split('/').pop() ?? '').replace('.png', '');
  return EVENT_WATERMARKS[hash] ?? null;
}

export function weaponSeasonLabel(w: Weapon): string | null {
  if (w.seasonName) return w.seasonName;
  const ev = eventLabelFor(w.iconWatermark);
  if (ev) return ev;
  if (w.seasonNumber !== null) return UNLABELLED_SEASON_NAMES[w.seasonNumber] ?? null;
  return null;
}

export function bestSeasonNumber(g: WeaponGroup): number {
  return Math.max(...g.variants.map(v => v.seasonNumber ?? -1));
}

export function bestSeasonName(g: WeaponGroup): string | null {
  return g.variants.map(v => weaponSeasonLabel(v)).find(Boolean) ?? null;
}

// ─── Perk value extraction ────────────────────────────────────────────────────

export function getPerkValues(w: Weapon) {
  const all: string[] = [];
  const traits: string[] = [];
  const cols: string[][] = [];
  w.perkSockets.forEach((col, i) => {
    const names = col.perks.map(p => p.name).filter(Boolean);
    cols[i] = names;
    all.push(...names);
    if (col.columnType === 'perk') traits.push(...names);
  });
  return { all, traits, cols };
}
