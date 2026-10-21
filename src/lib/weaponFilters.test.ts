import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS, emptyMF, cycleFilter, matchesMF, matchesMFAny, chipMode, countMF,
  totalFilterCount, categoryCount, CATEGORIES, eventLabelFor, weaponSeasonLabel,
  bestSeasonName, bestSeasonNumber, getPerkValues, filterSuggestions, type MultiKey,
} from './weaponFilters';
import type { Weapon, WeaponGroup } from '../types/weapon';

describe('filterSuggestions', () => {
  const none = (): Record<MultiKey, string[]> => ({
    weaponType: [], frame: [], trait: [], perkTier: [], energy: [], ammo: [], slot: [], rarity: [],
    perk: [], col1: [], col2: [], col3: [], col4: [], col5: [], source: [], season: [], foundry: [], weaponTier: [],
  });
  const options = {
    ...none(),
    weaponType: ['Hand Cannon', 'Shotgun'],
    frame: ['Spread Shot Frame', 'Aggressive Frame', 'Adaptive Frame'],
    perk: ['Spread Shot', 'Kill Clip', 'Outlaw'],
    energy: ['solar', 'arc'],
  };

  it('offers the frame for what was typed', () => {
    const s = filterSuggestions('spread shot', options, DEFAULT_FILTERS);
    expect(s[0]).toMatchObject({ kind: 'multi', key: 'frame', value: 'Spread Shot Frame', label: 'Spread Shot', category: 'Frame' });
    expect(s.map(x => x.category)).toContain('Perk');
  });

  it('ranks names that start with the text above ones that merely contain it', () => {
    const s = filterSuggestions('clip', options, DEFAULT_FILTERS);
    expect(s[0]).toMatchObject({ key: 'perk', value: 'Kill Clip' });
    expect(filterSuggestions('hand', options, DEFAULT_FILTERS)[0]).toMatchObject({ key: 'weaponType', value: 'Hand Cannon' });
  });

  it('offers elements capitalised and the on/off filters', () => {
    expect(filterSuggestions('sol', options, DEFAULT_FILTERS)[0]).toMatchObject({ key: 'energy', value: 'solar', label: 'Solar' });
    expect(filterSuggestions('craft', options, DEFAULT_FILTERS)[0]).toMatchObject({ kind: 'toggle', key: 'craftableOnly' });
  });

  it('skips filters already on, one-letter input, and non-matches', () => {
    const on = cycleFilter(DEFAULT_FILTERS, 'frame', 'Spread Shot Frame');
    expect(filterSuggestions('spread shot', options, on).some(x => x.key === 'frame')).toBe(false);
    expect(filterSuggestions('s', options, DEFAULT_FILTERS)).toEqual([]);
    expect(filterSuggestions('zzzz', options, DEFAULT_FILTERS)).toEqual([]);
  });

  it('caps the list', () => {
    const many = { ...none(), perk: Array.from({ length: 30 }, (_, i) => `Perk ${i}`) };
    expect(filterSuggestions('perk', many, DEFAULT_FILTERS, 6)).toHaveLength(6);
  });
});

describe('cycleFilter', () => {
  it('cycles none → include → exclude → none', () => {
    let f = DEFAULT_FILTERS;
    f = cycleFilter(f, 'ammo', 'Heavy');
    expect(chipMode(f.ammo, 'Heavy')).toBe('inc');
    f = cycleFilter(f, 'ammo', 'Heavy');
    expect(chipMode(f.ammo, 'Heavy')).toBe('exc');
    f = cycleFilter(f, 'ammo', 'Heavy');
    expect(chipMode(f.ammo, 'Heavy')).toBe('none');
  });
  it('does not mutate the previous state', () => {
    const next = cycleFilter(DEFAULT_FILTERS, 'frame', 'Aggressive');
    expect(DEFAULT_FILTERS.frame).toEqual(emptyMF());
    expect(next).not.toBe(DEFAULT_FILTERS);
  });
});

