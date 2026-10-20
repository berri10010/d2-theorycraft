'use client';

import React from 'react';
import type { TTKBreakpoint } from '../../lib/damageMath';
import { W, H, PL, PT, IW, IH, toSvg, plotXFromMouse } from '../../lib/chartMath';

/**
 * The two SVG charts of the TTK panel. Each renders both inline (compact) and in the
 * fullscreen overlay (`big`: heavier strokes and larger labels). All state is owned by the
 * panel; these are pure renderers.
 */

export interface AxisTick { frac: number; m: string }

const AXIS = 'rgba(255,255,255,0.12)';
const GRID = 'rgba(255,255,255,0.05)';
const LABEL = 'rgba(148,163,184,0.6)';

interface SvgFrameProps {
  big: boolean;
  onHover: (x: number | null) => void;
  children: React.ReactNode;
}

function SvgFrame({ big, onHover, children }: SvgFrameProps) {
  return (
    <svg
      width="100%"
      height={big ? '100%' : undefined}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={big ? { display: 'block', maxHeight: 'calc(100vh - 120px)' } : { display: 'block' }}
      className="overflow-visible"
      onMouseMove={(e) => onHover(plotXFromMouse(e.clientX, e.currentTarget.getBoundingClientRect()))}
      onMouseLeave={() => onHover(null)}
    >
      <g transform={`translate(${PL},${PT})`}>{children}</g>
    </svg>
  );
}

function XLabels({ ticks, big }: { ticks: AxisTick[]; big: boolean }) {
  return (
    <>
      {ticks.map(({ frac, m }) => (
        <text key={frac} x={frac * IW} y={IH + (big ? 18 : 16)} fill={LABEL} fontSize={big ? 9 : 8} textAnchor="middle" fontFamily="monospace">
          {m}m
        </text>
      ))}
    </>
  );
}

function Axes() {
  return (
    <>
      <line x1={0} y1={0} x2={0} y2={IH} stroke={AXIS} strokeWidth={1} />
      <line x1={0} y1={IH} x2={IW} y2={IH} stroke={AXIS} strokeWidth={1} />
    </>
  );
}

// ── Shots vs distance ─────────────────────────────────────────────────────────

interface ShotsChartProps {
  big?: boolean;
  breakpoints: TTKBreakpoint[];
  maxDist: number;
  /** Integer shot counts shown on the y axis. */
  yTicks: number[];
  padMin: number;
  padMax: number;
  linePath: string;
  fillPath: string;
  xTicks: AxisTick[];
  hoverX: number | null;
  hoverDist: number | null;
  hoverBp: TTKBreakpoint | null;
  onHover: (x: number | null) => void;
}

