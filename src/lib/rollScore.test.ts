import { describe, it, expect } from 'vitest';
import { scoreRoll, gradeFor, picksFromSelection, selectionFromHashes, type MetaRoll } from './rollScore';
import { lookupGodRoll, type GodRollEntry } from './godRolls';
import { findWeapon } from '../test/realData';
import fs from 'fs';
import path from 'path';

const meta: MetaRoll = {
  barrel: ['Arrowhead Brake', 'Smallbore'],
  mag: ['Accurized Rounds'],
  perk1: ['Zen Moment', 'Heal Clip', 'Tap the Trigger'],
  perk2: ['Kill Clip', 'Swashbuckler', 'Rampage', 'Frenzy'],
  originTrait: 'Cursed Thrall',
  mw: 'Stability\nRange',
};

const col = (s: NonNullable<ReturnType<typeof scoreRoll>>, key: string) => s.columns.find((c) => c.key === key)!;

describe('scoreRoll', () => {
  it('a roll of every top pick is a god roll', () => {
    const s = scoreRoll({ barrel: 'Arrowhead Brake', mag: 'Accurized Rounds', perk1: 'Zen Moment', perk2: 'Kill Clip', origin: 'Cursed Thrall', mw: 'Stability' }, meta)!;
    expect(s.score).toBe(100);
    expect(s.grade).toBe('God roll');
    expect(s.columns.every((c) => c.verdict === 'best' && c.suggestion === null)).toBe(true);
  });

  it('lower positions score less, unlisted perks score nothing', () => {
    const s = scoreRoll({ barrel: 'Smallbore', mag: 'Accurized Rounds', perk1: 'Tap the Trigger', perk2: 'Frenzy', origin: 'Cursed Thrall', mw: 'Range' }, meta)!;
    expect(col(s, 'barrel').score).toBe(0.85);
    expect(col(s, 'perk1').score).toBe(0.7);
    expect(col(s, 'perk2').score).toBe(0.55);
    expect(col(s, 'mw').score).toBe(0.85);
    const off = scoreRoll({ perk1: 'Headseeker', perk2: 'Kill Clip' }, meta)!;
    expect(col(off, 'perk1')).toMatchObject({ score: 0, verdict: 'off', position: null });
  });

  it('weights the trait columns most', () => {
    const goodTraits = scoreRoll({ barrel: 'Nope', mag: 'Nope', perk1: 'Zen Moment', perk2: 'Kill Clip' }, meta)!;
    const goodBarrel = scoreRoll({ barrel: 'Arrowhead Brake', mag: 'Accurized Rounds', perk1: 'Nope', perk2: 'Nope' }, meta)!;
    expect(goodTraits.score).toBeGreaterThan(goodBarrel.score);
    expect(goodTraits.score).toBe(Math.round((0.6 / 0.84) * 100));
  });

  it('ignores columns the weapon lacks or the meta does not cover', () => {
    const s = scoreRoll({ perk1: 'Zen Moment', perk2: 'Kill Clip', barrel: undefined, mag: undefined }, { ...meta, barrel: [], originTrait: null, mw: null })!;
    expect(s.columns.map((c) => c.key)).toEqual(['perk1', 'perk2']);
    expect(s.score).toBe(100);
  });

  it('counts enhanced perks and punctuation as the same perk', () => {
    const s = scoreRoll({ perk1: 'Enhanced Zen Moment', perk2: 'kill-clip' }, meta)!;
    expect(s.score).toBe(100);
  });

  it('unselected columns score zero and say so', () => {
    const s = scoreRoll({ perk1: null, perk2: 'Kill Clip' }, meta)!;
    expect(col(s, 'perk1')).toMatchObject({ verdict: 'unset', score: 0 });
  });

  it('suggests the best recommended perk the weapon can actually roll', () => {
    const s = scoreRoll({ perk1: 'Headseeker', perk2: 'Rampage' }, meta, { perk1: ['Headseeker', 'Heal Clip', 'Tap the Trigger'], perk2: ['Rampage', 'Frenzy', 'Swashbuckler'] })!;
    expect(col(s, 'perk1').suggestion).toBe('Heal Clip'); // Zen Moment is not on this weapon
    expect(col(s, 'perk2').suggestion).toBe('Swashbuckler'); // Kill Clip is not on this weapon; Swashbuckler outranks Rampage
  });

  it('returns null when there is nothing to compare', () => {
    expect(scoreRoll({ perk1: 'x' }, { barrel: [], mag: [], perk1: [], perk2: [], originTrait: null, mw: null })).toBeNull();
  });
});

describe('gradeFor', () => {
  it('has sensible cut-offs', () => {
    expect([100, 92, 91, 78, 77, 60, 59, 40, 39, 0].map(gradeFor)).toEqual(
      ['God roll', 'God roll', 'Great', 'Great', 'Good', 'Good', 'Mixed', 'Mixed', 'Weak', 'Weak'],
    );
  });
});

describe('with real weapons and Pride data', () => {
  const pride = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'pride.json'), 'utf8')) as Record<string, GodRollEntry>;
  const weapon = findWeapon((w) => w.baseName === 'Abyss Defiant');
  const entry = lookupGodRoll(pride, weapon)!;

  it('reads the picks of a selection column by column', () => {
    const selected: Record<string, string> = {};
    for (const c of weapon.perkSockets) selected[c.name] = c.perks[0].hash;
    const { picks, options } = picksFromSelection(weapon, selected, 'Range');
    expect(picks.perk1).toBe(weapon.perkSockets.filter((c) => c.columnType === 'perk')[0].perks[0].name);
    expect(picks.mw).toBe('Range');
    expect(options.perk1!.length).toBeGreaterThan(1);
  });

  it('the first recommended perk of every column scores as a god roll', () => {
    const selected: Record<string, string> = {};
    const want: Record<string, string | undefined> = {
      barrel: entry.barrel[0], mag: entry.mag[0], perk1: entry.perk1[0], perk2: entry.perk2[0], origin: entry.originTrait?.split('\n')[0],
    };
    const perkCols = weapon.perkSockets.filter((c) => c.columnType === 'perk');
    const target: Record<string, (typeof weapon.perkSockets)[number] | undefined> = {
      barrel: weapon.perkSockets.find((c) => c.columnType === 'barrel'), mag: weapon.perkSockets.find((c) => c.columnType === 'mag'),
      perk1: perkCols[0], perk2: perkCols[1], origin: weapon.perkSockets.find((c) => c.columnType === 'origin'),
    };
    for (const [k, name] of Object.entries(want)) {
      const c = target[k];
      const p = c?.perks.find((x) => x.name.toLowerCase() === name?.toLowerCase());
      if (c && p) selected[c.name] = p.hash;
    }
    const { picks, options } = picksFromSelection(weapon, selected, entry.mw?.split(/\n|,| or /)[0]?.trim());
    const s = scoreRoll(picks, entry, options)!;
    expect(s).not.toBeNull();
    expect(s.score).toBeGreaterThanOrEqual(92);
  });

  it('maps a saved roll (a flat list of hashes) back onto columns', () => {
    const hashes = weapon.perkSockets.map((c) => c.perks[0].hash);
    const sel = selectionFromHashes(weapon, hashes);
    expect(Object.keys(sel).length).toBe(weapon.perkSockets.length);
  });
});
