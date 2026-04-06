'use client';

import React, { useMemo, useState } from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { getArchetype } from '../../lib/archetypes';
import { StatCurveNode } from '../../types/weapon';
import { useAnimatedPath } from '../../hooks/useAnimatedPath';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

// ─── Curve interpolation ─────────────────────────

function interpolate(curve: StatCurveNode[], statVal: number): number {
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

// ─── SVG dimensions ──────────────────────────────

const W = 340, H = 140, PL = 46, PB = 26, PR = 14, PT = 14;
const IW = W - PL - PR;
const IH = H - PT - PB;

function toSvg(x: number, y: number, yMin: number, yMax: number): [number, number] {
  return [x * IW, IH - ((y - yMin) / (yMax - yMin)) * IH];
}

function pathStr(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

// ─── ADS range multiplier from zoom stat ─────────
// In D2, ADS extends falloff by approximately 1 + (zoom - 10) * 0.033
function adsMultiplier(zoom: number): number {
  return 1 + Math.max(0, zoom - 10) * 0.033;
}

// Floor damage fraction at max falloff distance.
// Simplified constant — most archetypes floor around 50%, but some (e.g.
// linear fusion rifles, certain exotic frames) differ.  A future improvement
// would read the archetype-specific floor from the manifest if available.
const FALLOFF_FLOOR = 0.5;

export const DamageFalloffGraph: React.FC = () => {
  const { activeWeapon, getCalculatedStats, mode } = useWeaponStore();
  const [hoverX, setHoverX]   = useState<number | null>(null);
  const [showAds, setShowAds]  = useState(true);
  const [showHip, setShowHip]  = useState(true);

  const calcStats = getCalculatedStats();
  const rangeStat = calcStats['Range'] ?? 0;
  const zoomStat  = calcStats['Zoom']  ?? 14;

  const rangeCurve = activeWeapon?.statCurves?.['Range'];
  const archetype  = activeWeapon
    ? getArchetype(activeWeapon.itemSubType, activeWeapon.rpm)
    : null;

  // Pick damage values based on current mode
  const dmg = archetype ? (mode === 'pvp' ? archetype.pvp : archetype.pve) : null;
  const critDmg = dmg?.crit ?? 0;
  const bodyDmg = dmg?.body ?? 0;

  const hipFalloffStart = useMemo(() => {
    if (!rangeCurve || rangeCurve.length === 0) return null;
    return interpolate(rangeCurve, rangeStat);
  }, [rangeCurve, rangeStat]);

  if (!activeWeapon) return null;

  // Show a friendly empty state when archetype data is unavailable rather than vanishing silently
  if (!rangeCurve || hipFalloffStart === null || critDmg === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-2">Damage Falloff</h2>
        <p className="text-sm text-slate-500">
          Falloff data not available for this weapon archetype.
        </p>
      </div>
    );
  }

  const adsFalloffStart = hipFalloffStart * adsMultiplier(zoomStat);
  const maxDist = adsFalloffStart * 2.0;

  // Build a damage-over-distance curve
  function buildCurve(falloffStart: number, maxD: number, critVal: number, bodyVal: number) {
    const pts: Array<{ dist: number; crit: number; body: number }> = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxD;
      let frac: number;
      if (dist <= falloffStart) {
        frac = 1.0;
      } else {
        const t = Math.min(1, (dist - falloffStart) / (maxD - falloffStart));
        frac = 1.0 - (1.0 - FALLOFF_FLOOR) * t;
      }
      pts.push({ dist, crit: critVal * frac, body: bodyVal * frac });
    }
    return pts;
  }

  const hipCurve = buildCurve(hipFalloffStart, maxDist, critDmg, bodyDmg);
  const adsCurve = buildCurve(adsFalloffStart, maxDist, critDmg, bodyDmg);

  // Y axis range: 0 to critDmg
  const yMin = 0;
  const yMax = critDmg * 1.05;

  // Build SVG paths — animated for smooth transitions
  function curveToPoints(pts: typeof hipCurve, key: 'crit' | 'body'): [number, number][] {
    return pts.map((p) => toSvg(p.dist / maxDist, p[key], yMin, yMax));
  }

  const fillPoints = [
    ...adsCurve.map((p) => toSvg(p.dist / maxDist, p.crit, yMin, yMax)),
    toSvg(1, 0, yMin, yMax),
    toSvg(0, 0, yMin, yMax),
  ];

  const hipCritPoints = curveToPoints(hipCurve, 'crit');
  const hipBodyPoints = curveToPoints(hipCurve, 'body');
  const adsCritPoints = curveToPoints(adsCurve, 'crit');
  const adsBodyPoints = curveToPoints(adsCurve, 'body');

  const hipCritPath = useAnimatedPath(hipCritPoints);
  const hipBodyPath = useAnimatedPath(hipBodyPoints);
  const adsCritPath = useAnimatedPath(adsCritPoints);
  const adsBodyPath = useAnimatedPath(adsBodyPoints);
  const adsFillPath = useAnimatedPath(fillPoints);

  // Hover readout
  let hoverDist: number | null = null;
  let hoverHipCrit: number | null = null;
  let hoverAdsCrit: number | null = null;
  if (hoverX !== null) {
    hoverDist = (hoverX / IW) * maxDist;
    const hipFrac = hoverDist <= hipFalloffStart ? 1 : Math.max(FALLOFF_FLOOR, 1 - (1 - FALLOFF_FLOOR) * Math.min(1, (hoverDist - hipFalloffStart) / (maxDist - hipFalloffStart)));
    const adsFrac = hoverDist <= adsFalloffStart ? 1 : Math.max(FALLOFF_FLOOR, 1 - (1 - FALLOFF_FLOOR) * Math.min(1, (hoverDist - adsFalloffStart) / (maxDist - adsFalloffStart)));
    hoverHipCrit = critDmg * hipFrac;
    hoverAdsCrit = critDmg * adsFrac;
  }

  // X ticks
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({ frac: f, m: (f * maxDist).toFixed(0) }));
  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => Math.round(yMax * f));

  const hipFalloffX  = (hipFalloffStart / maxDist) * IW;
  const adsFalloffX  = (adsFalloffStart / maxDist) * IW;

  const animHipFalloffX  = useAnimatedValue(hipFalloffX);
  const animAdsFalloffX  = useAnimatedValue(adsFalloffX);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-white">Damage Falloff</h2>
        <div className="flex items-center gap-2">
          {/* Hip / ADS toggles */}
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

      {/* Stat row */}
      <div className="flex gap-4 text-xs mb-3">
        <span className="text-slate-500">Range <span className="text-white font-mono">{rangeStat}</span></span>
        <span className="text-slate-500">Zoom <span className="text-white font-mono">{zoomStat}</span></span>
        <span className="text-cyan-400/70">Hip <span className="text-white font-mono">{hipFalloffStart.toFixed(1)}m</span></span>
        <span className="text-amber-400/70">ADS <span className="text-white font-mono">{adsFalloffStart.toFixed(1)}m</span></span>
      </div>

      {/* SVG Chart */}
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
                stroke="rgba(255,255,255,0.05)" strokeWidth={1}
              />
            ))}

            {/* ADS filled area */}
            {showAds && (
              <path d={adsFillPath} fill="rgba(251,191,36,0.05)" />
            )}

            {/* Falloff markers */}
            {showHip && (
              <line x1={hipFalloffX} y1={0} x2={hipFalloffX} y2={IH}
                stroke="rgba(34,211,238,0.3)" strokeWidth={1} strokeDasharray="3 3" />
            )}
            {showAds && (
              <line x1={adsFalloffX} y1={0} x2={adsFalloffX} y2={IH}
                stroke="rgba(251,191,36,0.3)" strokeWidth={1} strokeDasharray="3 3" />
            )}

            {/* Hip curves */}
            {showHip && <>
              <path d={hipBodyPath} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth={1.5} strokeDasharray="4 2" />
              <path d={hipCritPath} fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth={2} strokeLinecap="round" />
            </>}

            {/* ADS curves */}
            {showAds && <>
              <path d={adsBodyPath} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth={1.5} strokeDasharray="4 2" />
              <path d={adsCritPath} fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth={2} strokeLinecap="round" />
            </>}

            {/* Hover crosshair */}
            {hoverX !== null && hoverDist !== null && (
              <>
                <line x1={hoverX} y1={0} x2={hoverX} y2={IH}
                  stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

                {/* Hip readout dot */}
                {showHip && hoverHipCrit !== null && (() => {
                  const [cx, cy] = toSvg(hoverX / IW, hoverHipCrit, yMin, yMax);
                  return <circle cx={cx} cy={cy} r={3} fill="#22d3ee" />;
                })()}

                {/* ADS readout dot */}
                {showAds && hoverAdsCrit !== null && (() => {
                  const [cx, cy] = toSvg(hoverX / IW, hoverAdsCrit, yMin, yMax);
                  return <circle cx={cx} cy={cy} r={3} fill="#fbbf24" />;
                })()}

                {/* Tooltip */}
                {(() => {
                  const tx = Math.min(hoverX + 4, IW - 80);
                  const ty = 4;
                  return (
                    <>
                      <rect x={tx} y={ty} width={78} height={showHip && showAds ? 30 : 18} rx={3} fill="rgba(0,0,0,0.85)" />
                      <text x={tx + 4} y={ty + 10} fill="white" fontSize={8} fontFamily="monospace">
                        {hoverDist!.toFixed(1)}m
                      </text>
                      {showHip && hoverHipCrit !== null && (
                        <text x={tx + 4} y={ty + 20} fill="#22d3ee" fontSize={8} fontFamily="monospace">
                          Hip: {hoverHipCrit.toFixed(1)} crit
                        </text>
                      )}
                      {showAds && hoverAdsCrit !== null && (
                        <text x={tx + 4} y={ty + (showHip ? 30 : 20)} fill="#fbbf24" fontSize={8} fontFamily="monospace">
                          ADS: {hoverAdsCrit.toFixed(1)} crit
                        </text>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Y axis labels */}
            {yTicks.filter((v) => v > 0).map((v) => {
              const [, cy] = toSvg(0, v, yMin, yMax);
              return (
                <text key={v} x={-4} y={cy + 3}
                  fill="rgba(148,163,184,0.6)" fontSize={8} textAnchor="end" fontFamily="monospace">
                  {v}
                </text>
              );
            })}

            {/* X axis labels */}
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

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-[10px] text-slate-500 flex-wrap">
        <span><span className="text-cyan-400 font-bold">─</span> Hip crit</span>
        <span><span className="text-cyan-400/40 font-bold">- -</span> Hip body</span>
        <span><span className="text-amber-400 font-bold">─</span> ADS crit</span>
        <span><span className="text-amber-400/40 font-bold">- -</span> ADS body</span>
        <span className="text-slate-600">Mode: {mode.toUpperCase()} · Hover to inspect</span>
      </div>
    </div>
  );
};
