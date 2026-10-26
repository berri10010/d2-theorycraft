import { describe, it, expect } from 'vitest';
import { interpolateStat, adsMultiplier, roundTo3, lerp, clamp } from './math';

const curve = [
  { stat: 0, value: 10 },
  { stat: 50, value: 20 },
  { stat: 100, value: 60 },
];

describe('interpolateStat', () => {
  it('returns null without a curve', () => {
    expect(interpolateStat(40, undefined)).toBeNull();
    expect(interpolateStat(40, [])).toBeNull();
  });
  it('clamps to the end points', () => {
    expect(interpolateStat(-5, curve)).toBe(10);
    expect(interpolateStat(150, curve)).toBe(60);
  });
  it('returns exact node values', () => {
    expect(interpolateStat(0, curve)).toBe(10);
    expect(interpolateStat(50, curve)).toBe(20);
    expect(interpolateStat(100, curve)).toBe(60);
  });
  it('interpolates linearly between nodes', () => {
    expect(interpolateStat(25, curve)).toBe(15);
    expect(interpolateStat(75, curve)).toBe(40);
  });
});

describe('adsMultiplier', () => {
  it('uses measured constants for sidearms and fusion rifles', () => {
    expect(adsMultiplier(12, 17)).toBe(1.2);
    expect(adsMultiplier(15, 11)).toBe(1.299);
  });
  it('is exact at the calibration points', () => {
    expect(adsMultiplier(14)).toBe(1.5);
    expect(adsMultiplier(21)).toBe(2);
  });
});

describe('roundTo3', () => {
  it('rounds to three decimals', () => {
    expect(roundTo3(1.23456)).toBe(1.235);
    expect(roundTo3(2)).toBe(2);
  });
});

describe('lerp and clamp (shared helpers)', () => {
  it('lerp runs from a to b', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
  it('clamp keeps a value inside its range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});
