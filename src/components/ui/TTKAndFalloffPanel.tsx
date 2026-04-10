'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { getArchetype } from '../../lib/archetypes';
import { calculateTTK, calculateTTKCurve, PVE_HEALTH_TIERS, TTKBreakpoint } from '../../lib/damageMath';
import { useAnimatedPath } from '../../hooks/useAnimatedPath';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

// ── Constants ─────────────────────────────────────────────────────────────────

const PVP_GUARDIAN_HP = 230;
const PVE_TIERS_KEYS = Object.keys(PVE_HEALTH_TIERS);
const FALLOFF_FLOOR = 0.5;

// SVG dimensions
const W = 500, H = 200, PL = 46, PB = 28, PR = 14, PT = 14;
const IW = W - PL - PR;
const IH = H - PT - PB;

function toSvg(x: number, y: number, yMin: number, yMax: number): [number, number] {
  return [x * IW, IH - ((y - yMin) / (yMax - yMin)) * IH];
}

function adsMultiplier(zoom: number): number {
  return 1 + Math.max(0, zoom - 10) * 0.033;
}

function interpolate(curve: Array<{ stat: number; value: number }>, statVal: number): number {
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

// ── Sparkline helpers ─────────────────────────────────────────────────────────

function buildSparklinePath(
  breakpoints: TTKBreakpoint[],
  maxDist: number,
  yMin: number,
  yMax: number,
): [number, number][] {
  if (breakpoints.length === 0) return [];
  return breakpoints.map((bp) =>
    toSvg(bp.distance / maxDist, bp.shotsToKill, yMin, yMax)
  );
}

function pathStr(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

// ── Main component ────────────────────────────────────────────────────────────

export const TTKAndFalloffPanel: React.FC = () => {
  const {
    activeWeapon, getCalculatedStats, mode,
    weaponsStat, setWeaponsStat,
    getDamageMultiplier, activeBuffs, activeMod, surgeStacks,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:        s.activeWeapon,
      getCalculatedStats:  s.getCalculatedStats,
      mode:                s.mode,
      weaponsStat:         s.weaponsStat,
      setWeaponsStat:      s.setWeaponsStat,
      getDamageMultiplier: s.getDamageMultiplier,
      activeBuffs:         s.activeBuffs,
      activeMod:           s.activeMod,
      surgeStacks:         s.surgeStacks,
    }))
  );

  const [enemyTier, setEnemyTier] = useState(PVE_TIERS_KEYS[0]);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [showAds, setShowAds] = useState(true);
  const [showHip, setShowHip] = useState(true);
  const [expanded, setExpanded] = useState<'ttk' | 'falloff' | null>(null);

  // Close expanded chart on Escape
  const closeExpanded = useCallback(() => setExpanded(null), []);
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeExpanded(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, closeExpanded]);

  const calcStats = getCalculatedStats();
  const rangeStat = calcStats['Range'] ?? 0;
  const zoomStat  = calcStats['Zoom'] ?? 14;

  const multiplier = useMemo(() => getDamageMultiplier(), [
    activeBuffs, activeMod, surgeStacks, mode, weaponsStat,
  ]);

  if (!activeWeapon) return null;

  const enemyHealth = PVE_HEALTH_TIERS[enemyTier] ?? 336;
  const pvpWeaponsBonus = Math.max(0, weaponsStat - 100) / 100 * 0.05;

  // ── TTK result ────────────────────────────────────────────────────────
  const ttkResult = calculateTTK(
    mode, activeWeapon, multiplier, PVP_GUARDIAN_HP, enemyHealth,
  );

  // ── Falloff curve data ────────────────────────────────────────────────
  const rangeCurve = activeWeapon.statCurves?.['Range'];
  const archetype  = getArchetype(activeWeapon.itemSubType, activeWeapon.rpm);
  const dmg = archetype ? (mode === 'pvp' ? archetype.pvp : archetype.pve) : null;
  const critDmg = dmg?.crit ?? 0;
  const bodyDmg = dmg?.body ?? 0;

  const hipFalloffStart = useMemo(() => {
    if (!rangeCurve || rangeCurve.length === 0) return null;
    return interpolate(rangeCurve, rangeStat);
  }, [rangeCurve, rangeStat]);

  const hasFalloffData = hipFalloffStart !== null && critDmg > 0;

  const adsFalloffStart = hasFalloffData ? hipFalloffStart! * adsMultiplier(zoomStat) : 0;
  const maxDist = hasFalloffData ? adsFalloffStart * 2.0 : 100;

  // ── TTK breakpoint curve ──────────────────────────────────────────────
  const ttkBreakpoints = useMemo(() => {
    if (!hasFalloffData) return [];
    return calculateTTKCurve(
      mode, activeWeapon, multiplier, PVP_GUARDIAN_HP, enemyHealth,
      hipFalloffStart!, maxDist, FALLOFF_FLOOR,
    );
  }, [mode, activeWeapon, multiplier, hipFalloffStart, maxDist, enemyHealth, hasFalloffData]);

  // ── Damage falloff curves ─────────────────────────────────────────────
  function buildDamageCurve(falloffStart: number, maxD: number, critVal: number, bodyVal: number) {
    const pts: Array<{ dist: number; crit: number; body: number }> = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxD;
      let frac: number;
      if (dist <= falloffStart) frac = 1.0;
      else {
        const t = Math.min(1, (dist - falloffStart) / (maxD - falloffStart));
        frac = 1.0 - (1.0 - FALLOFF_FLOOR) * t;
      }
      pts.push({ dist, crit: critVal * frac, body: bodyVal * frac });
    }
    return pts;
  }

  const hipCurve = hasFalloffData ? buildDamageCurve(hipFalloffStart!, maxDist, critDmg, bodyDmg) : [];
  const adsCurve = hasFalloffData ? buildDamageCurve(adsFalloffStart, maxDist, critDmg, bodyDmg) : [];

  const yMin = 0;
  const yMax = critDmg > 0 ? critDmg * 1.05 : 1;

  function curveToPoints(pts: typeof hipCurve, key: 'crit' | 'body'): [number, number][] {
    return pts.map((p) => toSvg(p.dist / maxDist, p[key], yMin, yMax));
  }

  const fillPoints = adsCurve.length > 0 ? [
    ...adsCurve.map((p) => toSvg(p.dist / maxDist, p.crit, yMin, yMax)),
    toSvg(1, 0, yMin, yMax),
    toSvg(0, 0, yMin, yMax),
  ] : [];

  const hipCritPoints = hipCurve.length > 0 ? curveToPoints(hipCurve, 'crit') : [];
  const hipBodyPoints = hipCurve.length > 0 ? curveToPoints(hipCurve, 'body') : [];
  const adsCritPoints = adsCurve.length > 0 ? curveToPoints(adsCurve, 'crit') : [];
  const adsBodyPoints = adsCurve.length > 0 ? curveToPoints(adsCurve, 'body') : [];

  const hipCritPath = useAnimatedPath(hipCritPoints);
  const hipBodyPath = useAnimatedPath(hipBodyPoints);
  const adsCritPath = useAnimatedPath(adsCritPoints);
  const adsBodyPath = useAnimatedPath(adsBodyPoints);
  const adsFillPath = useAnimatedPath(fillPoints);

  const hipFalloffX  = hasFalloffData ? (hipFalloffStart! / maxDist) * IW : 0;
  const adsFalloffX  = hasFalloffData ? (adsFalloffStart / maxDist) * IW : 0;
  const animHipFalloffX = useAnimatedValue(hipFalloffX);
  const animAdsFalloffX = useAnimatedValue(adsFalloffX);

  // Animate axis scales so labels smoothly count up/down alongside the curves
  const animMaxDist = useAnimatedValue(maxDist);
  const animYMax    = useAnimatedValue(yMax);

  // TTK sparkline
  const ttkSparklinePoints = useMemo(() => {
    if (ttkBreakpoints.length === 0) return [];
    const shotsValues = ttkBreakpoints.map((bp) => bp.shotsToKill);
    const sMin = Math.min(...shotsValues);
    const sMax = Math.max(...shotsValues);
    const range = sMax - sMin || 1;
    const padMin = sMin - range * 0.15;
    const padMax = sMax + range * 0.15;
    return ttkBreakpoints.map((bp) =>
      toSvg(bp.distance / maxDist, bp.shotsToKill, padMin, padMax)
    );
  }, [ttkBreakpoints, maxDist]);

  const ttkSparklinePath = useAnimatedPath(ttkSparklinePoints);
  const ttkSparklineFill = useAnimatedPath(ttkSparklinePoints.length > 0 ? [
    ...ttkSparklinePoints,
    toSvg(1, 0, 0, 1),
    toSvg(0, 0, 0, 1),
  ] : []);

  // Hover readout for damage falloff
  let hoverDist: number | null = null;
  let hoverHipCrit: number | null = null;
  let hoverAdsCrit: number | null = null;
  let hoverTtkBp: TTKBreakpoint | null = null;
  if (hoverX !== null && hasFalloffData) {
    hoverDist = (hoverX / IW) * maxDist;
    const hipFrac = hoverDist <= hipFalloffStart! ? 1 : Math.max(FALLOFF_FLOOR, 1 - (1 - FALLOFF_FLOOR) * Math.min(1, (hoverDist - hipFalloffStart!) / (maxDist - hipFalloffStart!)));
    const adsFrac = hoverDist <= adsFalloffStart ? 1 : Math.max(FALLOFF_FLOOR, 1 - (1 - FALLOFF_FLOOR) * Math.min(1, (hoverDist - adsFalloffStart) / (maxDist - adsFalloffStart)));
    hoverHipCrit = critDmg * hipFrac;
    hoverAdsCrit = critDmg * adsFrac;
    hoverTtkBp = ttkBreakpoints.reduce<TTKBreakpoint | null>((closest, bp) => {
      if (!closest || Math.abs(bp.distance - hoverDist!) < Math.abs(closest.distance - hoverDist!)) return bp;
      return closest;
    }, null);
  }

  // TTK sparkline Y ticks
  const ttkShotsValues = ttkBreakpoints.map((bp) => bp.shotsToKill);
  const ttkSMin = ttkShotsValues.length > 0 ? Math.min(...ttkShotsValues) : 0;
  const ttkSMax = ttkShotsValues.length > 0 ? Math.max(...ttkShotsValues) : 0;
  const ttkRange = ttkSMax - ttkSMin || 1;
  const ttkPadMin = ttkSMin - ttkRange * 0.15;
  const ttkPadMax = ttkSMax + ttkRange * 0.15;
  const ttkYTicks = Array.from({ length: ttkSMax - ttkSMin + 1 }, (_, i) => ttkSMin + i);

  // X/Y ticks use animated scale values so labels sweep smoothly with the curves
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({ frac: f, m: (f * animMaxDist).toFixed(0) }));
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => Math.round(animYMax * f));

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10 space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">TTK & Falloff</h2>
        {multiplier > 1 && (
          <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-1 rounded">
            ×{multiplier.toFixed(2)} dmg
          </span>
        )}
      </div>

      {/* ── Mode controls ──────────────────────────────────────── */}
      {mode === 'pvp' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Guardian HP</span>
            <span className="font-mono font-bold text-white">{PVP_GUARDIAN_HP}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Weapons Stat</span>
              <span className={[
                'text-xs font-bold tabular-nums',
                weaponsStat > 100 ? 'text-amber-400' : 'text-slate-500',
              ].join(' ')}>
                {weaponsStat}
                {pvpWeaponsBonus > 0
                  ? ` · +${(pvpWeaponsBonus * 100).toFixed(1)}% vs Guardians`
                  : ' · no PvP bonus'}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={200}
              value={Math.max(100, weaponsStat)}
              onChange={(e) => setWeaponsStat(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 rounded-full cursor-pointer"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[100, 120, 140, 160, 180, 200].map((v) => (
                <button
                  key={v}
                  onClick={() => setWeaponsStat(v)}
                  className={[
                    'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors',
                    weaponsStat === v
                      ? v > 100
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-white/10 border-white/20 text-slate-300'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'pve' && (
        <div>
          <label className="text-sm text-slate-400 block mb-1">Enemy Type</label>
          <select
            value={enemyTier}
            onChange={(e) => setEnemyTier(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            {Object.entries(PVE_HEALTH_TIERS).map(([tier, hp]) => (
              <option key={tier} value={tier}>{tier} ({hp} HP)</option>
            ))}
          </select>
        </div>
      )}

      {/* ── TTK numbers ────────────────────────────────────────── */}
      {ttkResult ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
              <span className="text-sm text-slate-400 mb-1">TTK</span>
              <span className={
                'text-3xl font-mono font-bold ' + (multiplier > 1 ? 'text-amber-400' : 'text-white')
              }>
                {`${ttkResult.ttk.toFixed(2)}s`}
              </span>
            </div>
            <div className="bg-black/40 p-4 rounded-lg border border-white/10 flex flex-col items-center">
              <span className="text-sm text-slate-400 mb-1">Shots</span>
              <span className="text-3xl font-mono font-bold text-white">{ttkResult.shotsToKill}</span>
              <span className="text-xs text-slate-500 mt-2">to kill</span>
            </div>
          </div>

          <div className="bg-black/30 px-4 py-2.5 rounded-lg border border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 shrink-0">Optimal pattern</span>
            <div className="flex items-center gap-2 font-mono font-semibold text-sm">
              {ttkResult.crits > 0 && (
                <span className="text-amber-400">{ttkResult.crits}× Head</span>
              )}
              {ttkResult.crits > 0 && ttkResult.bodies > 0 && (
                <span className="text-slate-600">+</span>
              )}
              {ttkResult.bodies > 0 && (
                <span className="text-slate-300">{ttkResult.bodies}× Body</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 p-4 rounded-lg border border-white/10 text-center text-slate-500 text-sm">
          TTK calculation not available for this weapon type.
        </div>
      )}

      {/* ── TTK Breakpoint Sparkline ───────────────────────────── */}
      {ttkBreakpoints.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-300">Shots vs Distance</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">
                {ttkSMin === ttkSMax
                  ? `No breakpoints — always ${ttkSMin} shots`
                  : `${ttkSMin} → ${ttkSMax} shots across range`}
              </span>
              <button
                onClick={() => setExpanded('ttk')}
                title="Expand chart"
                className="text-slate-500 hover:text-slate-200 transition-colors text-sm leading-none px-1"
              >⛶</button>
            </div>
          </div>
          <div className="relative select-none">
            <svg
              width="100%"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ display: 'block' }}
              className="overflow-visible"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * W - PL;
                setHoverX(Math.max(0, Math.min(IW, svgX)));
              }}
              onMouseLeave={() => setHoverX(null)}
            >
              <g transform={`translate(${PL},${PT})`}>
                {/* Grid */}
                {ttkYTicks.map((v) => {
                  const [, cy] = toSvg(0, v, ttkPadMin, ttkPadMax);
                  return (
                    <line key={v} x1={0} y1={cy} x2={IW} y2={cy}
                      stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  );
                })}

                {/* Fill */}
                {ttkSparklineFill && (
                  <path d={ttkSparklineFill} fill="rgba(168,85,247,0.08)" />
                )}

                {/* Line */}
                {ttkSparklinePath && (
                  <path d={ttkSparklinePath} fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Breakpoint dots — where shot count changes */}
                {ttkBreakpoints.map((bp, i) => {
                  if (i === 0) return null;
                  const prev = ttkBreakpoints[i - 1];
                  if (bp.shotsToKill === prev.shotsToKill) return null;
                  const [cx, cy] = toSvg(bp.distance / maxDist, bp.shotsToKill, ttkPadMin, ttkPadMax);
                  return (
                    <circle key={i} cx={cx} cy={cy} r={3} fill="#a855f7" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                  );
                })}

                {/* Hover crosshair */}
                {hoverX !== null && hoverDist !== null && (
                  <>
                    <line x1={hoverX} y1={0} x2={hoverX} y2={IH}
                      stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                    {hoverTtkBp && (() => {
                      const [cx, cy] = toSvg(hoverTtkBp.distance / maxDist, hoverTtkBp.shotsToKill, ttkPadMin, ttkPadMax);
                      return (
                        <>
                          <circle cx={cx} cy={cy} r={4} fill="#a855f7" stroke="white" strokeWidth={1.5} />
                          <rect x={Math.min(hoverX + 4, IW - 70)} y={4} width={68} height={26} rx={3} fill="rgba(0,0,0,0.85)" />
                          <text x={Math.min(hoverX + 8, IW - 66)} y={14} fill="white" fontSize={8} fontFamily="monospace">
                            {hoverDist.toFixed(1)}m
                          </text>
                          <text x={Math.min(hoverX + 8, IW - 66)} y={24} fill="#a855f7" fontSize={8} fontFamily="monospace">
                            {hoverTtkBp.shotsToKill} shots · {hoverTtkBp.ttk.toFixed(2)}s
                          </text>
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Y labels */}
                {ttkYTicks.map((v) => {
                  const [, cy] = toSvg(0, v, ttkPadMin, ttkPadMax);
                  return (
                    <text key={v} x={-4} y={cy + 3}
                      fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="end" fontFamily="monospace">
                      {v}
                    </text>
                  );
                })}

                {/* X labels */}
                {xTicks.map(({ frac, m }) => (
                  <text key={frac} x={frac * IW} y={IH + 16}
                    fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="middle" fontFamily="monospace">
                    {m}m
                  </text>
                ))}

                {/* Axes */}
                <line x1={0} y1={0} x2={0} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                <line x1={0} y1={IH} x2={IW} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* ── Damage Falloff Chart ───────────────────────────────── */}
      {hasFalloffData ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-300">Damage Falloff</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpanded('falloff')}
                title="Expand chart"
                className="text-slate-500 hover:text-slate-200 transition-colors text-sm leading-none px-1"
              >⛶</button>
              <button
                onClick={() => setShowHip((v) => !v)}
                className={[
                  'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors',
                  showHip ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-white/5 text-slate-600 border-white/10',
                ].join(' ')}
              >
                Hip
              </button>
              <button
                onClick={() => setShowAds((v) => !v)}
                className={[
                  'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors',
                  showAds ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-white/5 text-slate-600 border-white/10',
                ].join(' ')}
              >
                ADS
              </button>
            </div>
          </div>

          <div className="flex gap-4 text-xs mb-3">
            <span className="text-slate-500">Range <span className="text-white font-mono">{rangeStat}</span></span>
            <span className="text-slate-500">Zoom <span className="text-white font-mono">{zoomStat}</span></span>
            <span className="text-cyan-400/70">Hip <span className="text-white font-mono">{hipFalloffStart!.toFixed(1)}m</span></span>
            <span className="text-amber-400/70">ADS <span className="text-white font-mono">{adsFalloffStart.toFixed(1)}m</span></span>
          </div>

          <div className="relative select-none">
            <svg
              width="100%"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ display: 'block' }}
              className="overflow-visible"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * W - PL;
                setHoverX(Math.max(0, Math.min(IW, svgX)));
              }}
              onMouseLeave={() => setHoverX(null)}
            >
              <g transform={`translate(${PL},${PT})`}>
                {/* Grid */}
                {yTicks.map((v) => (
                  <line key={v}
                    x1={0} y1={toSvg(0, v, yMin, yMax)[1]}
                    x2={IW} y2={toSvg(0, v, yMin, yMax)[1]}
                    stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                ))}

                {/* ADS filled area */}
                {showAds && adsFillPath && (
                  <path d={adsFillPath} fill="rgba(251,191,36,0.05)" />
                )}

                {/* Falloff markers */}
                {showHip && (
                  <line x1={animHipFalloffX} y1={0} x2={animHipFalloffX} y2={IH}
                    stroke="rgba(34,211,238,0.3)" strokeWidth={1} strokeDasharray="3 3" />
                )}
                {showAds && (
                  <line x1={animAdsFalloffX} y1={0} x2={animAdsFalloffX} y2={IH}
                    stroke="rgba(251,191,36,0.3)" strokeWidth={1} strokeDasharray="3 3" />
                )}

                {/* Hip curves */}
                {showHip && hipCritPath && <>
                  <path d={hipBodyPath} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth={1.5} strokeDasharray="4 2" />
                  <path d={hipCritPath} fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth={2} strokeLinecap="round" />
                </>}

                {/* ADS curves */}
                {showAds && adsCritPath && <>
                  <path d={adsBodyPath} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth={1.5} strokeDasharray="4 2" />
                  <path d={adsCritPath} fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth={2} strokeLinecap="round" />
                </>}

                {/* Hover crosshair */}
                {hoverX !== null && hoverDist !== null && (
                  <>
                    <line x1={hoverX} y1={0} x2={hoverX} y2={IH}
                      stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                    {showHip && hoverHipCrit !== null && (() => {
                      const [cx, cy] = toSvg(hoverX / IW, hoverHipCrit, yMin, yMax);
                      return <circle cx={cx} cy={cy} r={3} fill="#22d3ee" />;
                    })()}
                    {showAds && hoverAdsCrit !== null && (() => {
                      const [cx, cy] = toSvg(hoverX / IW, hoverAdsCrit, yMin, yMax);
                      return <circle cx={cx} cy={cy} r={3} fill="#fbbf24" />;
                    })()}
                    {(() => {
                      const tx = Math.min(hoverX + 4, IW - 80);
                      const ty = 4;
                      const h = showHip && showAds ? 30 : 18;
                      return (
                        <>
                          <rect x={tx} y={ty} width={78} height={h} rx={3} fill="rgba(0,0,0,0.85)" />
                          <text x={tx + 4} y={ty + 10} fill="white" fontSize={8} fontFamily="monospace">
                            {hoverDist.toFixed(1)}m
                          </text>
                          {showHip && hoverHipCrit !== null && (
                            <text x={tx + 4} y={ty + 20} fill="#22d3ee" fontSize={8} fontFamily="monospace">
                              Hip: {hoverHipCrit.toFixed(1)}
                            </text>
                          )}
                          {showAds && hoverAdsCrit !== null && (
                            <text x={tx + 4} y={ty + (showHip ? 30 : 20)} fill="#fbbf24" fontSize={8} fontFamily="monospace">
                              ADS: {hoverAdsCrit.toFixed(1)}
                            </text>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Y labels */}
                {yTicks.filter((v) => v > 0).map((v) => {
                  const [, cy] = toSvg(0, v, yMin, yMax);
                  return (
                    <text key={v} x={-4} y={cy + 3}
                      fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="end" fontFamily="monospace">
                      {v}
                    </text>
                  );
                })}

                {/* X labels */}
                {xTicks.map(({ frac, m }) => (
                  <text key={frac} x={frac * IW} y={IH + 16}
                    fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="middle" fontFamily="monospace">
                    {m}m
                  </text>
                ))}

                {/* Axes */}
                <line x1={0} y1={0} x2={0} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                <line x1={0} y1={IH} x2={IW} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              </g>
            </svg>
          </div>

          <div className="flex gap-4 mt-2 text-[10px] text-slate-500 flex-wrap">
            <span><span className="text-cyan-400 font-bold">─</span> Hip crit</span>
            <span><span className="text-cyan-400/40 font-bold">- -</span> Hip body</span>
            <span><span className="text-amber-400 font-bold">─</span> ADS crit</span>
            <span><span className="text-amber-400/40 font-bold">- -</span> ADS body</span>
            <span className="text-slate-600">Mode: {mode.toUpperCase()} · Hover to inspect</span>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 p-4 rounded-lg border border-white/10 text-center text-slate-500 text-sm">
          Falloff data not available for this weapon archetype.
        </div>
      )}

      {/* ── Fullscreen overlay ─────────────────────────────── */}
      {expanded !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) closeExpanded(); }}
        >
          {/* Overlay header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-lg font-bold text-white">
              {expanded === 'ttk' ? 'Shots vs Distance' : 'Damage Falloff'}
            </h2>
            <button
              onClick={closeExpanded}
              className="text-slate-400 hover:text-white text-2xl leading-none px-2 transition-colors"
              title="Close (Esc)"
            >✕</button>
          </div>

          {/* Expanded chart */}
          <div className="flex-1 overflow-auto p-6">
            {expanded === 'ttk' && ttkBreakpoints.length > 0 && (
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block', maxHeight: 'calc(100vh - 120px)' }}
                className="overflow-visible"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svgX = ((e.clientX - rect.left) / rect.width) * W - PL;
                  setHoverX(Math.max(0, Math.min(IW, svgX)));
                }}
                onMouseLeave={() => setHoverX(null)}
              >
                <g transform={`translate(${PL},${PT})`}>
                  {ttkYTicks.map((v) => {
                    const [, cy] = toSvg(0, v, ttkPadMin, ttkPadMax);
                    return <line key={v} x1={0} y1={cy} x2={IW} y2={cy} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
                  })}
                  {ttkSparklineFill && <path d={ttkSparklineFill} fill="rgba(168,85,247,0.08)" />}
                  {ttkSparklinePath && <path d={ttkSparklinePath} fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
                  {ttkBreakpoints.map((bp, i) => {
                    if (i === 0) return null;
                    const prev = ttkBreakpoints[i - 1];
                    if (bp.shotsToKill === prev.shotsToKill) return null;
                    const [cx, cy] = toSvg(bp.distance / maxDist, bp.shotsToKill, ttkPadMin, ttkPadMax);
                    return <circle key={i} cx={cx} cy={cy} r={4} fill="#a855f7" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />;
                  })}
                  {hoverX !== null && hoverDist !== null && hoverTtkBp && (() => {
                    const [cx, cy] = toSvg(hoverTtkBp.distance / maxDist, hoverTtkBp.shotsToKill, ttkPadMin, ttkPadMax);
                    return (
                      <>
                        <line x1={hoverX} y1={0} x2={hoverX} y2={IH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                        <circle cx={cx} cy={cy} r={5} fill="#a855f7" stroke="white" strokeWidth={1.5} />
                        <rect x={Math.min(hoverX + 4, IW - 80)} y={4} width={78} height={28} rx={3} fill="rgba(0,0,0,0.85)" />
                        <text x={Math.min(hoverX + 8, IW - 76)} y={15} fill="white" fontSize={9} fontFamily="monospace">{hoverDist.toFixed(1)}m</text>
                        <text x={Math.min(hoverX + 8, IW - 76)} y={26} fill="#a855f7" fontSize={9} fontFamily="monospace">{hoverTtkBp.shotsToKill} shots · {hoverTtkBp.ttk.toFixed(2)}s</text>
                      </>
                    );
                  })()}
                  {ttkYTicks.map((v) => {
                    const [, cy] = toSvg(0, v, ttkPadMin, ttkPadMax);
                    return <text key={v} x={-4} y={cy + 3} fill="rgba(148,163,184,0.6)" fontSize={9} textAnchor="end" fontFamily="monospace">{v}</text>;
                  })}
                  {xTicks.map(({ frac, m }) => (
                    <text key={frac} x={frac * IW} y={IH + 18} fill="rgba(148,163,184,0.6)" fontSize={9} textAnchor="middle" fontFamily="monospace">{m}m</text>
                  ))}
                  <line x1={0} y1={0} x2={0} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                  <line x1={0} y1={IH} x2={IW} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                </g>
              </svg>
            )}

            {expanded === 'falloff' && hasFalloffData && (
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block', maxHeight: 'calc(100vh - 120px)' }}
                className="overflow-visible"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svgX = ((e.clientX - rect.left) / rect.width) * W - PL;
                  setHoverX(Math.max(0, Math.min(IW, svgX)));
                }}
                onMouseLeave={() => setHoverX(null)}
              >
                <g transform={`translate(${PL},${PT})`}>
                  {yTicks.map((v) => (
                    <line key={v} x1={0} y1={toSvg(0, v, yMin, yMax)[1]} x2={IW} y2={toSvg(0, v, yMin, yMax)[1]} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  ))}
                  {showAds && adsFillPath && <path d={adsFillPath} fill="rgba(251,191,36,0.05)" />}
                  {showHip && <line x1={animHipFalloffX} y1={0} x2={animHipFalloffX} y2={IH} stroke="rgba(34,211,238,0.3)" strokeWidth={1} strokeDasharray="3 3" />}
                  {showAds && <line x1={animAdsFalloffX} y1={0} x2={animAdsFalloffX} y2={IH} stroke="rgba(251,191,36,0.3)" strokeWidth={1} strokeDasharray="3 3" />}
                  {showHip && hipCritPath && <>
                    <path d={hipBodyPath} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth={2} strokeDasharray="4 2" />
                    <path d={hipCritPath} fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth={2.5} strokeLinecap="round" />
                  </>}
                  {showAds && adsCritPath && <>
                    <path d={adsBodyPath} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth={2} strokeDasharray="4 2" />
                    <path d={adsCritPath} fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth={2.5} strokeLinecap="round" />
                  </>}
                  {hoverX !== null && hoverDist !== null && (() => {
                    const tx = Math.min(hoverX + 4, IW - 80);
                    const ty = 4;
                    const h  = showHip && showAds ? 32 : 20;
                    return (
                      <>
                        <line x1={hoverX} y1={0} x2={hoverX} y2={IH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                        {showHip && hoverHipCrit !== null && <circle cx={toSvg(hoverX / IW, hoverHipCrit, yMin, yMax)[0]} cy={toSvg(hoverX / IW, hoverHipCrit, yMin, yMax)[1]} r={4} fill="#22d3ee" />}
                        {showAds && hoverAdsCrit !== null && <circle cx={toSvg(hoverX / IW, hoverAdsCrit, yMin, yMax)[0]} cy={toSvg(hoverX / IW, hoverAdsCrit, yMin, yMax)[1]} r={4} fill="#fbbf24" />}
                        <rect x={tx} y={ty} width={78} height={h} rx={3} fill="rgba(0,0,0,0.85)" />
                        <text x={tx + 4} y={ty + 11} fill="white" fontSize={9} fontFamily="monospace">{hoverDist.toFixed(1)}m</text>
                        {showHip && hoverHipCrit !== null && <text x={tx + 4} y={ty + 22} fill="#22d3ee" fontSize={9} fontFamily="monospace">Hip: {hoverHipCrit.toFixed(1)}</text>}
                        {showAds && hoverAdsCrit !== null && <text x={tx + 4} y={ty + (showHip ? 32 : 22)} fill="#fbbf24" fontSize={9} fontFamily="monospace">ADS: {hoverAdsCrit.toFixed(1)}</text>}
                      </>
                    );
                  })()}
                  {yTicks.filter((v) => v > 0).map((v) => {
                    const [, cy] = toSvg(0, v, yMin, yMax);
                    return <text key={v} x={-4} y={cy + 3} fill="rgba(148,163,184,0.6)" fontSize={9} textAnchor="end" fontFamily="monospace">{v}</text>;
                  })}
                  {xTicks.map(({ frac, m }) => (
                    <text key={frac} x={frac * IW} y={IH + 18} fill="rgba(148,163,184,0.6)" fontSize={9} textAnchor="middle" fontFamily="monospace">{m}m</text>
                  ))}
                  <line x1={0} y1={0} x2={0} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                  <line x1={0} y1={IH} x2={IW} y2={IH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                </g>
              </svg>
            )}
          </div>

          {/* Overlay footer */}
          {expanded === 'falloff' && hasFalloffData && (
            <div className="flex items-center gap-4 px-6 py-3 border-t border-white/10 shrink-0 flex-wrap">
              <button onClick={() => setShowHip((v) => !v)} className={['text-xs font-bold px-2 py-1 rounded border transition-colors', showHip ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-white/5 text-slate-600 border-white/10'].join(' ')}>Hip</button>
              <button onClick={() => setShowAds((v) => !v)} className={['text-xs font-bold px-2 py-1 rounded border transition-colors', showAds ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-white/5 text-slate-600 border-white/10'].join(' ')}>ADS</button>
              <span className="text-xs text-slate-500">Range <span className="text-white font-mono">{rangeStat}</span></span>
              <span className="text-xs text-slate-500">Zoom <span className="text-white font-mono">{zoomStat}</span></span>
              <span className="text-cyan-400/70 text-xs">Hip <span className="text-white font-mono">{hipFalloffStart!.toFixed(1)}m</span></span>
              <span className="text-amber-400/70 text-xs">ADS <span className="text-white font-mono">{adsFalloffStart.toFixed(1)}m</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
