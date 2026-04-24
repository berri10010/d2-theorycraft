// Bow perfect-draw-start formulas from d2foundry/oracle_engine subFamilies 905/906.
// Formula: perfect_draw_start_s = k * stability + offset
// stat clamped to [0, 100].

const SUBFAM_COEFF: Record<string, { k: number; offset: number }> = {
  '905': { k: 0.003,    offset: 0.5 }, // Precision Frame
  '906': { k: 1 / 400,  offset: 0.3 }, // Lightweight / High-Impact Frame
};

const FRAME_TO_SUBFAM: Record<string, string> = {
  'Precision Frame': '905',
};

/** Returns the perfect-draw-start time in ms, or null if not a known bow frame. */
export function calcBowPerfectDraw(
  intrinsicFrameName: string | null,
  stabilityStat: number,
): number | null {
  const subfam = intrinsicFrameName
    ? (FRAME_TO_SUBFAM[intrinsicFrameName] ?? '906')
    : '906';
  const coeff = SUBFAM_COEFF[subfam];
  if (!coeff) return null;
  const x = Math.max(0, Math.min(100, stabilityStat));
  return Math.round((coeff.k * x + coeff.offset) * 1000);
}
