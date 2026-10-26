import { describe, it, expect } from 'vitest';
import { parsePersonalRolls } from './personalRolls';

const roll = { weaponHash: '1', weaponName: 'Gun', perkHashes: ['a', 'b'], savedAt: '2026-01-01' };

describe('parsePersonalRolls (finding 13)', () => {
  it('returns a valid saved list unchanged', () => {
    expect(parsePersonalRolls(JSON.stringify([roll]))).toEqual([roll]);
  });
  it('returns an empty list for missing or unparseable input', () => {
    expect(parsePersonalRolls(null)).toEqual([]);
    expect(parsePersonalRolls('')).toEqual([]);
    expect(parsePersonalRolls('{not json')).toEqual([]);
  });
  it('returns an empty list when the stored value is not an array', () => {
    expect(parsePersonalRolls('{"a":1}')).toEqual([]);
    expect(parsePersonalRolls('"text"')).toEqual([]);
    expect(parsePersonalRolls('null')).toEqual([]);
  });
  it('drops entries that are not shaped like a saved roll', () => {
    const raw = JSON.stringify([roll, null, 5, { weaponHash: '2' }, { ...roll, perkHashes: 'a,b' }, { ...roll, perkHashes: [1] }]);
    expect(parsePersonalRolls(raw)).toEqual([roll]);
  });
});