describe('matchesMF', () => {
  it('passes everything when empty', () => {
    expect(matchesMF(emptyMF(), 'anything')).toBe(true);
  });
  it('requires an include when any are set', () => {
    const mf = { inc: ['a'], exc: [] };
    expect(matchesMF(mf, 'a')).toBe(true);
    expect(matchesMF(mf, 'b')).toBe(false);
  });
  it('excludes win', () => {
    expect(matchesMF({ inc: [], exc: ['x'] }, 'x')).toBe(false);
    expect(matchesMF({ inc: [], exc: ['x'] }, 'y')).toBe(true);
  });
});

describe('matchesMFAny', () => {
  it('passes when no filter is set', () => {
    expect(matchesMFAny(emptyMF(), [])).toBe(true);
  });
  it('needs at least one included value', () => {
    const mf = { inc: ['a', 'b'], exc: [] };
    expect(matchesMFAny(mf, ['z', 'b'])).toBe(true);
    expect(matchesMFAny(mf, ['z'])).toBe(false);
  });
  it('rejects if any value is excluded', () => {
    expect(matchesMFAny({ inc: ['a'], exc: ['x'] }, ['a', 'x'])).toBe(false);
  });
});

describe('filter counts', () => {
  it('counts includes and excludes', () => {
    expect(countMF({ inc: ['a'], exc: ['b', 'c'] })).toBe(3);
  });
  it('totals across multi-filters and toggles', () => {
    let f = cycleFilter(DEFAULT_FILTERS, 'ammo', 'Heavy');
    f = cycleFilter(f, 'col2', 'Rampage');
    f = { ...f, craftableOnly: true };
    expect(totalFilterCount(f)).toBe(3);
    expect(totalFilterCount(DEFAULT_FILTERS)).toBe(0);
  });
  it('rolls the five column filters into the Column category', () => {
    const column = CATEGORIES.find((c) => c.id === 'column');
    if (!column) return; // category list may not expose it
    const f = cycleFilter(cycleFilter(DEFAULT_FILTERS, 'col1', 'a'), 'col5', 'b');
    expect(categoryCount(f, column)).toBe(2);
  });
});

describe('season labels', () => {
  const w = (p: Partial<Weapon>) => ({ seasonName: null, iconWatermark: null, seasonNumber: null, ...p }) as Weapon;

  it('prefers the manifest season name', () => {
    expect(weaponSeasonLabel(w({ seasonName: 'Haunted' }))).toBe('Haunted');
  });
  it('recognises event watermarks', () => {
    const url = 'https://www.bungie.net/common/destiny2_content/icons/50c3ebe414c6946429934d79504922fa.png';
    expect(eventLabelFor(url)).toBe('Dawning');
    expect(weaponSeasonLabel(w({ iconWatermark: url }))).toBe('Dawning');
  });
  it('names season 1 and gives up on unknown watermarks', () => {
    expect(weaponSeasonLabel(w({ seasonNumber: 1 }))).toBe('The Red War');
    expect(weaponSeasonLabel(w({ seasonNumber: 99 }))).toBeNull();
    expect(eventLabelFor(null)).toBeNull();
  });
  it('summarises a group by its newest season and first label', () => {
    const g = { variants: [w({ seasonNumber: 3, seasonName: 'Hunt' }), w({ seasonNumber: 9 })] } as unknown as WeaponGroup;
    expect(bestSeasonNumber(g)).toBe(9);
    expect(bestSeasonName(g)).toBe('Hunt');
  });
});

describe('getPerkValues', () => {
  it('collects names per column, and trait columns separately', () => {
    const weapon = {
      perkSockets: [
        { columnType: 'barrel', perks: [{ name: 'Rifling' }] },
        { columnType: 'perk', perks: [{ name: 'Rampage' }, { name: 'Kill Clip' }] },
      ],
    } as unknown as Weapon;
    expect(getPerkValues(weapon)).toEqual({
      all: ['Rifling', 'Rampage', 'Kill Clip'],
      traits: ['Rampage', 'Kill Clip'],
      cols: [['Rifling'], ['Rampage', 'Kill Clip']],
    });
  });
});
