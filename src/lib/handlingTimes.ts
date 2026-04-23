// Handling time formulas sourced from d2foundry/oracle_engine
// build_resources/weapon_formulas.json — "handling" coefficients per weapon type.
// Formula: time_seconds = vpp * stat + offset  (evpp is 0 for all types)
// stat is the final handling value clamped to [0, 100].

interface HandlingCoeff {
  ready: { vpp: number; offset: number };
  stow:  { vpp: number; offset: number };
  ads:   { vpp: number; offset: number };
}

const FORMULAS: Record<string, HandlingCoeff> = {
  'Auto Rifle': {
    ready: { vpp: -0.00279338,      offset: 0.51985381 },
    stow:  { vpp: -0.00268436,      offset: 0.48414822 },
    ads:   { vpp: -0.001875,        offset: 0.38975 },
  },
  'Combat Bow': {
    ready: { vpp: -0.002909930716,  offset: 0.7364549654 },
    stow:  { vpp: -0.00179330254,   offset: 0.5396466513 },
    ads:   { vpp: -0.001855658199,  offset: 0.5293778291 },
  },
  'Fusion Rifle': {
    ready: { vpp: -0.001448069241,  offset: 0.4990612517 },
    stow:  { vpp: -0.002863515313,  offset: 0.4445712383 },
    ads:   { vpp: -0.001693741678,  offset: 0.4112330226 },
  },
  'Glaive': {
    ready: { vpp: -0.002139219,     offset: 0.42369 },
    stow:  { vpp: -0.002827674,     offset: 0.5147 },
    ads:   { vpp: 0.0,              offset: 0.0 },
  },
  'Grenade Launcher': {
    ready: { vpp: -0.00272791,      offset: 0.55133684 },
    stow:  { vpp: -0.00232786,      offset: 0.48726765 },
    ads:   { vpp: -0.00187072,      offset: 0.50019128 },
  },
  'Hand Cannon': {
    ready: { vpp: -0.002942857143,  offset: 0.4782571429 },
    stow:  { vpp: -0.002952380952,  offset: 0.5133809524 },
    ads:   { vpp: -0.001666666667,  offset: 0.3316666667 },
  },
  'Linear Fusion Rifle': {
    ready: { vpp: -0.001448069241,  offset: 0.4990612517 },
    stow:  { vpp: -0.002863515313,  offset: 0.4445712383 },
    ads:   { vpp: -0.001693741678,  offset: 0.4112330226 },
  },
  'Machine Gun': {
    ready: { vpp: -0.002391721353,  offset: 0.4950499748 },
    stow:  { vpp: -0.002041393236,  offset: 0.4547501262 },
    ads:   { vpp: -0.001234477537,  offset: 0.4574687027 },
  },
  'Pulse Rifle': {
    ready: { vpp: -0.00312085,      offset: 0.54370932 },
    stow:  { vpp: -0.0035545,       offset: 0.55005845 },
    ads:   { vpp: -0.00196208,      offset: 0.4574687 },
  },
  'Rocket Launcher': {
    ready: { vpp: -0.003998740554,  offset: 0.6635944584 },
    stow:  { vpp: -0.003296509536,  offset: 0.5463332134 },
    ads:   { vpp: -0.002139258726,  offset: 0.528984167 },
  },
  'Scout Rifle': {
    ready: { vpp: -0.00285336856,   offset: 0.540561867 },
    stow:  { vpp: -0.002941215324,  offset: 0.527217745 },
    ads:   { vpp: -0.001693527081,  offset: 0.4114236019 },
  },
  'Shotgun': {
    ready: { vpp: -0.003271255061,  offset: 0.5388744939 },
    stow:  { vpp: -0.003388663968,  offset: 0.5711336032 },
    ads:   { vpp: -0.00233805668,   offset: 0.451194332 },
  },
  'Sidearm': {
    ready: { vpp: -0.00264010989,   offset: 0.4232582418 },
    stow:  { vpp: -0.00197527473,   offset: 0.4298956044 },
    ads:   { vpp: -0.0022293956,    offset: 0.3435796703 },
  },
  'Sniper Rifle': {
    ready: { vpp: -0.002623944983,  offset: 0.5079465458 },
    stow:  { vpp: -0.002083932479,  offset: 0.4392525789 },
    ads:   { vpp: -0.00194998437,   offset: 0.5021325414 },
  },
  'Submachine Gun': {
    ready: { vpp: -0.002376970528,  offset: 0.4710178204 },
    stow:  { vpp: -0.002547978067,  offset: 0.4481295408 },
    ads:   { vpp: -0.001873200822,  offset: 0.3581576422 },
  },
  'Trace Rifle': {
    ready: { vpp: -0.00279338,      offset: 0.51985381 },
    stow:  { vpp: -0.00268436,      offset: 0.48414822 },
    ads:   { vpp: -0.001875,        offset: 0.38975 },
  },
};

// Bungie manifest itemTypeDisplayNames that need to be normalized to formula keys.
const NORMALIZE: Record<string, string> = {
  'Breech Grenade Launcher':       'Grenade Launcher',
  'Wave Frame Grenade Launcher':   'Grenade Launcher',
  'Drum Grenade Launcher':         'Grenade Launcher',
  'Lightweight Grenade Launcher':  'Grenade Launcher',
  'Rocket-Assisted Frame':         'Rocket Launcher',
  'Micro-Missile Frame':           'Sidearm',
};

function solveAt(c: { vpp: number; offset: number }, stat: number): number {
  const x = Math.max(0, Math.min(100, stat));
  return c.vpp * x + c.offset;
}

export interface HandlingTimes {
  readyMs: number;
  adsMs:   number;
  stowMs:  number;
}

export function calcHandlingTimes(
  itemTypeDisplayName: string,
  handlingStat: number,
): HandlingTimes | null {
  const key     = NORMALIZE[itemTypeDisplayName] ?? itemTypeDisplayName;
  const formula = FORMULAS[key];
  if (!formula) return null;
  return {
    readyMs: Math.round(solveAt(formula.ready, handlingStat) * 1000),
    adsMs:   Math.round(solveAt(formula.ads,   handlingStat) * 1000),
    stowMs:  Math.round(solveAt(formula.stow,  handlingStat) * 1000),
  };
}
