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
