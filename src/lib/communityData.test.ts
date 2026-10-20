import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseCSV } from './parseCSV';
import {
  parseWishlistBlocks, splitNotes, buildPvpEntries, lookupPvpEntry,
  type PvpWishlistDatabase, type PvpWishlistEntry,
} from './pvpWishlist';
import {
  normalizeName, parseSaxTab, buildSourceTable, describeSource, lookupSources,
  type WeaponSourceDatabase,
} from './weaponSources';
import { pvpGodRoll, type GodRollEntry } from './godRolls';
import { loadRealData } from '../test/realData';
import type { Weapon, Perk } from '../types/weapon';

const readData = <T,>(file: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', file), 'utf8')) as T;

describe('parseCSV', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields', () => {
    expect(parseCSV('a,"b,c","d ""q"""\n"x\ny",,z\n')).toEqual([['a', 'b,c', 'd "q"'], ['x\ny', '', 'z']]);
  });
  it('copes with CRLF and a missing trailing newline', () => {
    expect(parseCSV('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

// ── PvP wishlist ────────────────────────────────────────────────────────────

const perk = (hash: string, name: string, enhancedVersion: Perk | null = null) => ({ hash, name, enhancedVersion }) as unknown as Perk;
const weapon = (hash: string, name: string, baseName = name): Weapon => ({
  hash, name, baseName,
  perkSockets: [
    { name: 'Barrel', columnType: 'barrel', perks: [perk('b1', 'Arrowhead Brake'), perk('b2', 'Fluted Barrel')] },
    { name: 'Magazine', columnType: 'mag', perks: [perk('m1', 'Accurized Rounds')] },
    { name: 'Perk 1', columnType: 'perk', perks: [perk('t1', 'Headseeker', perk('t1e', 'Headseeker')), perk('t2', 'Keep Away')] },
    { name: 'Perk 2', columnType: 'perk', perks: [perk('t3', 'Kill Clip'), perk('t4', 'Zen Moment')] },
    { name: 'Origin', columnType: 'origin', perks: [perk('o1', 'Hammerhead')] },
  ],
}) as unknown as Weapon;

const WISHLIST = `title:Test

// The Martlet (pvp)
//notes: Range, Stability, or Handling masterwork tags:pvp
dimwishlist:item=1&perks=b1,m1,t1,t3
dimwishlist:item=1&perks=b2,m1,t2,t3
dimwishlist:item=1&perks=b2,m1,t2,t4,o1

// Other (pvp)
//notes: tags:pvp
dimwishlist:item=999&perks=b1
dimwishlist:item=-5&perks=b1
`;

describe('parseWishlistBlocks', () => {
  const blocks = parseWishlistBlocks(WISHLIST);
  it('makes one block per weapon with its combinations and notes', () => {
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ label: 'The Martlet (pvp)', itemHash: '1' });
    expect(blocks[0].combos).toHaveLength(3);
    expect(blocks[0].notes[0]).toContain('masterwork');
  });
  it('skips negative (exclusion) items', () => {
    expect(blocks.every((b) => b.itemHash !== '-5')).toBe(true);
  });
});

describe('splitNotes', () => {
  it('extracts the masterwork and drops tags', () => {
    expect(splitNotes(['Range, Stability, or Handling masterwork tags:pvp'])).toEqual({ mw: 'Range, Stability or Handling', notes: null });
    expect(splitNotes(['Range masterwork tags:pvp'])).toEqual({ mw: 'Range', notes: null });
  });
  it('keeps other note text', () => {
    expect(splitNotes(['Great at range tags:pvp', 'Handling masterwork'])).toEqual({ mw: 'Handling', notes: 'Great at range' });
    expect(splitNotes(['tags:pvp'])).toEqual({ mw: null, notes: null });
  });
});

describe('buildPvpEntries', () => {
  const martlet = weapon('1', 'The Martlet');
  const { entries, unmatched } = buildPvpEntries(parseWishlistBlocks(WISHLIST), [martlet]);
  const e = entries['The Martlet'];

  it('collapses the combinations into per-column recommendations', () => {
    expect(e.barrel).toEqual(['Arrowhead Brake', 'Fluted Barrel']);
    expect(e.mag).toEqual(['Accurized Rounds']);
    expect(e.perk1).toEqual(['Headseeker', 'Keep Away']);
    expect(e.perk2).toEqual(['Kill Clip', 'Zen Moment']);
    expect(e.originTrait).toBe('Hammerhead');
    expect(e.mw).toBe('Range, Stability or Handling');
  });
  it('reports weapons that are not in the data', () => {
    expect(unmatched).toEqual(['Other (pvp) (999)']);
  });
  it('matches enhanced perk hashes to the base perk name', () => {
    const wl = parseWishlistBlocks('// X\ndimwishlist:item=1&perks=t1e,m1\n');
    expect(buildPvpEntries(wl, [martlet]).entries['The Martlet'].perk1).toEqual(['Headseeker']);
  });
  it('merges several versions of one weapon family under its base name', () => {
    const base = weapon('1', 'Gun'), adept = weapon('2', 'Gun (Adept)', 'Gun');
    const wl = parseWishlistBlocks('// Gun\ndimwishlist:item=1&perks=b1\n// Gun adept\ndimwishlist:item=2&perks=b2\n');
    const out = buildPvpEntries(wl, [base, adept]).entries;
    expect(Object.keys(out)).toEqual(['Gun']);
    expect(out['Gun'].barrel).toEqual(['Arrowhead Brake', 'Fluted Barrel']);
  });
  it('is found by exact name or family name', () => {
    expect(lookupPvpEntry(entries, { name: 'The Martlet (Adept)', baseName: 'The Martlet' })).toBe(e);
    expect(lookupPvpEntry(entries, { name: 'Nope', baseName: 'Nope' })).toBeNull();
  });
});

describe('pvpGodRoll', () => {
  const wish: PvpWishlistEntry = { barrel: ['A'], mag: ['B'], perk1: ['C'], perk2: ['D'], originTrait: null, mw: 'Range', notes: 'n' };
  const pve = { weaponType: 'Hand Cannon', season: '28', energy: null, frame: 'Adaptive', source: 'Raid', barrel: ['X'], mag: [], mw: null, perk1: ['Y'], perk2: [], originTrait: null, notes: null, rank: 3, tier: 'S' } as GodRollEntry;

  it('uses the community wishlist and keeps weapon info from the PvE entry', () => {
    const v = pvpGodRoll(pve, wish)!;
    expect(v.barrel).toEqual(['A']);
    expect(v.perk1).toEqual(['C']);
    expect(v.mw).toBe('Range');
    expect(v.tier).toBeNull();            // PvE tier does not apply
    expect(v.weaponType).toBe('Hand Cannon');
  });
  it('prefers hand-curated PvP fields over the wishlist', () => {
    const v = pvpGodRoll({ ...pve, pvpBarrel: ['Curated'], pvpTier: 'A' }, wish)!;
    expect(v.barrel).toEqual(['Curated']);
    expect(v.tier).toBe('A');
  });
  it('works without a PvE entry, and is null with nothing', () => {
    expect(pvpGodRoll(null, wish)!.barrel).toEqual(['A']);
    expect(pvpGodRoll(pve, null)).toBeNull();
    expect(pvpGodRoll(null, null)).toBeNull();
  });
});

describe('shipped PvP wishlist data', () => {
  const db = readData<PvpWishlistDatabase>('pvp-wishlist.json');
  const { weapons } = loadRealData();
  const families = new Map<string, Weapon[]>();
  weapons.forEach((w) => families.set(w.baseName, [...(families.get(w.baseName) ?? []), w]));

  it('covers a meaningful number of weapons', () => {
    expect(Object.keys(db).length).toBeGreaterThan(50);
  });
  it('every entry belongs to a real weapon family and has at least a barrel or trait recommendation', () => {
    for (const [name, e] of Object.entries(db)) {
      expect(families.has(name), name).toBe(true);
      expect(e.barrel.length + e.mag.length + e.perk1.length + e.perk2.length, name).toBeGreaterThan(0);
    }
  });
  it('recommended perks exist on the weapon family', () => {
    for (const [name, e] of Object.entries(db)) {
      const known = new Set(families.get(name)!.flatMap((w) => w.perkSockets.flatMap((c) => c.perks.map((p) => p.name))));
      for (const p of [...e.barrel, ...e.mag, ...e.perk1, ...e.perk2, ...(e.originTrait?.split('\n') ?? [])]) {
        expect(known.has(p), `${name}: ${p}`).toBe(true);
      }
    }
  });
});

// ── Weapon sources (Sax) ────────────────────────────────────────────────────

const RAIDS = `Loot,Tiered?,Loot Type,Element,Craftable?,Last Updated,Encounter(s),Notes
,Pantheon,,,,,,
Reckless Oracle | Rev. 1,Yes,Auto Rifle,Void,No,MoT,Consecrated Mind,Unlock from Encounter for 1st Drop
Techeun's Regalia Armor,Yes,Armor,Armor,No,MoT,,
,Vault of Glass,,,,,,
Fang of Ir Yût (Adept),Yes,Scout Rifle,Arc,Yes,MoT,Warpriest,
`;
const VENDORS = `Loot,Tiered?,Loot Type,Element,Acquisition Method,Craftable?,Last Updated,Notes
,Xur,,,,,,
Goldtusk,Yes,Sword,Arc,Purchase,Yes,Defiance,Tier Upgrade After Crafting
,The Drifter,,,,,,
21% Delierium,No,Machine Gun,Arc,Actively Dropped,No,MoT,
`;
const CRAFT = `"","Weapon Name","Type","Source","Note","",""
"","Goldtusk","Sword","Xur's Strange Engrams","","FALSE"
"","Mystery Gun","Sword","?","","FALSE"
`;

describe('Sax loot sources', () => {
  const weapons = [
    { name: 'Reckless Oracle', baseName: 'Reckless Oracle' },
    { name: 'Fang of Ir Yût (Adept)', baseName: 'Fang of Ir Yût' },
    { name: 'Fang of Ir Yût', baseName: 'Fang of Ir Yût' },
    { name: 'Goldtusk', baseName: 'Goldtusk' },
    { name: '21% Delirium', baseName: '21% Delirium' },
  ];

  it('normalises accents, punctuation and case', () => {
    expect(normalizeName('Fang of Ir Yût')).toBe('fang of ir yut');
    // curly and straight apostrophes (and extra spaces) normalise to the same key
    expect(normalizeName("Techeun’s  Regalia")).toBe(normalizeName("Techeun's Regalia"));
  });

  it('parses tabs: section headers become the place, armour is dropped', () => {
    const rows = parseSaxTab('Raids', RAIDS);
    expect(rows.map((r) => r.name)).toEqual(['Reckless Oracle | Rev. 1', 'Fang of Ir Yût (Adept)']);
    expect(rows[0].source).toMatchObject({ kind: 'raid', place: 'Pantheon', encounters: 'Consecrated Mind', tiered: true, craftable: false });
    expect(rows[1].source.place).toBe('Vault of Glass');
  });

  it('skips craft rows whose source is unknown', () => {
    expect(parseSaxTab('Craftable Weapon Sources', CRAFT).map((r) => r.name)).toEqual(['Goldtusk']);
  });

  const { sources, unmatched } = buildSourceTable({ Raids: RAIDS, Vendors: VENDORS, 'Craftable Weapon Sources': CRAFT }, weapons);

  it('matches versioned names, exact adept names and the sheet’s typos', () => {
    expect(sources['Reckless Oracle'][0].encounters).toBe('Consecrated Mind');
    expect(sources['Fang of Ir Yût (Adept)']).toBeDefined();
    expect(sources['21% Delirium'][0]).toMatchObject({ kind: 'vendor', place: 'The Drifter', method: 'Actively Dropped' });
  });
  it('keeps every source of a weapon (vendor + craft)', () => {
    expect(sources['Goldtusk'].map((s) => s.kind)).toEqual(['vendor', 'craft']);
  });
  it('reports nothing unmatched for these rows', () => {
    expect(unmatched).toEqual([]);
  });
  it('describes sources readably and looks up by name or family', () => {
    expect(describeSource(sources['Reckless Oracle'][0])).toBe('Raid · Pantheon — Consecrated Mind');
    expect(describeSource(sources['Goldtusk'][0])).toBe('Vendor · Xur (Purchase)');
    expect(lookupSources(sources, { name: 'Goldtusk (Adept)', baseName: 'Goldtusk' })).toBe(sources['Goldtusk']);
  });
});

describe('shipped weapon sources data', () => {
  const db = readData<WeaponSourceDatabase>('sources.json');
  const names = new Set(loadRealData().weapons.map((w) => w.name));

  it('covers hundreds of weapons', () => {
    expect(Object.keys(db).length).toBeGreaterThan(300);
  });
  it('every key is a real weapon name and every source names a place', () => {
    for (const [name, list] of Object.entries(db)) {
      expect(names.has(name), name).toBe(true);
      for (const s of list) {
        expect(s.place, name).toBeTruthy();
        expect(['vendor', 'destination', 'dungeon', 'raid', 'craft']).toContain(s.kind);
      }
    }
  });
});
