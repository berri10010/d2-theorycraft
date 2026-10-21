import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseLegendary, rekeyToWeapons, snapPerkNames, TIER_RANK } from './prideSheet';
import { pvpGodRoll, weaponTier, lookupGodRoll, type GodRollEntry } from './godRolls';
import { loadRealData } from '../test/realData';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const row = (...cells: string[]) => cells.map(q).join(',');
const HEAD = [
  row('WEAPON', '', 'INFO'),
  row('Icon', 'Name', 'Type', 'Slot', 'Affinity', 'Frame', 'Barrel', 'Magazine', 'MW', 'Column 1', 'Column 2', 'Origin Trait', 'Role / Notes', 'Rank', 'Tier', 'Where to get', 'Craftable'),
].join('\n');
const leg = (name: string, o: Record<string, string> = {}) => row(
  '', name, 'Auto Rifle', 'Energy', 'Solar', 'Adaptive', o.barrel ?? 'Smallbore', o.mag ?? 'Accurized Rounds', o.mw ?? 'Range',
  o.c1 ?? 'Rampage', o.c2 ?? 'Kill Clip', o.origin ?? 'Hakke', 'notes', '', o.tier ?? 'S', 'Somewhere', 'No',
);
const parse = (...rows: string[]) => parseLegendary([HEAD, ...rows].join('\n')).map((r) => r.entry);

describe('perk name cleanup', () => {
  const [e] = parse(leg('Messy', {
    barrel: 'Fluted Barrel Barrel\nNone (Has access to Stocks instead)',
    mag: 'Extended Magazine\nRicochet\nHigh Explosive',
    c1: 'Headseeker (???)\nGrips are up to user preference.',
    c2: 'Kill Clip\nkill clip\nNone',
    origin: 'None',
  }));

  it('drops comments, applies aliases and removes duplicates', () => {
    expect(e.barrel).toEqual(['Fluted Barrel']);
    expect(e.mag).toEqual(['Extended Mag', 'Ricochet Rounds', 'High-Explosive Ordnance']);
    expect(e.perk1).toEqual(['Headseeker']);
    expect(e.perk2).toEqual(['Kill Clip']);
    expect(e.originTrait).toBeNull();
  });
});

describe('rekeyToWeapons', () => {
  it('copies misspelled weapons under the real name and reports the rest', () => {
    const [a, b, c, d] = parse(leg('a', { tier: 'A' }), leg('b', { tier: 'B' }), leg('c', { tier: 'C' }), leg('d', { tier: 'S' }));
    const db = { 'Willful Harmatia': a, "Mykel's Reverance": b, 'Ghost Gun': c, 'Real Gun': d };
    const unmatched = rekeyToWeapons(db, ['Willful Hamartia', "Mykel's Reverence", 'Real Gun']);
    expect((db as Record<string, GodRollEntry>)['Willful Hamartia'].tier).toBe('A');
    expect((db as Record<string, GodRollEntry>)["Mykel's Reverence"].tier).toBe('B');
    expect(unmatched).toEqual(['Ghost Gun']);
  });
});

describe('snapPerkNames', () => {
  const entry = (perk1: string[]): GodRollEntry => ({ ...parse(leg('x'))[0], perk1, barrel: [], mag: [], perk2: [], originTrait: 'Ambition Assassin' });

  it('fixes capitalisation and small typos, and leaves unknown names alone', () => {
    const db = { a: entry(['Tap The Trigger', 'Destablizing Rounds', 'Totally Unknown Perk']) };
    const fixed = snapPerkNames(db, ['Tap the Trigger', 'Destabilizing Rounds', 'Ambitious Assassin']);
    expect(db.a.perk1).toEqual(['Tap the Trigger', 'Destabilizing Rounds', 'Totally Unknown Perk']);
    expect(db.a.originTrait).toBe('Ambitious Assassin');
    expect(fixed).toBe(3);
  });

  it('does not guess when two perks are equally close', () => {
    const db = { a: entry(['Rapid Hitt']) };
    snapPerkNames(db, ['Rapid Hit', 'Rapid Hits']);
    expect(db.a.perk1).toEqual(['Rapid Hitt']);
  });
});

