import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from './weaponPack';
import { lookupWeaponStat, statBasis, EXOTIC_FRAME_FALLBACK } from './weaponStats';

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: rd('weapons.json'), perks: rd('perks.json'), mods: rd('mods.json'), statGroups: rd('statgroups.json') });
const exotic = (name: string) => weapons.find((w) => w.rarity === 'Exotic' && w.name === name)!;
const statFor = (name: string) => {
  const w = exotic(name);
  return lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name);
};

describe('exotic frame fallback', () => {
  it("every borrowed frame is one this weapon's rate of fire belongs to (Bungie's rpm for legendaries of that frame)", () => {
    const problems: string[] = [];
    for (const [name, frame] of Object.entries(EXOTIC_FRAME_FALLBACK)) {
      const w = exotic(name);
      if (!w) { problems.push(`${name}: not in the weapon data`); continue; }
      const e = statFor(name);
      if (!e) { problems.push(`${name}: no ${frame} row for this weapon type`); continue; }
      if (e.approxFrom !== frame) { problems.push(`${name}: not marked as borrowed from ${frame}`); continue; }
      const frameRe = new RegExp(`^${frame.replace(' ', '[ -]')}( Frame)?$`, 'i');
      const legendary = weapons.filter((l) => l.rarity !== 'Exotic' && l.itemSubType === w.itemSubType && l.ammoType === w.ammoType && l.rpm && frameRe.test(l.intrinsicTrait?.name ?? ''));
      if (legendary.length === 0) { problems.push(`${name}: no legendary ${frame} weapons to compare against`); continue; }
      const rates = [...new Set(legendary.map((l) => Math.round(l.rpm!)))];
      if (!w.rpm || !legendary.some((l) => Math.abs(l.rpm! - w.rpm!) / w.rpm! <= 0.02)) problems.push(`${name}: rpm ${w.rpm} is not a ${frame} rate of fire (${rates.join('/')})`);
    }
    expect(problems).toEqual([]);
  });

  it("returns the frame row's numbers and says where they came from", () => {
    const w = exotic('Hawkmoon');
    expect(statFor('Hawkmoon')!.lookup).toBe('Hand Cannon_p_Adaptive');
    expect(statBasis(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name)).toBe('Adaptive');
  });

  it('an exotic with its own sheet row is exact, not borrowed', () => {
    const e = statFor('Sweet Business')!;
    expect(e).toBeTruthy();
    expect(e.approxFrom ?? null).toBeNull();
  });

  it("Ager's Scepter finds its sheet row despite the spelling (Sceptre)", () => {
    const e = statFor("Ager's Scepter")!;
    expect(e.lookup).toBe("Trace_s_Ager's Sceptre");
    expect(e.approxFrom ?? null).toBeNull();
  });

  it('gives no numbers for exotics it cannot back up (rockets, swords, Ruinous Effigy)', () => {
    for (const name of ['Gjallarhorn', 'Worldline Zero', 'Ruinous Effigy']) expect(statFor(name), name).toBeNull();
  });
});
