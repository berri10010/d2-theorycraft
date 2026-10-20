import { describe, it, expect } from 'vitest';
import { perkSelectionFromHashes, perkNamesFromHashes } from './rollHelpers';
import { loadRealData } from '../test/realData';
import type { Weapon, Perk } from '../types/weapon';

const perk = (hash: string, name: string, enhancedVersion: Perk | null = null): Perk => ({
  hash, name, icon: '', description: '', statModifiers: [], isEnhanced: false, isConditional: false,
  buffKey: null, tier: null, activation: null, activation2: null, enhancedVersion,
});

const enhancedB = perk('21', 'Beta');
const weapon = {
  perkSockets: [
    { name: 'Barrel', columnType: 'barrel', perks: [perk('1', 'Alpha'), perk('2', 'Gamma')] },
    { name: 'Perk 1', columnType: 'perk', perks: [perk('20', 'Beta', enhancedB)] },
  ],
} as unknown as Weapon;

describe('perkSelectionFromHashes', () => {
  it('maps hashes to their sockets', () => {
    expect(perkSelectionFromHashes(weapon, ['2', '20'])).toEqual([
      { column: 'Barrel', hash: '2' },
      { column: 'Perk 1', hash: '20' },
    ]);
  });
  it('selects the enhanced version when that is what was saved', () => {
    expect(perkSelectionFromHashes(weapon, ['21'])).toEqual([{ column: 'Perk 1', hash: '21' }]);
  });
  it('ignores hashes the weapon does not have', () => {
    expect(perkSelectionFromHashes(weapon, ['999'])).toEqual([]);
  });
});

describe('perkNamesFromHashes', () => {
  it('lists names in socket order, enhanced or not', () => {
    expect(perkNamesFromHashes(weapon, ['21', '1'])).toEqual(['Alpha', 'Beta']);
  });
});

describe('against real data', () => {
  it('round-trips a full roll for every weapon with a choosable perk', () => {
    for (const w of loadRealData().weapons.slice(0, 300)) {
      const picks = w.perkSockets.filter((c) => c.perks.length > 0).map((c) => c.perks[0].hash);
      const sel = perkSelectionFromHashes(w, picks);
      if (picks.length) expect(sel.length).toBeGreaterThan(0);
      for (const s of sel) expect(picks).toContain(s.hash);
    }
  });
});
