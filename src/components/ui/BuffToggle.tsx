'use client';

import React from 'react';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE } from '../../lib/buffDatabase';

export const BuffToggle: React.FC = () => {
  const { activeBuffs, toggleBuff, selectedPerks, activeWeapon } = useWeaponStore();

  // Collect all buffKeys from currently selected perks so we can mark them as auto-activated
  const autoBuffKeys = new Set<string>();
  if (activeWeapon) {
    for (const [colName, perkHash] of Object.entries(selectedPerks)) {
      const col = activeWeapon.perkSockets.find((c) => c.name === colName);
      const perk = col?.perks.find((p) => p.hash === perkHash);
      if (perk?.buffKey) autoBuffKeys.add(perk.buffKey);
    }
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-1 text-slate-100">Active Buffs</h2>
      <p className="text-xs text-slate-500 mb-4">
        <span className="text-green-400">Auto</span> = activated by your perk selection.
      </p>
      <div className="flex flex-wrap gap-3">
        {Object.values(BUFF_DATABASE).map((buff) => {
          const isActive = activeBuffs.includes(buff.hash);
          const isAuto = autoBuffKeys.has(buff.hash);
          return (
            <button
              key={buff.hash}
              onClick={() => toggleBuff(buff.hash)}
              title={buff.description}
              className={
                'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 border ' +
                (isActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {isAuto && <span className="text-green-400 mr-1.5 text-xs">●</span>}
              {buff.name}
              <span className="ml-2 opacity-60 text-xs">
                +{(buff.multiplier * 100 - 100).toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
