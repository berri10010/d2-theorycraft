'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { Tooltip } from '../ui/Tooltip';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { interpolateStat, adsMultiplier } from '../../lib/math';
import { getStatsForWeapon } from '../../lib/weaponStatMappings';
import { calcHandlingTimes } from '../../lib/handlingTimes';
import { calcReloadTime } from '../../lib/reloadTimes';
import { calcBowPerfectDraw } from '../../lib/bowDrawWindow';

const STAT_LABEL_MAP: Record<string, string> = {
  'Aim Assistance':          'Aim Assist',
  'Airborne Effectiveness':  'Airborne',
  'Ammo Generation':         'Ammo Gen',
  'Recoil Direction':        'Recoil',
};

const ALWAYS_SHOW_STATS = new Set(['Guard Resistance', 'Guard Endurance']);

const ALL_BAR_STAT_KEYS = [
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
  'Velocity', 'Blast Radius', 'Accuracy',
  'Draw Time', 'Charge Time',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration', 'Ammo Capacity',
  'Cooling Efficiency', 'Heat Generated', 'Vent Speed', 'Persistence',
];

const COMPACT_STAT_KEYS = [
  'Zoom', 'Airborne Effectiveness', 'Ammo Generation', 'Recoil Direction', 'Magazine', 'Inventory Size',
];

// ── Smooth number animation hook ─────────────────────────────────────────────

