import { describe, it, expect } from 'vitest';
import { buildRollParams, buildDimWishlistEntry } from './shareRoll';
import { parseWishlist, isWishlistMatch } from './wishlistParser';
import type { Weapon, Perk } from '../types/weapon';

const perk = (hash: string, enhancedVersion: Perk | null = null) => ({ hash, name: hash, enhancedVersion }) as unknown as Perk;

const weapon = {
  hash: '777',
  name: "The Messenger's Gift!",
  perkSockets: [
    { name: 'Barrel', columnType: 'barrel', perks: [perk('b1')] },
    { name: 'Perk 1', columnType: 'perk', perks: [perk('t1', perk('t1e'))] },
    { name: 'Perk 2', columnType: 'perk', perks: [perk('t2')] },
    { name: 'Origin', columnType: 'origin', perks: [perk('o1')] },
  ],
} as unknown as Weapon;

const base = { weapon, selectedPerks: {}, mode: 'pve' as const, masterworkStat: null, weaponsStat: 0, activeBuffs: [], weaponTier: 1 };

describe('buildRollParams', () => {
  it('always carries weapon, readable slug and mode', () => {
    const p = buildRollParams(base);
    expect(p.get('w')).toBe('777');
    expect(p.get('name')).toBe('the-messenger-s-gift');
    expect(p.get('m')).toBe('pve');
  });
  it('omits defaults', () => {
    const p = buildRollParams(base);
    for (const k of ['p', 'mw', 'ws', 'b', 'tier']) expect(p.has(k)).toBe(false);
  });
  it('includes every non-default part of the roll', () => {
    const p = buildRollParams({
      ...base, selectedPerks: { 'Perk 1': 't1', Barrel: 'b1' }, mode: 'pvp', masterworkStat: 'Range',
      weaponsStat: 100, activeBuffs: ['wellOfRadiance', 'surge'], weaponTier: 5,
    });
    expect(p.get('p')).toBe('t1,b1');
    expect(p.get('m')).toBe('pvp');
    expect(p.get('mw')).toBe('Range');
    expect(p.get('ws')).toBe('100');
    expect(p.get('b')).toBe('wellOfRadiance,surge');
    expect(p.get('tier')).toBe('5');
  });
  it('survives a URL round trip', () => {
    const qs = buildRollParams({ ...base, selectedPerks: { 'Perk 1': 't1' }, activeBuffs: ['a', 'b'] }).toString();
    const back = new URLSearchParams(qs);
    expect(back.get('p')).toBe('t1');
    expect(back.get('b')).toBe('a,b');
  });
});

describe('buildDimWishlistEntry', () => {
  it('orders trait columns right-to-left with origin last', () => {
    const entry = buildDimWishlistEntry(weapon, ['b1', 't1', 't2', 'o1']);
    expect(entry.split('\n')[0]).toBe('dimwishlist:item=777&perks=t2,t1,b1,o1');
  });
  it('treats an enhanced perk like its base for ordering', () => {
    const entry = buildDimWishlistEntry(weapon, ['b1', 't1e']);
    expect(entry.split('\n')[0]).toBe('dimwishlist:item=777&perks=t1e,b1');
  });
  it('adds a notes comment and handles an empty roll', () => {
    const entry = buildDimWishlistEntry(weapon, []);
    expect(entry).toBe("dimwishlist:item=777\n//notes:The Messenger's Gift! — via D2 Theorycraft");
  });
  it('is parseable by our own wishlist parser', () => {
    const db = parseWishlist(buildDimWishlistEntry(weapon, ['t1', 't2']));
    expect(isWishlistMatch(db, '777', ['t1', 't2', 'b1'])).toBe(true);
  });
});
