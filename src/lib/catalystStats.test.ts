import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { catalystStatsFromText, firstLine } from './catalystStats';
import type { ClarityEntry } from './clarity';

describe('catalystStatsFromText', () => {
  const cases: Array<[string, Record<string, number>]> = [
    ['Grants 30 Range and 20 Stability. Applying an Elemental Debuff grants the following benefits for 9 seconds:', { Range: 30, Stability: 20 }],
    ['Passively grants 15 Range, 5 Stability, and 5 Airborne Effectiveness. Kills or collecting Remnants grants Refined Soul', { Range: 15, Stability: 5, 'Airborne Effectiveness': 5 }],
    ['Passively grants 20 Range. Every 30 points of damage taken grants a Stack', { Range: 20 }],
    ['Grants 20 Reload Speed and 30 Stability. Grants the Unrelenting trait', { Reload: 20, Stability: 30 }],
    ['Grants 20 Aim Assist and 20 Recoil Direction. Finishing a reload within 6 seconds', { 'Aim Assistance': 20, 'Recoil Direction': 20 }],
    ['Increases the Magazine Size by 3 (4🠚7) and grants 40 Ammo Generation. Triggering Harbinger\'s Pulse', { 'Ammo Generation': 40 }],
    ['Grants 50 Recoil Direction and doubles the healing chance (25%🠚50%).', { 'Recoil Direction': 50 }],
  ];
  for (const [text, want] of cases) it(text.slice(0, 50), () => expect(catalystStatsFromText(text)).toEqual(want));

  it('ignores conditional bonuses and effects that are not stats', () => {
    expect(catalystStatsFromText('Grants 25% increased Flinch Resistance while at maximum Rate of Fire.')).toEqual({});
    expect(catalystStatsFromText('While Amplified, Radiant, or Devour is active grants 40 Handling.')).toEqual({});
    expect(catalystStatsFromText('Firefly\'s explosion damage is increased by 50% while Memento Mori is active.')).toEqual({});
    expect(catalystStatsFromText('Kills create an additional Remnant (1🠚2).')).toEqual({});
    expect(catalystStatsFromText('')).toEqual({});
  });

  it('reads the first line of a Clarity entry', () => {
    const e = { descriptions: { en: [{ linesContent: [{ text: 'Grants 30 Range ' }, { text: 'and 20 Stability.' }] }, { linesContent: [{ text: 'More.' }] }] } } as unknown as ClarityEntry;
    expect(firstLine(e)).toBe('Grants 30 Range and 20 Stability.');
  });
});

describe('against the shipped Clarity catalysts', () => {
  const clarity = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'clarity.json'), 'utf8')) as Record<string, ClarityEntry>;
  const catalysts = Object.values(clarity).filter((e) => /Catalyst/.test(e.type ?? ''));

  it('finds stat bonuses for a good share of them, none of them absurd', () => {
    const parsed = catalysts.map((e) => catalystStatsFromText(firstLine(e)));
    expect(catalysts.length).toBeGreaterThan(100);
    expect(parsed.filter((s) => Object.keys(s).length > 0).length).toBeGreaterThan(30);
    for (const s of parsed) for (const v of Object.values(s)) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(100); }
  });

  it('reads a few known ones', () => {
    const by = (item: string) => catalystStatsFromText(firstLine(catalysts.find((e) => e.itemName === item)!));
    expect(by('Sunshot')).toEqual({ Range: 30, Stability: 20 });
    expect(by('Merciless')).toEqual({ Range: 40, Stability: 40 });
    expect(by('Thorn')).toEqual({ Range: 15, Stability: 5, 'Airborne Effectiveness': 5 });
  });
});
