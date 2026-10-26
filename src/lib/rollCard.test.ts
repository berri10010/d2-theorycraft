import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { buildRollCardData, rollCardFileName } from './rollCard';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const weapon = weapons.find((w) => w.rarity === 'Legendary' && w.itemTypeDisplayName === 'Hand Cannon' && w.perkSockets.length >= 4)!;

describe('roll card data', () => {
  const selected = Object.fromEntries(weapon.perkSockets.map((c) => [c.name, c.perks[0].hash]));
  const data = buildRollCardData({ weapon, selectedPerks: selected, calcStats: { Range: 77.4 }, mode: 'pve', masterworkStat: 'Range', isCrafted: false, url: 'https://x/y' });

  it('lists the chosen perk of every column, in column order, with absolute icon URLs', () => {
    expect(data.perks.map((p) => p.column)).toEqual(weapon.perkSockets.map((c) => c.name));
    expect(data.perks.map((p) => p.name)).toEqual(weapon.perkSockets.map((c) => c.perks[0].name));
    for (const p of data.perks) if (p.iconUrl) expect(p.iconUrl.startsWith('https://')).toBe(true);
  });

  it('skips columns with nothing chosen', () => {
    const first = weapon.perkSockets[0];
    const partial = buildRollCardData({ weapon, selectedPerks: { [first.name]: first.perks[0].hash }, calcStats: {}, mode: 'pvp', masterworkStat: null, isCrafted: false, url: '' });
    expect(partial.perks).toHaveLength(1);
  });

  it('prefers the calculated stat over the base stat, rounds it, and puts bars before plain numbers', () => {
    expect(data.stats.find((s) => s.label === 'Range')?.value).toBe(77);
    expect(data.stats.length).toBeGreaterThan(0);
    expect(data.stats.length).toBeLessThanOrEqual(9);
    const firstNumber = data.stats.findIndex((s) => !s.bar);
    if (firstNumber >= 0) expect(data.stats.slice(firstNumber).every((s) => !s.bar)).toBe(true);
  });

  it('names the file after the weapon', () => {
    expect(rollCardFileName("The Messenger")).toBe('the-messenger-roll.png');
    expect(rollCardFileName('???')).toBe('weapon-roll.png');
  });
});
