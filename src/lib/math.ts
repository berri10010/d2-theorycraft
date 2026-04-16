import { StatCurveNode } from '../types/weapon';

export function interpolateStat(statValue: number, curve?: StatCurveNode[]): number | null {
  if (!curve || curve.length === 0) return null;
  if (statValue <= curve[0].stat) return curve[0].value;
  if (statValue >= curve[curve.length - 1].stat) return curve[curve.length - 1].value;

  for (let i = 0; i < curve.length - 1; i++) {
    const min = curve[i];
    const max = curve[i + 1];
    if (statValue >= min.stat && statValue <= max.stat) {
      const statRange = max.stat - min.stat;
      const valRange = max.value - min.value;
      const progress = statValue - min.stat;
      return min.value + (progress / statRange) * valRange;
    }
  }
  return null;
}

export function adsMultiplier(zoom: number): number {
  return 1 + Math.max(0, zoom - 10) * 0.033;
}

export function roundTo3(val: number): number {
  return Math.round(val * 1000) / 1000;
}