describe('PvP tier and roll precedence', () => {
  const base = (o: Partial<GodRollEntry> = {}): GodRollEntry => ({
    weaponType: 'Auto Rifle', season: '26', energy: 'Solar', frame: 'Adaptive', source: null,
    barrel: ['Smallbore'], mag: [], mw: null, perk1: ['Rampage'], perk2: [], originTrait: null, notes: null, rank: 3, tier: 'S', ...o,
  });
  const pride = base({ tier: 'B', perk1: ['Kill Clip'], notes: 'Pride notes', rank: null });
  const wishlist = { barrel: [], mag: ['Accurized Rounds'], perk1: ['Headseeker'], perk2: ['Frenzy'], originTrait: 'Hakke', mw: 'Range', notes: 'wishlist' };

  it('PvE uses Aegis tiers, PvP uses Pride tiers', () => {
    expect(weaponTier('pve', base(), pride)).toBe('S');
    expect(weaponTier('pvp', base(), pride)).toBe('B');
    expect(weaponTier('pvp', base(), null)).toBeNull();
    expect(weaponTier('pvp', base({ pvpTier: 'A' }), pride)).toBe('A');
  });

  it('PvP rolls come from Pride, with empty columns filled from the CrucibleGuidebook wishlist', () => {
    const r = pvpGodRoll(base(), wishlist, pride)!;
    expect(r.tier).toBe('B');
    expect(r.notes).toBe('Pride notes');
    expect(r.perk1).toEqual(['Kill Clip']);
    expect(r.mag).toEqual(['Accurized Rounds']);
    expect(r.perk2).toEqual(['Frenzy']);
    expect(r.originTrait).toBe('Hakke');
  });

  it('hand-curated PvP fields beat both, and the wishlist alone still works', () => {
    expect(pvpGodRoll(base({ pvpPerk1: ['Mine'], pvpTier: 'A' }), wishlist, pride)!.perk1).toEqual(['Mine']);
    expect(pvpGodRoll(null, wishlist, null)!.perk1).toEqual(['Headseeker']);
    expect(pvpGodRoll(null, null, null)).toBeNull();
  });
});

describe('shipped pride.json', () => {
  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'pride.json'), 'utf8')) as Record<string, GodRollEntry>;
  const { weapons } = loadRealData();
  const names = new Set(weapons.flatMap((w) => [w.name, w.baseName]));
  const known = new Map<string, Set<string>>();
  for (const w of weapons) {
    const set = known.get(w.baseName) ?? new Set<string>();
    for (const c of w.perkSockets) {
      for (const p of c.perks) {
        set.add(p.name.toLowerCase());
        if (p.enhancedVersion) set.add(p.enhancedVersion.name.toLowerCase());
      }
    }
    known.set(w.baseName, set);
  }

  it('covers hundreds of legendaries and the exotics, with valid tiers', () => {
    const entries = Object.values(db);
    expect(entries.length).toBeGreaterThan(800);
    expect(entries.filter((e) => e.weaponType === 'Exotic').length).toBeGreaterThan(100);
    for (const e of entries) expect(TIER_RANK, `${e.tier}`).toContain(e.tier);
  });

  it('almost every entry is a real weapon in the game data', () => {
    const keys = Object.keys(db).filter((k) => !/\(.*(variant|season)/i.test(k));
    const missing = keys.filter((k) => !names.has(k));
    expect(missing.length / keys.length).toBeLessThan(0.02);
  });

  it('recommended perks are real perks on that weapon (99%+)', () => {
    let total = 0;
    let ok = 0;
    for (const [name, e] of Object.entries(db)) {
      const set = known.get(name);
      if (!set) continue;
      for (const p of [...e.barrel, ...e.mag, ...e.perk1, ...e.perk2, ...(e.originTrait?.split('\n') ?? [])]) {
        total++;
        if (set.has(p.toLowerCase())) ok++;
      }
    }
    expect(total).toBeGreaterThan(5000);
    expect(ok / total).toBeGreaterThan(0.99);
  });

  it('is what the god-roll lookup finds for real weapons', () => {
    const w = weapons.find((x) => x.baseName === 'Abyss Defiant')!;
    expect(lookupGodRoll(db, w)?.tier).toBeTruthy();
    const thorn = weapons.find((x) => x.baseName === 'Thorn')!;
    expect(lookupGodRoll(db, thorn)?.weaponType).toBe('Exotic');
  });
});
