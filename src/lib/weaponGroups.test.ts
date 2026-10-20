import { describe, it, expect } from 'vitest';
import { groupWeapons, isLegacyVariant } from './weaponGroups';
import { loadRealData } from '../test/realData';
import type { Weapon } from '../types/weapon';

const w = (hash: string, baseName: string, p: Partial<Weapon> = {}) =>
  ({ hash, name: baseName, baseName, variantLabel: null, isAdept: false, seasonNumber: 1, screenshot: 'x', icon: 'y', ...p }) as Weapon;

describe('groupWeapons', () => {
  const groups = groupWeapons([
    w('1', 'Zed'),
    w('2', 'Alpha', { seasonNumber: 3 }),
    w('3', 'Alpha', { variantLabel: 'Adept', isAdept: true, seasonNumber: 3 }),
    w('4', 'Alpha', { seasonNumber: 9, variantLabel: 'Timelost' }),
  ]);

  it('groups by baseName and sorts groups alphabetically', () => {
    expect(groups.map((g) => g.baseName)).toEqual(['Alpha', 'Zed']);
    expect(groups[0].variants).toHaveLength(3);
  });
  it('sorts the base version first', () => {
    expect(groups[0].variants[0].variantLabel).toBeNull();
  });
  it('picks the highest season as the default', () => {
    expect(groups[0].default.hash).toBe('4');
  });
  it('flags base versions with an adept sibling as legacy', () => {
    const base = groups[0].variants.find((v) => v.hash === '2')!;
    const adept = groups[0].variants.find((v) => v.hash === '3')!;
    expect(isLegacyVariant(base, groups[0])).toBe(true);
    expect(isLegacyVariant(adept, groups[0])).toBe(false);
  });
});

describe('groupWeapons (real data)', () => {
  it('has a default that belongs to its own group', () => {
    for (const g of groupWeapons(loadRealData().weapons)) {
      expect(g.variants).toContain(g.default);
    }
  });
});
