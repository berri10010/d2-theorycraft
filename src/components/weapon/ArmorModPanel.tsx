'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import {
  ArmorModTier,
  dexterityReadout,
  unflinchingReduction,
  ammoGenReadout,
  TARGETING_AA,
  LOADER_RELOAD,
  INFLIGHT_AE,
} from '../../store/useWeaponStore';

// ─── Tier dot selector (0 = none, 1–3 = tier) ────────────────────────────────

interface TierSelectorProps {
  value: ArmorModTier;
  onChange: (t: ArmorModTier) => void;
  color: string; // tailwind bg-* class for filled dots
}

function TierSelector({ value, onChange, color }: TierSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {([0, 1, 2, 3] as ArmorModTier[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t === value ? 0 : t)}
          title={t === 0 ? 'None' : `Tier ${t}`}
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
  readout?: string;
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
        <span className="text-[10px] text-slate-400 tabular-nums">{readout}</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ArmorModPanel: React.FC = () => {
  const { activeWeapon, armorMods, setArmorMods } = useWeaponStore();
  const { targeting, loader, dexterity, unflinching, inFlight, ammoGeneration } = armorMods;

  if (!activeWeapon) return null;

  const hasAny = targeting > 0 || loader > 0 || dexterity > 0
    || unflinching > 0 || inFlight > 0 || ammoGeneration > 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Armor Mods</h2>
        {hasAny && (
          <button
            onClick={() => setArmorMods({
              targeting: 0, loader: 0, dexterity: 0,
              unflinching: 0, inFlight: 0, ammoGeneration: 0,
            })}
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
          subLabel={targeting > 0 ? `+${TARGETING_AA[targeting]} Aim Assist` : '+0 Aim Assist'}
          value={targeting}
          onChange={(t) => setArmorMods({ targeting: t })}
          color="bg-sky-400"
          readout={targeting > 0 ? `+${TARGETING_AA[targeting]} AA` : undefined}
        />

        {/* Loader */}
        <ModRow
          label="Loader"
          subLabel={loader > 0 ? `+${LOADER_RELOAD[loader]} Reload` : '+0 Reload'}
          value={loader}
          onChange={(t) => setArmorMods({ loader: t })}
          color="bg-orange-400"
          readout={loader > 0 ? `+${LOADER_RELOAD[loader]} · 0.85× duration` : undefined}
        />

        {/* Dexterity */}
        <ModRow
          label="Dexterity"
          subLabel="Ready/Stow speed"
          value={dexterity}
          onChange={(t) => setArmorMods({ dexterity: t })}
          color="bg-emerald-400"
          readout={dexterityReadout(dexterity) || undefined}
        />

        {/* In-Flight Compensator */}
        <ModRow
          label="In-Flight Comp."
          subLabel={inFlight > 0 ? `+${INFLIGHT_AE[inFlight]} Airborne Eff.` : '+0 Airborne Eff.'}
          value={inFlight}
          onChange={(t) => setArmorMods({ inFlight: t })}
          color="bg-cyan-400"
          readout={inFlight > 0 ? `+${INFLIGHT_AE[inFlight]} AE` : undefined}
        />

        {/* Unflinching Aim */}
        <ModRow
          label="Unflinching Aim"
          subLabel="Flinch resistance (ADS)"
          value={unflinching}
          onChange={(t) => setArmorMods({ unflinching: t })}
          color="bg-purple-400"
          readout={unflinchingReduction(unflinching) || undefined}
        />

        {/* Ammo Generation */}
        <ModRow
          label="Ammo Generation"
          subLabel="Ammo generation stat"
          value={ammoGeneration}
          onChange={(t) => setArmorMods({ ammoGeneration: t })}
          color="bg-yellow-400"
          readout={ammoGenReadout(ammoGeneration) || undefined}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Tier 1 | 2 | 3 = 1, 2, or 3 copies of the mod equipped.
          All mods require element-matching weapon except In-Flight Compensator.
        </p>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Targeting, Loader, Dexterity, and In-Flight are reflected in stat bars.
          Unflinching and Ammo Generation have no stat bar.
        </p>
      </div>
    </div>
  );
};