export function ShotsChart({
  big = false, breakpoints, maxDist, yTicks, padMin, padMax, linePath, fillPath,
  xTicks, hoverX, hoverDist, hoverBp, onHover,
}: ShotsChartProps) {
  const labelSize = big ? 9 : 8;
  const tw = big ? 78 : 68;

  return (
    <SvgFrame big={big} onHover={onHover}>
      {yTicks.map((v) => {
        const [, cy] = toSvg(0, v, padMin, padMax);
        return <line key={v} x1={0} y1={cy} x2={IW} y2={cy} stroke={GRID} strokeWidth={1} />;
      })}

      {fillPath && <path d={fillPath} fill="rgba(168,85,247,0.08)" />}
      {linePath && (
        <path d={linePath} fill="none" stroke="rgba(168,85,247,0.8)" strokeWidth={big ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Breakpoint dots — where the shot count changes */}
      {breakpoints.map((bp, i) => {
        if (i === 0 || bp.shotsToKill === breakpoints[i - 1].shotsToKill) return null;
        const [cx, cy] = toSvg(bp.distance / maxDist, bp.shotsToKill, padMin, padMax);
        return <circle key={i} cx={cx} cy={cy} r={big ? 4 : 3} fill="#a855f7" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />;
      })}

      {hoverX !== null && hoverDist !== null && (
        <>
          <line x1={hoverX} y1={0} x2={hoverX} y2={IH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          {hoverBp && (() => {
            const [cx, cy] = toSvg(hoverBp.distance / maxDist, hoverBp.shotsToKill, padMin, padMax);
            return (
              <>
                <circle cx={cx} cy={cy} r={big ? 5 : 4} fill="#a855f7" stroke="white" strokeWidth={1.5} />
                <rect x={Math.min(hoverX + 4, IW - (tw + 2))} y={4} width={tw} height={big ? 28 : 26} rx={3} fill="rgba(0,0,0,0.85)" />
                <text x={Math.min(hoverX + 8, IW - (tw - 2))} y={big ? 15 : 14} fill="white" fontSize={labelSize} fontFamily="monospace">
                  {hoverDist.toFixed(1)}m
                </text>
                <text x={Math.min(hoverX + 8, IW - (tw - 2))} y={big ? 26 : 24} fill="#a855f7" fontSize={labelSize} fontFamily="monospace">
                  {hoverBp.shotsToKill} shots · {hoverBp.ttk.toFixed(2)}s
                </text>
              </>
            );
          })()}
        </>
      )}

      {yTicks.map((v) => {
        const [, cy] = toSvg(0, v, padMin, padMax);
        return <text key={v} x={-4} y={cy + 3} fill={LABEL} fontSize={labelSize} textAnchor="end" fontFamily="monospace">{v}</text>;
      })}
      <XLabels ticks={xTicks} big={big} />
      <Axes />
    </SvgFrame>
  );
}

// ── Damage falloff ────────────────────────────────────────────────────────────

interface FalloffChartProps {
  big?: boolean;
  yTicks: number[];
  yMin: number;
  yMax: number;
  xTicks: AxisTick[];
  showHip: boolean;
  showAds: boolean;
  adsFillPath: string;
  hipBodyPath: string;
  hipCritPath: string;
  adsBodyPath: string;
  adsCritPath: string;
  hipFalloffX: number;
  adsFalloffX: number;
  hoverX: number | null;
  hoverDist: number | null;
  hoverHipCrit: number | null;
  hoverAdsCrit: number | null;
  onHover: (x: number | null) => void;
}

export function FalloffChart({
  big = false, yTicks, yMin, yMax, xTicks, showHip, showAds,
  adsFillPath, hipBodyPath, hipCritPath, adsBodyPath, adsCritPath,
  hipFalloffX, adsFalloffX, hoverX, hoverDist, hoverHipCrit, hoverAdsCrit, onHover,
}: FalloffChartProps) {
  const labelSize = big ? 9 : 8;
  const critW = big ? 2.5 : 2;
  const bodyW = big ? 2 : 1.5;
  const dot = big ? 4 : 3;

  return (
    <SvgFrame big={big} onHover={onHover}>
      {yTicks.map((v) => {
        const y = toSvg(0, v, yMin, yMax)[1];
        return <line key={v} x1={0} y1={y} x2={IW} y2={y} stroke={GRID} strokeWidth={1} />;
      })}

      {showAds && adsFillPath && <path d={adsFillPath} fill="rgba(251,191,36,0.05)" />}

      {showHip && <line x1={hipFalloffX} y1={0} x2={hipFalloffX} y2={IH} stroke="rgba(34,211,238,0.3)" strokeWidth={1} strokeDasharray="3 3" />}
      {showAds && <line x1={adsFalloffX} y1={0} x2={adsFalloffX} y2={IH} stroke="rgba(251,191,36,0.3)" strokeWidth={1} strokeDasharray="3 3" />}

      {showHip && hipCritPath && (
        <>
          <path d={hipBodyPath} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth={bodyW} strokeDasharray="4 2" />
          <path d={hipCritPath} fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth={critW} strokeLinecap="round" />
        </>
      )}
      {showAds && adsCritPath && (
        <>
          <path d={adsBodyPath} fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth={bodyW} strokeDasharray="4 2" />
          <path d={adsCritPath} fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth={critW} strokeLinecap="round" />
        </>
      )}

      {hoverX !== null && hoverDist !== null && (() => {
        const tx = Math.min(hoverX + 4, IW - 80);
        const ty = 4;
        const both = showHip && showAds;
        const h = (both ? 30 : 18) + (big ? 2 : 0);
        const rows = big ? [11, 22, 32] : [10, 20, 30];
        return (
          <>
            <line x1={hoverX} y1={0} x2={hoverX} y2={IH} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
            {showHip && hoverHipCrit !== null && (() => {
              const [cx, cy] = toSvg(hoverX / IW, hoverHipCrit, yMin, yMax);
              return <circle cx={cx} cy={cy} r={dot} fill="#22d3ee" />;
            })()}
            {showAds && hoverAdsCrit !== null && (() => {
              const [cx, cy] = toSvg(hoverX / IW, hoverAdsCrit, yMin, yMax);
              return <circle cx={cx} cy={cy} r={dot} fill="#fbbf24" />;
            })()}
            <rect x={tx} y={ty} width={78} height={h} rx={3} fill="rgba(0,0,0,0.85)" />
            <text x={tx + 4} y={ty + rows[0]} fill="white" fontSize={labelSize} fontFamily="monospace">{hoverDist.toFixed(1)}m</text>
            {showHip && hoverHipCrit !== null && (
              <text x={tx + 4} y={ty + rows[1]} fill="#22d3ee" fontSize={labelSize} fontFamily="monospace">Hip: {hoverHipCrit.toFixed(1)}</text>
            )}
            {showAds && hoverAdsCrit !== null && (
              <text x={tx + 4} y={ty + (showHip ? rows[2] : rows[1])} fill="#fbbf24" fontSize={labelSize} fontFamily="monospace">ADS: {hoverAdsCrit.toFixed(1)}</text>
            )}
          </>
        );
      })()}

      {yTicks.filter((v) => v > 0).map((v) => {
        const [, cy] = toSvg(0, v, yMin, yMax);
        return <text key={v} x={-4} y={cy + 3} fill={LABEL} fontSize={labelSize} textAnchor="end" fontFamily="monospace">{v}</text>;
      })}
      <XLabels ticks={xTicks} big={big} />
      <Axes />
    </SvgFrame>
  );
}
