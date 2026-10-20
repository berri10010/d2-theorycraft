/**
 * Shared geometry for the TTK / falloff SVG charts.
 * Every chart draws in a W×H viewBox with a PL/PT/PR/PB margin.
 */

export const W = 500;
export const H = 200;
export const PL = 46;
export const PB = 28;
export const PR = 14;
export const PT = 14;
/** Inner plot width / height (viewBox minus margins). */
export const IW = W - PL - PR;
export const IH = H - PT - PB;

/** Map a 0–1 x fraction and a data y value to plot coordinates (y grows downward). */
export function toSvg(x: number, y: number, yMin: number, yMax: number): [number, number] {
  return [x * IW, IH - ((y - yMin) / (yMax - yMin)) * IH];
}

/** Piecewise-linear lookup on a stat → value curve; clamps outside the curve, 0 if empty. */
export function interpolate(curve: Array<{ stat: number; value: number }>, statVal: number): number {
  if (!curve || curve.length === 0) return 0;
  const clamped = Math.max(curve[0].stat, Math.min(curve[curve.length - 1].stat, statVal));
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i], b = curve[i + 1];
    if (clamped >= a.stat && clamped <= b.stat) {
      const t = (clamped - a.stat) / (b.stat - a.stat);
      return a.value + t * (b.value - a.value);
    }
  }
  return curve[curve.length - 1].value;
}

/** Points → SVG path data ("M x y L x y …"). */
export function pathStr(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

/** Translate a mouse event over an SVG with this viewBox into a clamped plot-space x. */
export function plotXFromMouse(clientX: number, rect: { left: number; width: number }): number {
  const svgX = ((clientX - rect.left) / rect.width) * W - PL;
  return Math.max(0, Math.min(IW, svgX));
}