function useAnimatedValue(target: number): number {
  const [val, setVal] = useState(target);
  const rafRef  = useRef<number | null>(null);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    const startTime = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t    = Math.min((now - startTime) / 250, 1);
      const ease = 1 - (1 - t) ** 3; // cubic ease-out
      setVal(Math.round(from + (target - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return val;
}

// ── Recoil chart ──────────────────────────────────────────────────────────────

function RecoilChart({ value }: { value: number }) {
  const W = 56, H = 28;
  const cx = W / 2;
  const cy = H;
  const R = 26;

  const centerAngle = 90 - Math.sin((value + 5) * 2 * Math.PI / 20) * (100 - value);
  const arcWidth    = ((100 - value) / 100) * 180;

  const startAngle = centerAngle - arcWidth / 2;
  const endAngle   = centerAngle + arcWidth / 2;

  const toPoint = (deg: number) => ({
    x: cx + R * Math.cos((deg * Math.PI) / 180),
    y: cy - R * Math.sin((deg * Math.PI) / 180),
  });

  const p1 = toPoint(startAngle);
  const p2 = toPoint(endAngle);
  const f  = (n: number) => n.toFixed(2);

  const largeArc   = arcWidth > 180 ? 1 : 0;
  const bgPath     = `M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${cx - R} ${cy} Z`;
  const sectorPath = `M ${cx} ${cy} L ${f(p1.x)} ${f(p1.y)} A ${R} ${R} 0 ${largeArc} 0 ${f(p2.x)} ${f(p2.y)} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="hidden" className="shrink-0">
      <path d={bgPath}     fill="#323232" />
      <path d={sectorPath} fill="#FFFFFF" />
      <line x1={cx} y1={cy} x2={f(p1.x)} y2={f(p1.y)} stroke="#FFFFFF" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={f(p2.x)} y2={f(p2.y)} stroke="#FFFFFF" strokeWidth={1} />
    </svg>
  );
}

// ── Animated stat bar row ─────────────────────────────────────────────────────

function StatBarRow({ label, base, current }: {
  label: string;
  base: number;
  current: number;
}) {
  const animVal = useAnimatedValue(current);
  const diff    = current - base;

  return (
    <div className="flex items-center text-sm">
      <div className="w-24 md:w-28 font-medium text-slate-300 shrink-0">{label}</div>

      <div className="flex-1 h-2.5 bg-black rounded-full overflow-hidden relative mx-3">
        <div
          className="absolute top-0 left-0 h-full bg-slate-300 transition-all duration-300"
          style={{ width: `${Math.min(base, 100)}%` }}
        />
        {diff > 0 && (
          <div
            className="absolute top-0 h-full bg-green-500 transition-all duration-300 opacity-90"
            style={{ left: `${Math.min(base, 100)}%`, width: `${Math.min(diff, 100 - base)}%` }}
          />
        )}
        {diff < 0 && (
          <div
            className="absolute top-0 h-full bg-red-500 transition-all duration-300 opacity-90"
            style={{ left: `${Math.max(current, 0)}%`, width: `${Math.abs(diff)}%` }}
          />
        )}
      </div>

      <div className="w-16 text-right font-mono flex flex-col justify-center items-end">
        <span className={
          'font-bold text-sm ' +
          (diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white')
        }>
          {animVal}
          {diff !== 0 && (
            <span className="text-[10px] ml-0.5">({diff > 0 ? '+' : ''}{diff})</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Animated compact stat card ────────────────────────────────────────────────

function CompactStatCard({ statName, base, current, label }: {
  statName: string;
  base: number;
  current: number;
  label: string;
}) {
  const animVal  = useAnimatedValue(current);
  const diff     = current - base;
  const isRecoil = statName === 'Recoil Direction';

  return (
    <div className="bg-black/30 rounded-lg px-2.5 py-2 border border-white/5 flex items-center gap-2">
      {isRecoil && <RecoilChart value={current} />}
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500 leading-none mb-0.5">{label}</div>
        <div className={[
          'text-sm font-mono font-bold leading-none',
          diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-200',
        ].join(' ')}>
          {animVal}
          {diff !== 0 && (
            <span className="text-[9px] ml-0.5 font-normal">
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const StatDisplay: React.FC = () => {
  const {
    activeWeapon,
    getCalculatedStats,
    selectedPerks,
    masterworkStat,
    isCrafted,
    activeMod,
    armorMods,
    activeEffects,
    activeBuffs,
  } = useWeaponStore(
    useShallow((s) => ({
      activeWeapon:       s.activeWeapon,
      getCalculatedStats: s.getCalculatedStats,
      selectedPerks:      s.selectedPerks,
      masterworkStat:     s.masterworkStat,
      isCrafted:          s.isCrafted,
      activeMod:          s.activeMod,
      armorMods:          s.armorMods,
      activeEffects:      s.activeEffects,
      activeBuffs:        s.activeBuffs,
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calcStats = useMemo(() => getCalculatedStats(), [
    activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods, activeEffects, activeBuffs,
  ]);

  if (!activeWeapon) return null;

  const baseStats = activeWeapon.baseStats;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayStats = useMemo(() => getStatsForWeapon(
    activeWeapon.itemTypeDisplayName,
    activeWeapon.intrinsicTrait?.name ?? null,
  ), [activeWeapon]);

  const barStats     = displayStats.filter((s) => ALL_BAR_STAT_KEYS.includes(s));
  const compactStats = displayStats.filter((s) => COMPACT_STAT_KEYS.includes(s));

  const handlingTimes = useMemo(() => {
    const stat = calcStats['Handling'] ?? activeWeapon.baseStats['Handling'] ?? null;
    if (stat === null) return null;
    return calcHandlingTimes(activeWeapon.itemTypeDisplayName, stat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcStats, activeWeapon]);

  const reloadMs = useMemo(() => {
    const stat = calcStats['Reload'] ?? activeWeapon.baseStats['Reload'] ?? null;
    if (stat === null) return null;
    return calcReloadTime(activeWeapon.itemTypeDisplayName, activeWeapon.ammoType, stat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcStats, activeWeapon]);

  const bowPerfectDrawMs = useMemo(() => {
    if (activeWeapon.itemSubType !== 31) return null;
    const stat = calcStats['Stability'] ?? activeWeapon.baseStats['Stability'] ?? null;
    if (stat === null) return null;
    return calcBowPerfectDraw(activeWeapon.intrinsicTrait?.name ?? null, stat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcStats, activeWeapon]);

  // Zoom stat for ADS falloff multiplier
  const zoomStat = calcStats['Zoom'] ?? activeWeapon.baseStats['Zoom'] ?? 14;

  return (
    <CollapsiblePanel title="Weapon Stats">

      {/* ── Bar stats ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-4">
        {barStats.map((statName) => {
          const base    = baseStats[statName] ?? 0;
          const current = calcStats[statName] ?? base;
          if (base === 0 && current === 0 && !ALWAYS_SHOW_STATS.has(statName)) return null;

          const curve = activeWeapon.statCurves[statName];
          const label = STAT_LABEL_MAP[statName] ?? statName;

          // ── Hover tooltip content ────────────────────────────────────────
          let tooltipContent: React.ReactNode = null;

          if (statName === 'Range') {
            const hip = interpolateStat(current, curve);
            if (hip != null) {
              const ads = hip * adsMultiplier(zoomStat);
              tooltipContent = (
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500">Hip</span>
                    <span className="text-sm font-mono font-bold text-cyan-400">{hip.toFixed(1)}m</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500">ADS</span>
                    <span className="text-sm font-mono font-bold text-amber-300">{ads.toFixed(1)}m</span>
                  </div>
                </div>
              );
            }
          } else if (statName === 'Handling' && handlingTimes) {
            tooltipContent = (
              <div>
                <div className="flex gap-4">
                  {([['Ready', handlingTimes.readyMs], ['ADS', handlingTimes.adsMs], ['Stow', handlingTimes.stowMs]] as [string, number][]).map(([lbl, ms]) => (
                    <div key={lbl} className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500">{lbl}</span>
                      <span className="text-sm font-mono font-bold text-amber-400">{ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          } else if (statName === 'Reload' && reloadMs != null) {
            tooltipContent = (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400">Reload time</span>
                <span className="text-sm font-mono font-bold text-amber-400">{(reloadMs / 1000).toFixed(2)}s</span>
              </div>
            );
          } else if (statName === 'Charge Time' && current > 0) {
            tooltipContent = (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400">Charge time</span>
                <span className="text-sm font-mono font-bold text-amber-400">{(current / 1000).toFixed(2)}s</span>
              </div>
            );
          } else if (statName === 'Draw Time' && bowPerfectDrawMs != null) {
            tooltipContent = (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400">Perfect draw</span>
                <span className="text-sm font-mono font-bold text-amber-400">{(bowPerfectDrawMs / 1000).toFixed(2)}s</span>
              </div>
            );
          }

          return (
            <div key={statName}>
              <Tooltip content={tooltipContent} delay={80}>
                <StatBarRow
                  label={label}
                  base={base}
                  current={current}
                />
              </Tooltip>
            </div>
          );
        })}
      </div>

      {/* ── Compact numeric stats grid ───────────────────────────── */}
      {compactStats.length > 0 && (
        <div className="border-t border-white/5 pt-3 mt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {compactStats.map((statName) => {
              const base    = baseStats[statName] ?? 0;
              const current = calcStats[statName] ?? base;
              if (base === 0 && current === 0 && !ALWAYS_SHOW_STATS.has(statName)) return null;

              const label = STAT_LABEL_MAP[statName] ?? statName;
              const zoomTooltip = (statName === 'Zoom' && current > 0)
                ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-400">Magnification</span>
                    <span className="text-sm font-mono font-bold text-amber-400">{(current / 10).toFixed(1)}×</span>
                  </div>
                )
                : undefined;

              return (
                <Tooltip key={statName} content={zoomTooltip} delay={80}>
                  <CompactStatCard
                    statName={statName}
                    base={base}
                    current={current}
                    label={label}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
};
