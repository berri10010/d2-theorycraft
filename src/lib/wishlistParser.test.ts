import { describe, it, expect } from 'vitest';
import { parseWishlist, isWishlistMatch, exportPersonalWishlist } from './wishlistParser';

const SAMPLE = `title:Test list
description:ignored
// a comment
dimwishlist:item=111&perks=1,2,3&tags=pve
dimwishlist:item=111&perks=1,2,3&tags=pve
dimwishlist:item=111&perks=4,5
dimwishlist:item=-69420&perks=9
dimwishlist:item=222
not a wishlist line
`;

describe('parseWishlist', () => {
  const db = parseWishlist(SAMPLE);

  it('groups entries by weapon and drops junk lines', () => {
    expect([...db.keys()]).toEqual(['111']);
  });
  it('de-duplicates identical perk sets with identical tags', () => {
    expect(db.get('111')).toHaveLength(2);
  });
  it('lowercases and splits tags', () => {
    expect(db.get('111')![0].tags).toEqual(['pve']);
    expect(db.get('111')![1].tags).toEqual([]);
  });
});

describe('isWishlistMatch', () => {
  const db = parseWishlist(SAMPLE);
  it('requires every perk in a set', () => {
    expect(isWishlistMatch(db, '111', ['1', '2', '3', '99'])).toBe(true);
    expect(isWishlistMatch(db, '111', ['1', '2'])).toBe(false);
  });
  it('matches any entry for the weapon', () => {
    expect(isWishlistMatch(db, '111', ['4', '5'])).toBe(true);
  });
  it('is false for unknown weapons', () => {
    expect(isWishlistMatch(db, '404', ['1'])).toBe(false);
  });
});

describe('exportPersonalWishlist', () => {
  it('round-trips through parseWishlist', () => {
    const text = exportPersonalWishlist([{ weaponHash: '555', weaponName: 'Test Gun', perkHashes: ['7', '8'] }]);
    const db = parseWishlist(text);
    expect(isWishlistMatch(db, '555', ['7', '8'])).toBe(true);
    expect(db.get('555')![0].tags).toEqual(['personal']);
  });
});
