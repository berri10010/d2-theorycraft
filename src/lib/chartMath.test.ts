import { describe, it, expect } from 'vitest';
import { IW, IH, W, PL, toSvg, interpolate, pathStr, plotXFromMouse } from './chartMath';

describe('toSvg', () => {
  it('maps the data range onto the plot, y growing downward', () => {
    expect(toSvg(0, 0, 0, 10)).toEqual([0, IH]);
    expect(toSvg(1, 10, 0, 10)).toEqual([IW, 0]);
    expect(toSvg(0.5, 5, 0, 10)[1]).toBeCloseTo(IH / 2, 10);
  });
});

describe('interpolate', () => {
  const curve = [{ stat: 0, value: 0 }, { stat: 100, value: 50 }];
  it('is linear between nodes and clamps outside', () => {
    expect(interpolate(curve, 50)).toBe(25);
    expect(interpolate(curve, -10)).toBe(0);
    expect(interpolate(curve, 500)).toBe(50);
  });
  it('returns 0 for an empty curve', () => {
    expect(interpolate([], 10)).toBe(0);
  });
});

describe('pathStr', () => {
  it('builds M/L path data with one decimal', () => {
    expect(pathStr([[0, 0], [1.26, 2.04]])).toBe('M 0.0 0.0 L 1.3 2.0');
    expect(pathStr([])).toBe('');
  });
});

describe('plotXFromMouse', () => {
  const rect = { left: 100, width: W }; // 1:1 pixel scale
  it('removes the left margin and clamps to the plot', () => {
    expect(plotXFromMouse(100 + PL + 40, rect)).toBe(40);
    expect(plotXFromMouse(0, rect)).toBe(0);
    expect(plotXFromMouse(10_000, rect)).toBe(IW);
  });
});
