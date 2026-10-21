import { describe, it, expect } from 'vitest';
import { parsePrideSheet, parseLegendary, parseExotics } from './prideSheet';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const row = (...cells: string[]) => cells.map(q).join(',');

const LEG_GROUPS = row('WEAPON', '', 'INFO', '', '', '', 'PREFERENCE', '', '', 'PERKS', '', '', 'ROLE / NOTES', 'ANALYSIS', '', 'SOURCE', '');
const LEG_HEAD = row('Icon', 'Name', 'Type', 'Slot', 'Affinity', 'Frame', 'Barrel', 'Magazine', 'MW', 'Column 1', 'Column 2', 'Origin Trait', 'Role / Notes', 'Rank', 'Tier', 'Where to get', 'Craftable');
const leg = (name: string, o: Record<string, string> = {}) => row(
  '', name, o.type ?? 'Auto Rifle', 'Energy', o.affinity ?? 'Solar', o.frame ?? 'High-Impact',
  o.barrel ?? 'Arrowhead Brake\nSmallbore ', o.mag ?? 'Accurized Rounds', o.mw ?? 'Stability\nRange',
  o.c1 ?? 'Zen Moment\nHeal Clip', o.c2 ?? 'Kill Clip\nSwashbuckler', o.origin ?? 'Cursed Thrall',
  o.notes ?? 'Best-in-Class auto.\nTTK shift via Kill Clip.', '', o.tier ?? 'S', o.where ?? "Crota's End Raid", o.craft ?? 'Yes',
);
const LEGENDARY = [LEG_GROUPS, LEG_HEAD,
  leg('Abyss Defiant'),
  leg('Adamantite (Pit of Heresy Dungeon Variant)', { tier: 'C', c1: 'Physic', c2: 'Kill Clip', craft: 'No', where: 'Pit of Heresy Dungeon' }),
  leg('Adamantite (Episode: Heresy Variant)', { tier: 'A', c1: 'Reciprocity', c2: 'Kill Clip\nFirefly' }),
  leg('Drang (Baroque)', { type: 'Sidearm', tier: 'B' }),
  leg('Mini', { type: 'SMG', tier: 'D', origin: 'None', mw: 'Reload' }),
  leg('Tunnel', { type: 'LFR', tier: 'F' }),
  leg('Blank Tier Weapon', { tier: '' }),
].join('\n');

const EX_HEAD = row('#', 'INFO', 'Name', 'Season', 'Ammo', 'Type', 'Tags', 'Description', 'Weapons stat to shift ttk', 'ANALYSIS Trials', 'Comp', 'Quickplay', 'vs DR', 'Duel', 'Tier', 'KEY ', '');
const ex = (name: string, tier: string, flags: string[], extra: Record<string, string> = {}) =>
  row('2', '', name, '24', '15', 'special', extra.tags ?? 'add clear', extra.desc ?? 'Hip fire ammo dump.\nADS precision.', extra.shift ?? '', ...flags, tier, '', '');
const EXOTIC = [EX_HEAD,
  ex('Choir of One', 'A', ['✔', '✖', '✔', '✔', '▲']),
  ex('Ice Breaker', 'E', ['!', '✖', '✖', '✖', '!'], { shift: '+128' }),
  ex('Unrated', '', ['✔', '✔', '✔', '✔', '✔']),
].join('\n');

const STATUS = [row('TAB', 'UPDATED', 'STATUS', 'NEWS'), row('Legendary Weapons', '2026-09-30', 'Updated', ''), row('Exotic Weapons', '2026-09-21', 'In progress', '')].join('\n');

describe('Pride legendary tab', () => {
  const rows = parseLegendary(LEGENDARY);
  const by = (n: string) => rows.find((r) => r.name === n)!.entry;

  it('reads frame, perk lists in order, origin, notes, tier and source', () => {
    expect(by('Abyss Defiant')).toMatchObject({
      weaponType: 'Auto Rifle', energy: 'Solar', frame: 'High-Impact', tier: 'S',
      barrel: ['Arrowhead Brake', 'Smallbore'], mag: ['Accurized Rounds'],
      perk1: ['Zen Moment', 'Heal Clip'], perk2: ['Kill Clip', 'Swashbuckler'],
      originTrait: 'Cursed Thrall', mw: 'Stability or Range', source: "Crota's End Raid (craftable)",
    });
    expect(by('Abyss Defiant').notes).toBe('Best-in-Class auto.\nTTK shift via Kill Clip.');
  });

  it('uses the same weapon-type labels as the Aegis data', () => {
    expect(by('Mini').weaponType).toBe('Submachine Gun');
    expect(by('Tunnel').weaponType).toBe('Linear Fusion Rifle');
  });

  it('treats "None" as no origin trait and skips rows without a tier', () => {
    expect(by('Mini').originTrait).toBeNull();
    expect(by('Mini').mw).toBe('Reload');
    expect(rows.some((r) => r.name === 'Blank Tier Weapon')).toBe(false);
  });

  it('fails loudly if the layout changes', () => {
    expect(() => parseLegendary('a,b\n1,2')).toThrow(/header/);
    expect(() => parseLegendary([LEG_GROUPS, row('Icon', 'Name', 'Type'), ''].join('\n'))).toThrow(/missing/);
  });
});

describe('Pride exotic tab', () => {
  const rows = parseExotics(EXOTIC);
  const by = (n: string) => rows.find((r) => r.name === n)!.entry;

  it('reads the tier and spells out how it does in each mode', () => {
    expect(by('Choir of One').tier).toBe('A');
    expect(by('Choir of One').notes).toContain('Trials: Optimal · Comp: Wasted · Quickplay: Optimal · vs DR: Optimal · Duels: Viable');
    expect(by('Ice Breaker').notes).toContain('Weapons stat to shift TTK: +128');
    expect(by('Ice Breaker').tier).toBe('E');
    expect(rows.some((r) => r.name === 'Unrated')).toBe(false);
  });
});

describe('parsePrideSheet', () => {
  const p = parsePrideSheet(LEGENDARY, EXOTIC, STATUS);

  it('keys by weapon name and merges variants under the base name (best tier, combined perks)', () => {
    expect(p.entries['Adamantite (Pit of Heresy Dungeon Variant)'].tier).toBe('C');
    const base = p.entries['Adamantite'];
    expect(base.tier).toBe('A');
    expect(base.perk1).toEqual(['Reciprocity', 'Physic']);
    expect(base.perk2).toEqual(['Kill Clip', 'Firefly']);
  });

  it('leaves names that really contain parentheses alone', () => {
    expect(p.entries['Drang (Baroque)']).toBeDefined();
    expect(p.entries['Drang']).toBeUndefined();
  });

  it('counts both tabs and reports their update dates', () => {
    expect(p.legendary).toBe(6);
    expect(p.exotic).toBe(2);
    expect(p.entries['Choir of One']).toBeDefined();
    expect(p.updated).toEqual({ 'Legendary Weapons': '2026-09-30', 'Exotic Weapons': '2026-09-21' });
  });
});
