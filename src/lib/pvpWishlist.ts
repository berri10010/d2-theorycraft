import type { Weapon } from '../types/weapon';

/**
 * r/CrucibleGuidebook community PvP wishlist -> per-weapon recommended perks.
 *
 * Source: Wunderkammern/CrucibleGuidebook-PVP-DIM-Wishlist (a DIM wishlist built from the
 * r/CrucibleGuidebook community sheet by u/SirTurnUp). Each weapon is a block of
 * `dimwishlist:item=<hash>&perks=<a,b,c,d>` lines enumerating every recommended combination;
 * we collapse those back into "recommended perks per column", the shape the god-roll panel uses.
 */

export const PVP_WISHLIST_URL =
  'https://raw.githubusercontent.com/Wunderkammern/CrucibleGuidebook-PVP-DIM-Wishlist/refs/heads/main/r_CrucibleGuidebook%20Community%20PVP%20Wishlist.txt';

export interface PvpWishlistEntry {
  barrel: string[];
  mag: string[];
  perk1: string[];
  perk2: string[];
  originTrait: string | null;
  /** Recommended masterwork, e.g. "Range, Stability or Handling". */
  mw: string | null;
  notes: string | null;
}

export type PvpWishlistDatabase = Record<string, PvpWishlistEntry>;

export interface WishlistBlock {
  /** Display name from the "// Name (pvp)" comment. */
  label: string;
  notes: string[];
  /** Perk hashes of each combination line. */
  combos: string[][];
  itemHash: string;
}

/** Split the wishlist text into one block per weapon. */
export function parseWishlistBlocks(text: string): WishlistBlock[] {
  const blocks: WishlistBlock[] = [];
  let label = '';
  let notes: string[] = [];
  let current: WishlistBlock | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('//notes:')) { notes.push(line.slice('//notes:'.length).trim()); continue; }
    if (line.startsWith('//')) {
      label = line.slice(2).trim();
      notes = [];
      current = null;
      continue;
    }
    if (!line.startsWith('dimwishlist:')) continue;

    const params = new URLSearchParams(line.slice('dimwishlist:'.length));
    const item = params.get('item');
    const perks = (params.get('perks') ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    if (!item || item.startsWith('-') || perks.length === 0) continue;

    if (!current || current.itemHash !== item) {
      current = { label, notes: [...notes], combos: [], itemHash: item };
      blocks.push(current);
    }
    current.combos.push(perks);
  }
  return blocks;
}

/** "Range, Stability, or Handling masterwork tags:pvp" -> the masterwork list and any other note text. */
export function splitNotes(notes: string[]): { mw: string | null; notes: string | null } {
  let mw: string | null = null;
  const rest: string[] = [];
  for (const raw of notes) {
    const cleaned = raw.replace(/\btags:\S+/gi, '').trim().replace(/[.\s]+$/, '');
    if (!cleaned) continue;
    const m = /^(.*?)\s+masterwork$/i.exec(cleaned);
    if (m) mw = mw ?? m[1].replace(/,\s+or\s+/i, ' or ').trim();
    else rest.push(cleaned);
  }
  return { mw, notes: rest.length ? rest.join(' · ') : null };
}

type Slot = 'barrel' | 'mag' | 'perk1' | 'perk2' | 'origin';

/**
 * Build wishlist entries keyed by weapon family (baseName). Perks are matched to the weapon's own
 * sockets by hash (base or enhanced), so recommendations always name perks the weapon really has.
 * Blocks whose weapon hash isn't in `weapons` are reported in `unmatched`.
 */
export function buildPvpEntries(
  blocks: WishlistBlock[],
  weapons: Weapon[],
): { entries: PvpWishlistDatabase; unmatched: string[] } {
  const byHash = new Map(weapons.map((w) => [w.hash, w]));
  const entries: PvpWishlistDatabase = {};
  const unmatched: string[] = [];

  for (const block of blocks) {
    const weapon = byHash.get(block.itemHash);
    if (!weapon) { unmatched.push(`${block.label} (${block.itemHash})`); continue; }

    const perkCols = weapon.perkSockets.filter((c) => c.columnType === 'perk');
    const slotOf = (hash: string): { slot: Slot; name: string } | null => {
      for (const col of weapon.perkSockets) {
        for (const perk of col.perks) {
          if (perk.hash !== hash && perk.enhancedVersion?.hash !== hash) continue;
          if (col.columnType === 'barrel') return { slot: 'barrel', name: perk.name };
          if (col.columnType === 'mag') return { slot: 'mag', name: perk.name };
          if (col.columnType === 'origin') return { slot: 'origin', name: perk.name };
          return { slot: perkCols.indexOf(col) === 0 ? 'perk1' : 'perk2', name: perk.name };
        }
      }
      return null;
    };

    const entry: PvpWishlistEntry = entries[weapon.baseName] ?? {
      barrel: [], mag: [], perk1: [], perk2: [], originTrait: null, mw: null, notes: null,
    };
    const origin: string[] = entry.originTrait ? entry.originTrait.split('\n') : [];
    const add = (list: string[], name: string) => { if (!list.includes(name)) list.push(name); };

    for (const combo of block.combos) {
      for (const hash of combo) {
        const hit = slotOf(hash);
        if (!hit) continue;
        if (hit.slot === 'origin') add(origin, hit.name);
        else add(entry[hit.slot], hit.name);
      }
    }
    entry.originTrait = origin.length ? origin.join('\n') : null;

    const { mw, notes } = splitNotes(block.notes);
    entry.mw = entry.mw ?? mw;
    if (notes && !(entry.notes ?? '').includes(notes)) entry.notes = [entry.notes, notes].filter(Boolean).join(' · ');
    entries[weapon.baseName] = entry;
  }

  return { entries, unmatched };
}

/** Look a weapon up by exact name, then by family name (same order as god rolls). */
export function lookupPvpEntry(
  db: PvpWishlistDatabase,
  weapon: { name: string; baseName: string },
): PvpWishlistEntry | null {
  return db[weapon.name] ?? db[weapon.baseName] ?? null;
}
