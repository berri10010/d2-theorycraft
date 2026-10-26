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

  it('lists every option of each column and lights the chosen one, with absolute icon URLs', () => {
    expect(data.columns.map((c) => c.name)).toEqual(weapon.perkSockets.filter((c) => c.perks.length).map((c) => c.name));
    for (const col of data.columns) {
      expect(col.perks.length).toBeGreaterThan(0);
      expect(col.perks.length).toBeLessThanOrEqual(4);
      expect(col.perks.filter((p) => p.selected)).toHaveLength(1);
      for (const p of col.perks) if (p.iconUrl) expect(p.iconUrl.startsWith('https://')).toBe(true);
    }
    const first = weapon.perkSockets[0];
    expect(data.columns[0].perks.find((p) => p.selected)?.name).toBe(first.perks[0].name);
  });

  it('keeps the chosen perk even when it would fall below the row cap', () => {
    const wide = weapon.perkSockets.find((c) => c.perks.length > 4);
    if (!wide) return;
    const last = wide.perks[wide.perks.length - 1];
    const d = buildRollCardData({ weapon, selectedPerks: { [wide.name]: last.hash }, calcStats: {}, mode: 'pve', masterworkStat: null, isCrafted: false, url: '' });
    expect(d.columns.find((c) => c.name === wide.name)!.perks.find((p) => p.selected)?.name).toBe(last.name);
  });

  it('shows nothing lit in a column with no choice', () => {
    const first = weapon.perkSockets[0];
    const partial = buildRollCardData({ weapon, selectedPerks: { [first.name]: first.perks[0].hash }, calcStats: {}, mode: 'pvp', masterworkStat: null, isCrafted: false, url: '' });
    const other = partial.columns.find((c) => c.name !== first.name && weapon.perkSockets.find((s) => s.name === c.name)?.columnType !== 'origin');
    expect(other?.perks.some((p) => p.selected)).toBe(false);
  });

  it('uses the calculated stat over the base, rounded, with the game\'s names, and splits bars from plain numbers', () => {
    expect(data.bars.find((s) => s.label === 'Range')?.value).toBe(77);
    expect(data.bars.some((s) => s.label === 'Reload Speed')).toBe(true);
    expect(data.bars.length).toBeLessThanOrEqual(10);
    expect(data.numbers.map((s) => s.label)).toContain('Rounds Per Minute');
    expect(data.numbers.length).toBeLessThanOrEqual(4);
  });

  it('names the file after the weapon', () => {
    expect(rollCardFileName("The Messenger")).toBe('the-messenger-roll.png');
    expect(rollCardFileName('???')).toBe('weapon-roll.png');
  });
});
