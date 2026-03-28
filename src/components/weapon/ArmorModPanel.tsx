'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import {
  ArmorModTier,
  dexterityFrameReduction,
  unflinchingReduction,
} from '../../store/useWeaponStore';

// ─── Tier dot selector ────────────────────────────────────────────────────────

interface TierSelectorProps {
  value: ArmorModTier;
  onChange: (t: ArmorModTier) => void;
  color: string; // tailwind bg-* class for active dots
}

function TierSelector({ value, onChange, color }: TierSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {([0, 1, 2, 3, 4, 5] as ArmorModTier[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t === value ? 0 : t)}
          title={`Tier ${t}`}
          className={[
            'w-5 h-5 rounded-full border transition-all text-[9px] font-bold leading-none flex items-center justify-center',
            t === 0 && value === 0
              ? 'bg-white/5 border-white/15 text-white/30'
              : t === 0
              ? 'bg-white/5 border-white/10 text-white/20 hover:border-white/25'
              : t <= value
              ? `${color} border-transparent text-slate-950`
              : 'bg-white/5 border-white/10 text-white/20 hover:border-white/25',
          ].join(' ')}
        >
          {t === 0 ? '×' : t}
        </button>
      ))}
    </div>
  );
}

// ─── Single mod row ───────────────────────────────────────────────────────────

interface ModRowProps {
  label: string;
  subLabel: string;
  value: ArmorModTier;
  onChange: (t: ArmorModTier) => void;
  color: string;
  readout?: string; // extra annotation (frame reduction, flinch %)
}

function ModRow({ label, subLabel, value, onChange, color, readout }: ModRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0">
        <p className="text-xs font-semibold text-slate-200 leading-tight">{label}</p>
        <p className="text-[10px] text-slate-500 leading-tight">{subLabel}</p>
      </div>
      <TierSelector value={value} onChange={onChange} color={color} />
      {readout && (
        <span className="text-[10px] text-slate-500 tabular-nums">{readout}</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ArmorModPanel: React.FC = () => {
  const { activeWeapon, armorMods, setArmorMods } = useWeaponStore();
  const { targeting, loader, dexterity, unflinching } = armorMods;

  // Don't render the panel until a weapon is loaded
  if (!activeWeapon) return null;

  const hasAny = targeting > 0 || loader > 0 || dexterity > 0 || unflinching > 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Armor Mods</h2>
        {hasAny && (
          <button
            onClick={() =>
              setArmorMods({ targeting: 0, loader: 0, dexterity: 0, unflinching: 0 })
            }
            className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Targeting */}
        <ModRow
          label="Targeting"
          subLabel={`+${targeting * 10} Aim Assistance`}
          value={targeting}
          onChange={(t) => setArmorMods({ targeting: t })}
          color="bg-sky-400"
          readout={targeting > 0 ? `+${targeting * 10} AA` : undefined}
        />

        {/* Loader */}
        <ModRow
          label="Loader"
          subLabel={`+${loader * 10} Reload`}
          value={loader}
          onChange={(t) => setArmorMods({ loader: t })}
          color="bg-orange-400"
          readout={loader > 0 ? `+${loader * 10} Reload` : undefined}
        />

        {/* Dexterity */}
        <ModRow
          label="Dexterity"
          subLabel={`+${dexterity * 6} Handling`}
          value={dexterity}
          onChange={(t) => setArmorMods({ dexterity: t })}
          color="bg-emerald-400"
          readout={dexterityFrameReduction(dexterity) || undefined}
        />

        {/* Unflinching */}
        <ModRow
          label="Unflinching"
          subLabel="Flinch resistance"
          value={unflinching}
          onChange={(t) => setArmorMods({ unflinching: t })}
          color="bg-purple-400"
          readout={unflinchingReduction(unflinching) || undefined}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Each tier = one armor mod of that type. Max 5 per stat.
          Targeting / Loader / Dexterity are reflected in stat bars.
          Unflinching has no stat bar — readout only.
        </p>
      </div>
    </div>
  );
};
