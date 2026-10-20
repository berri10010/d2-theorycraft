import { describe, it, expect } from 'vitest';
import { applyStatDeltas } from './statCalc';
import { loadRealData } from '../test/realData';
import { interpolateStat } from './math';

// A sidearm-style magazine curve (raw → rounds), from Bungie's stat group 715017193.
const MAG = [
  { stat: 0, value: 9 }, { stat: 10, value: 10 }, { stat: 19, value: 10 }, { stat: 20, value: 11 },
  { stat: 29, value: 11 }, { stat: 30, value: 12 }, { stat: 39, value: 12 }, { stat: 40, value: 13 },
  { stat: 49, value: 13 }, { stat: 50, value: 14 }, { stat: 59, value: 14 }, { stat: 60, value: 15 },
  { stat: 69, value: 15 }, { stat: 70, value: 16 }, { stat: 79, value: 16 }, { stat: 80, value: 17 },
  { stat: 89, value: 17 }, { stat: 90, value: 18 }, { stat: 99, value: 18 }, { stat: 100, value: 20 },
];

describe('applyStatDeltas', () => {
  it('adds and clamps plain stats once, after summing every source', () => {
    // +20 and -10 from different sources on a stat at 95 sum to +10 -> 105 -> 100.
    expect(applyStatDeltas({ Range: 95 }, { Range: 20 + -10 }).Range).toBe(100);
    // A bonus cancelled by an equal penalty must cancel exactly. Clamping after each source
    // (the old behaviour) turned 95 + 30 into 100, then -30 into 70.
    expect(applyStatDeltas({ Range: 95 }, { Range: 30 + -30 }).Range).toBe(95);
    expect(applyStatDeltas({ Range: 5 }, { Range: -20 }).Range).toBe(0);
  });

  it('leaves untouched stats alone', () => {
    expect(applyStatDeltas({ Range: 40, Handling: 60 }, { Range: 5 })).toEqual({ Range: 45, Handling: 60 });
  });

  it('applies raw deltas through the display curve, not to the displayed value', () => {
    const out = applyStatDeltas({ Magazine: 15 }, { Magazine: 20 }, { rawStats: { Magazine: 65 }, displayCurves: { Magazine: MAG } });
    // raw 65 -> 85 : 15 -> 17 rounds (adding +20 to 15 gave 35)
    expect(out.Magazine).toBe(17);
  });

  it('returns the displayed base unchanged when there is no delta', () => {
    const out = applyStatDeltas({ Magazine: 15 }, {}, { rawStats: { Magazine: 65 }, displayCurves: { Magazine: MAG } });
    expect(out.Magazine).toBe(15);
  });

  it('caps the raw total at 100 before interpolating', () => {
    const out = applyStatDeltas({ Magazine: 15 }, { Magazine: 500 }, { rawStats: { Magazine: 65 }, displayCurves: { Magazine: MAG } });
    expect(out.Magazine).toBe(20); // curve tops out at 20 rounds: 15 + (20 - 15)
  });

  it('keeps a base the manifest rounded differently (anchored on the displayed value)', () => {
    // displayed 36 although the curve says 37 at raw 63 (burst weapons snap to multiples of 3)
    const burst = [{ stat: 60, value: 36 }, { stat: 69, value: 39 }, { stat: 70, value: 39 }, { stat: 79, value: 42 }];
    const out = applyStatDeltas({ Magazine: 36 }, { Magazine: 10 }, { rawStats: { Magazine: 63 }, displayCurves: { Magazine: burst } });
    expect(out.Magazine).toBe(36 + Math.round((interpolateStat(73, burst) as number) - (interpolateStat(63, burst) as number)));
  });

  it('falls back to additive for uncapped stats without curve data', () => {
    expect(applyStatDeltas({ 'Draw Time': 600 }, { 'Draw Time': -40 })['Draw Time']).toBe(560);
    expect(applyStatDeltas({ Magazine: 15 }, { Magazine: 4 }).Magazine).toBe(19);
    expect(applyStatDeltas({ 'Draw Time': 20 }, { 'Draw Time': -90 })['Draw Time']).toBe(0);
  });
});

describe('curve data in the shipped weapon pack', () => {
  const { weapons } = loadRealData();
  const curved = weapons.filter((w) => w.displayCurves && w.rawStats);

  it('exists for a large share of weapons and shares curves by reference', () => {
    expect(curved.length).toBeGreaterThan(1000);
    const byGroup = new Map<string, object>();
    for (const w of curved) {
      const prev = byGroup.get(w.statGroup!);
      if (prev) expect(w.displayCurves).toBe(prev);
      else byGroup.set(w.statGroup!, w.displayCurves!);
    }
  });

  it('carries a raw value for every curve, with sorted raw inputs', () => {
    for (const w of curved) {
      for (const [stat, nodes] of Object.entries(w.displayCurves!)) {
        expect(w.rawStats![stat], `${w.name} ${stat} raw`).toBeTypeOf('number');
        for (let i = 1; i < nodes.length; i++) expect(nodes[i].stat).toBeGreaterThanOrEqual(nodes[i - 1].stat);
      }
    }
  });

  it('interpolating the raw base reproduces the displayed base for most weapons', () => {
    // Bungie's curve + rounding matches the manifest's own display value for ~94% of
    // (weapon, stat) pairs; the rest are frame-specific roundings, which applyStatDeltas
    // handles by anchoring on the displayed value.
    let total = 0, match = 0;
    for (const w of curved) {
      for (const [stat, nodes] of Object.entries(w.displayCurves!)) {
        if (w.baseStats[stat] === undefined) continue; // group describes stats this weapon doesn't show
        total++;
        const shown = interpolateStat(Math.max(0, Math.min(100, w.rawStats![stat])), nodes);
        if (shown !== null && Math.round(shown) === w.baseStats[stat]) match++;
      }
    }
    expect(match / total).toBeGreaterThan(0.9);
  });
});
