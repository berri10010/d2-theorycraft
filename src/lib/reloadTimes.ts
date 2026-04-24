// Reload time formulas sourced from d2foundry/oracle_engine
// build_resources/weapon_formulas.json — "reload" coefficients per weapon type.
// Formula: time_seconds = evpp * stat² + vpp * stat + offset
// stat is the final reload value clamped to [0, 100].

interface QuadCoeff { evpp: number; vpp: number; offset: number }
interface GLCoeff    { special: QuadCoeff; heavy: QuadCoeff }

const RELOAD_FORMULAS: Record<string, QuadCoeff | GLCoeff> = {
  'Auto Rifle':          { evpp: 8.55689e-5,      vpp: -0.0242021,    offset: 2.80673006666667 },
  'Combat Bow':          { evpp: 5.35476056e-5,   vpp: -0.0102410419, offset: 1.10091136388022 },
  'Fusion Rifle':        { evpp: 6.15281e-5,      vpp: -0.0198054,    offset: 2.8285704 },
  'Glaive':              { evpp: 0,               vpp: -0.0175,       offset: 3.5 },
  'Grenade Launcher': {
    special: { evpp: 7.24199e-5,  vpp: -0.0216432, offset: 3.24104606666667 },
    heavy:   { evpp: 7.55233e-5,  vpp: -0.0248947, offset: 4.12880153333333 },
  },
  'Hand Cannon':         { evpp: 6.13759064e-5,   vpp: -0.0238552201, offset: 3.600042253 },
  'Linear Fusion Rifle': { evpp: 5.88462e-5,      vpp: -0.0199884,    offset: 2.87206463333 },
  'Machine Gun':         { evpp: 9.05351e-5,      vpp: -0.0305819,    offset: 6.1219905 },
  'Pulse Rifle':         { evpp: 9.26208e-5,      vpp: -0.0256877,    offset: 2.92627266666667 },
  'Rocket Launcher':     { evpp: 1.03959e-4,      vpp: -0.0252069,    offset: 4.09182213333333 },
  'Scout Rifle':         { evpp: 1.02915e-4,      vpp: -0.0276889,    offset: 3.11797356666666 },
  'Shotgun':             { evpp: 6.40462e-5,      vpp: -0.0141721,    offset: 1.25061 },
  'Sidearm':             { evpp: 2.38311e-5,      vpp: -0.0124553,    offset: 2.14667245 },
  'Sniper Rifle':        { evpp: 6.74498e-5,      vpp: -0.0231542,    offset: 3.8384 },
  'Submachine Gun':      { evpp: 6.08642e-5,      vpp: -0.0191345,    offset: 2.62769 },
  'Trace Rifle':         { evpp: 5e-5,            vpp: -0.0155,       offset: 2.65 },
};

const NORMALIZE: Record<string, string> = {
  'Breech Grenade Launcher':      'Grenade Launcher',
  'Wave Frame Grenade Launcher':  'Grenade Launcher',
  'Drum Grenade Launcher':        'Grenade Launcher',
  'Lightweight Grenade Launcher': 'Grenade Launcher',
  'Rocket-Assisted Frame':        'Sidearm',
  'Micro-Missile Frame':          'Sidearm',
};

function solveQuad(c: QuadCoeff, stat: number): number {
  const x = Math.max(0, Math.min(100, stat));
  return c.evpp * x * x + c.vpp * x + c.offset;
}

/** Returns reload time in milliseconds, or null if weapon type has no formula. */
export function calcReloadTime(
  itemTypeDisplayName: string,
  ammoType: number,        // 1=Primary, 2=Special, 3=Heavy
  reloadStat: number,
): number | null {
  const key     = NORMALIZE[itemTypeDisplayName] ?? itemTypeDisplayName;
  const formula = RELOAD_FORMULAS[key];
  if (!formula) return null;

  const coeff: QuadCoeff = 'special' in formula
    ? (ammoType === 3 ? formula.heavy : formula.special)
    : formula as QuadCoeff;

  return Math.round(solveQuad(coeff, reloadStat) * 1000);
}
