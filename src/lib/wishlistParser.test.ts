import { describe, it, expect } from 'vitest';
import { parseWishlist, isWishlistMatch, exportPersonalWishlist, wishlistEntryCount } from './wishlistParser';

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

describe('parseWishlist notes (finding 3)', () => {
  const NOTES = [
    'dimwishlist:item=100&perks=1,2,3#notes:Great for PvE',
    'dimwishlist:item=101&perks=4,5&tags=pvp#notes:hi',
    'dimwishlist:item=102&perks=6#notes:only a note after one perk',
  ].join('\n');
  const db = parseWishlist(NOTES);

  it('cuts each line at the first # so the last perk and tag stay clean', () => {
    expect(db.get('100')![0].perkSets).toEqual([['1', '2', '3']]);
    expect(db.get('101')![0].tags).toEqual(['pvp']);
  });
  it('matches a roll for a line that carries a #notes: suffix', () => {
    expect(isWishlistMatch(db, '100', ['1', '2', '3'])).toBe(true);
    expect(isWishlistMatch(db, '102', ['6'])).toBe(true);
  });
});

describe('parseWishlist input checks (BUG_REPORT_2 N4)', () => {
  it('requires a numeric weapon hash', () => {
    const db = parseWishlist(['dimwishlist:item=abc&perks=1,2,3', 'dimwishlist:item=12x&perks=1', 'dimwishlist:item= 5&perks=1', 'dimwishlist:item=777&perks=1'].join('\n'));
    expect([...db.keys()]).toEqual(['777']);
  });
  it('finds no entries in text that is not a wishlist, so the panel can reject the file', () => {
    expect(wishlistEntryCount(parseWishlist('\u0000\u0001\u0002 binary \ufffd junk\nmore junk'))).toBe(0);
    expect(wishlistEntryCount(parseWishlist(''))).toBe(0);
    expect(wishlistEntryCount(parseWishlist('title:only metadata\n// and a comment'))).toBe(0);
  });
  it('counts every entry across weapons', () => {
    expect(wishlistEntryCount(parseWishlist('dimwishlist:item=1&perks=1\ndimwishlist:item=1&perks=2\ndimwishlist:item=2&perks=3'))).toBe(3);
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
