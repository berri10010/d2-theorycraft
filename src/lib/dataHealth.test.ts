import { describe, it, expect } from 'vitest';
import { compareSnapshots, type DataSnapshot } from './dataHealth';
import type { WeaponStatEntry } from './weaponStats';

const stat = (lookup: string, p: Partial<WeaponStatEntry> = {}): WeaponStatEntry => ({
  lookup, type: 'T', ammo: 'p', frame: 'F', bodyDamage: 10, critDamage: 20, shotDelay: 5, burstDelay: null,
  chargeMs: null, shotsPerBurst: null, pellets: null, rpm: null, ...p,
});
const weapons = (n: number) => Array.from({ length: n }, (_, i) => ({ hash: String(i), name: `Gun ${i}` }));
const snap = (over: Partial<DataSnapshot> = {}): DataSnapshot => ({
  weapons: weapons(100), perkCount: 1000, sourceCount: 700, pvpCount: 80, stats: [stat('A'), stat('B')], ...over,
});

describe('compareSnapshots', () => {
  it('reports nothing to review when the data is identical', () => {
    const r = compareSnapshots(snap(), snap());
    expect(r.changed).toBe(false);
    expect(r.errors).toEqual([]);
    expect(r.markdown).toContain('No changes');
  });

  it('lists new and removed weapons and stat changes', () => {
    const after = snap({
      weapons: [...weapons(100).slice(1), { hash: '999', name: 'Brand New' }],
      stats: [stat('A', { bodyDamage: 12 }), stat('C')],
    });
    const r = compareSnapshots(snap(), after);
    expect(r.changed).toBe(true);
    expect(r.markdown).toContain('New weapons (1):** Brand New');
    expect(r.markdown).toContain('Removed weapons (1):** Gun 0');
    expect(r.markdown).toContain('A (bodyDamage 10→12)');
    expect(r.markdown).toContain('New stat rows (1):** C');
    expect(r.markdown).toContain('Stat rows dropped (1):** B');
    expect(r.errors).toEqual([]);
  });

  it('rejects a refresh that loses most of the weapons or perks', () => {
    expect(compareSnapshots(snap(), snap({ weapons: weapons(80) })).errors.join()).toMatch(/weapons disappeared/);
    expect(compareSnapshots(snap(), snap({ perkCount: 500 })).errors.join()).toMatch(/Perk count/);
    expect(compareSnapshots(snap(), snap({ weapons: [] })).errors.join()).toMatch(/empty/);
  });

  it('rejects non-numeric stat rows and warns about odd ones', () => {
    expect(compareSnapshots(null, snap({ stats: [stat('A', { bodyDamage: NaN })] })).errors.join()).toMatch(/non-numeric/);
    expect(compareSnapshots(null, snap({ stats: [stat('A', { critDamage: 5 })] })).warnings.join()).toMatch(/crit damage is below/);
  });

  it('works with no previous data', () => {
    const r = compareSnapshots(null, snap());
    expect(r.errors).toEqual([]);
    expect(r.markdown).toContain('No previous data');
  });

  it('caps long lists', () => {
    const after = snap({ weapons: [...weapons(100), ...Array.from({ length: 30 }, (_, i) => ({ hash: `n${i}`, name: `New ${i}` }))] });
    expect(compareSnapshots(snap(), after).markdown).toContain('(+15 more)');
  });
});
