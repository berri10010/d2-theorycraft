'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { interpolateStat } from '../../lib/math';
import { getStatsForWeapon } from '../../lib/weaponStatMappings';

const STAT_TRANSLATIONS: Record<string, { label: string; unit: string }> = {
  Range:    { label: 'Falloff', unit: 'm' },
  Handling: { label: 'Ready',   unit: 's' },
  Reload:   { label: 'Time',    unit: 's' },
};

const STAT_LABEL_MAP: Record<string, string> = {
  'Aim Assistance':          'Aim Assist',
  'Airborne Effectiveness':  'Airborne',
  'Ammo Generation':         'Ammo Gen',
  'Recoil Direction':        'Recoil',
};

// Stats shown as full-width bar charts
const ALL_BAR_STAT_KEYS = [
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
  'Velocity', 'Blast Radius', 'Accuracy',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration',
];

// Stats shown compactly in a grid (no meaningful 0-100 bar)
const COMPACT_STAT_KEYS = [
  'Zoom', 'Airborne Effectiveness', 'Ammo Generation', 'Recoil Direction', 'Magazine', 'Inventory Size',
];

// ── Recoil direction chart ──────────────────────────────────────────────────────

function RecoilChart({ value }: { value: number }) {
  // Map recoil direction (0–100) to angle from vertical (−90° to +90°)
  // 50 ≈ straight up, 0 = far left, 100 = far right
  const angleDeg = (value - 50) * 1.8;
  const angleRad = (angleDeg - 90) * (Math.PI / 180);

  const cx = 28, cy = 28, r = 20;
  const lineX = cx + r * Math.cos(angleRad);
  const lineY = cy + r * Math.sin(angleRad);

  // Arc: from -90° to +90° (top semicircle)
  const arcStart = { x: cx - r, y: cy };
  const arcEnd   = { x: cx + r, y: cy };

  const stabilityColor =
    value >= 80 ? '#22c55e'
    : value >= 60 ? '#84cc16'
    : value >= 40 ? '#eab308'
    : '#f97316';

  return (
    <svg width={56} height={40} viewBox="0 0 56 40" className="shrink-0">
      {/* Background arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none" stroke="#334155" strokeWidth={3} strokeLinecap="round"
      />
      {/* Direction line */}
      <line
        x1={cx} y1={cy}
        x2={lineX} y2={lineY}
        stroke={stabilityColor} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill={stabilityColor} />
    </svg>
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
    }))
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calcStats = useMemo(() => getCalculatedStats(), [
    activeWeapon, selectedPerks, masterworkStat, isCrafted, activeMod, armorMods, activeEffects,
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

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4 text-white">Weapon Stats</h2>

      {/* ── Bar stats ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-4">
        {barStats.map((statName) => {
          const base    = baseStats[statName] ?? 0;
          const current = calcStats[statName] ?? base;
          const diff    = current - base;
          if (base === 0 && current === 0) return null;

          const curve      = activeWeapon.statCurves[statName];
          const translated = interpolateStat(current, curve);
          const info       = STAT_TRANSLATIONS[statName];
          const label      = STAT_LABEL_MAP[statName] ?? statName;

          return (
            <div key={statName} className="flex items-center text-sm">
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
                  {current}
                  {diff !== 0 && (
                    <span className="text-[10px] ml-0.5">({diff > 0 ? '+' : ''}{diff})</span>
                  )}
                </span>
                {translated !== null && info && (
                  <span className="text-[10px] text-amber-500">
                    {translated.toFixed(2)}{info.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Compact numeric stats grid ───────────────────────────── */}
      {compactStats.length > 0 && (
        <>
          <div className="border-t border-white/5 pt-3 mt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {compactStats.map((statName) => {
                const base    = baseStats[statName] ?? 0;
                const current = calcStats[statName] ?? base;
                const diff    = current - base;
                if (base === 0 && current === 0) return null;

                const label = STAT_LABEL_MAP[statName] ?? statName;
                const isRecoil = statName === 'Recoil Direction';

                return (
                  <div
                    key={statName}
                    className="bg-black/30 rounded-lg px-2.5 py-2 border border-white/5 flex items-center gap-2"
                  >
                    {isRecoil && <RecoilChart value={current} />}
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500 leading-none mb-0.5">{label}</div>
                      <div className={[
                        'text-sm font-mono font-bold leading-none',
                        diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-200',
                      ].join(' ')}>
                        {current}
                        {diff !== 0 && (
                          <span className="text-[9px] ml-0.5 font-normal">
                            ({diff > 0 ? '+' : ''}{diff})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
