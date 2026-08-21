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

export function adsMultiplier(zoom: number, subtype?: number): number {
  if (subtype === 17) return 1.200; // Sidearm: measured ×1.2 at zoom=12
  if (subtype === 11) return 1.299; // Fusion Rifle: measured ×1.3 at zoom=15
  return (zoom + 7) / 14;           // Calibrated: exact at zoom=14 (HC) and zoom=21 (Scout)
}

export function roundTo3(val: number): number {
  return Math.round(val * 1000) / 1000;
}

