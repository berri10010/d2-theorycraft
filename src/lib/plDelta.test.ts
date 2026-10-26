import { describe, it, expect } from 'vitest';
import { getPlDeltaMultiplier, fmtPlDelta } from './plDelta';

describe('getPlDeltaMultiplier', () => {
  it('is 1.0 at delta 0', () => {
    expect(getPlDeltaMultiplier(0)).toBeCloseTo(1, 10);
  });
  it('never decreases as delta rises', () => {
    let prev = getPlDeltaMultiplier(-50);
    for (let d = -49; d <= 30; d++) {
      const m = getPlDeltaMultiplier(d);
      expect(m).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = m;
    }
  });
  it('penalises being under-levelled and rewards over-levelled', () => {
    expect(getPlDeltaMultiplier(-20)).toBeLessThan(1);
    expect(getPlDeltaMultiplier(10)).toBeGreaterThan(1);
  });
  it('clamps outside the supported range', () => {
    expect(getPlDeltaMultiplier(-999)).toBe(getPlDeltaMultiplier(-50));
    expect(getPlDeltaMultiplier(999)).toBe(getPlDeltaMultiplier(30));
  });
});

describe('fmtPlDelta', () => {
  it('formats the baseline', () => {
    expect(fmtPlDelta(0)).toBe('+0 · +0.0%');
  });
  it('signs negative deltas', () => {
    expect(fmtPlDelta(-10)).toMatch(/^-10 · -\d+\.\d%$/);
  });
});

describe('difficulty curves (oracle_engine)', () => {
  it('Raid & Dungeon and Master cost damage even at level: 0.925 and 0.85', () => {
    expect(getPlDeltaMultiplier(0, 'raid')).toBeCloseTo(0.925, 4);
    expect(getPlDeltaMultiplier(0, 'master')).toBeCloseTo(0.85, 4);
  });
  it('matches the table at its knots and interpolates between them', () => {
    expect(getPlDeltaMultiplier(-10, 'raid')).toBeCloseTo(0.73, 4);
    expect(getPlDeltaMultiplier(-20, 'master')).toBeCloseTo(0.58, 4);
    expect(getPlDeltaMultiplier(-15, 'master')).toBeCloseTo((0.58 + 0.68) / 2, 4);
  });
  it('gives no bonus for being over-levelled', () => {
    expect(getPlDeltaMultiplier(30, 'raid')).toBeCloseTo(0.925, 4);
    expect(getPlDeltaMultiplier(10, 'master')).toBeCloseTo(0.85, 4);
  });
  it('is stricter than standard at every delta at or below zero', () => {
    for (let d = -50; d <= 0; d++) {
      expect(getPlDeltaMultiplier(d, 'master')).toBeLessThanOrEqual(getPlDeltaMultiplier(d, 'raid') + 1e-9);
    }
  });
  it('standard stays the default', () => {
    expect(getPlDeltaMultiplier(-10)).toBe(getPlDeltaMultiplier(-10, 'standard'));
  });
});
