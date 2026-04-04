'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff, getBuffMultiplier } from '../../lib/buffDatabase';
import { Perk } from '../../types/weapon';
import { BUNGIE_URL as BUNGIE_ROOT } from '../../lib/bungieUrl';
import { useClarityPerks } from '../../lib/useClarityPerks';
import { ClarityDatabase } from '../../lib/clarity';

// Pre-computed buff lists — static since BUFF_DATABASE is module-level.
const _allBuffs        = Object.values(BUFF_DATABASE);
const _empoweringBuffs = _allBuffs.filter((b) => b.stackType === 'empowering');
const _debuffBuffs     = _allBuffs.filter((b) => b.stackType === 'debuff');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctStr(multiplier: number): string {
  return `+${(multiplier * 100 - 100).toFixed(0)}%`;
}
function multStr(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
}

/** Pull the first plain-text line from a Clarity entry as a short description. */
function getClarityText(clarityData: ClarityDatabase | null, perkHash: string | number): string | null {
  if (!clarityData) return null;
  const entry = clarityData[String(perkHash)];
  if (!entry?.descriptions?.en?.length) return null;
  const parts: string[] = [];
  for (const group of entry.descriptions.en) {
    for (const seg of group.linesContent) {
      if (seg.text) parts.push(seg.text);
    }
    // Only take the first group (one line)
    if (parts.length) break;
  }
  return parts.join('').trim() || null;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function BuffIcon({ buff, linkedPerk }: { buff: DamageBuff; linkedPerk: Perk | null }) {
  const iconPath = buff.stackType === 'multiplicative'
    ? (linkedPerk?.icon ?? null)
    : (buff.icon ?? null);

  if (!iconPath) {
    const dotClass =
      buff.stackType === 'empowering'
        ? 'bg-amber-400/20 border-amber-400/40'
        : buff.stackType === 'debuff'
        ? 'bg-red-400/20 border-red-400/40'
        : 'bg-blue-400/20 border-blue-400/40';
    return (
      <span className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center ${dotClass}`} />
    );
  }

  const src = iconPath.startsWith('http') ? iconPath : BUNGIE_ROOT + iconPath;
  return (
    <div className="shrink-0 w-6 h-6 rounded overflow-hidden bg-white/5 border border-white/10">
      <Image src={src} alt="" width={24} height={24} className="w-full h-full object-cover" unoptimized />
    </div>
  );
}

// ─── Stack selector ───────────────────────────────────────────────────────────

interface StackSelectorProps {
  buff: DamageBuff;
  activeStackIndex: number;
  onSelect: (idx: number) => void;
}

function StackSelector({ buff, activeStackIndex, onSelect }: StackSelectorProps) {
  if (!buff.stacks?.length) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5 ml-8 flex-wrap">
      {buff.stacks.map((stack, idx) => (
        <button
          key={stack.count}
          onClick={(e) => { e.stopPropagation(); onSelect(idx); }}
          className={[
            'text-[10px] font-bold px-2 py-0.5 rounded border transition-colors leading-none',
            idx === activeStackIndex
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-200 hover:border-white/20',
          ].join(' ')}
        >
          {stack.label}
          <span className="ml-1 text-[9px] font-normal opacity-70">
            {pctStr(stack.multiplier)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Buff row ─────────────────────────────────────────────────────────────────

interface BuffRowProps {
  buff: DamageBuff;
  isActive: boolean;
  isOverridden: boolean;
  linkedPerk: Perk | null;
  clarityDesc: string | null;
  activeStackIndex: number;
  onToggle: () => void;
  onSelectStack: (idx: number) => void;
}

function BuffRow({
  buff, isActive, isOverridden, linkedPerk, clarityDesc,
  activeStackIndex, onToggle, onSelectStack,
}: BuffRowProps) {
  const isDebuff  = buff.stackType === 'debuff';
  const isPerk    = buff.stackType === 'multiplicative';

  // Effective multiplier at the current stack level
  const effectiveMult = isActive
    ? getBuffMultiplier(buff, buff.stacks?.length ? activeStackIndex : undefined)
    : buff.multiplier;

  const activeColor = isPerk ? 'emerald' : isDebuff ? 'red' : 'amber';

  const buttonClass = [
    'flex items-start gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border text-left w-full',
    isActive
      ? activeColor === 'emerald'
        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
        : activeColor === 'red'
        ? 'bg-red-500/15 border-red-500/50 text-red-300'
        : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
      : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200',
  ].join(' ');

  const desc = clarityDesc ?? buff.description;

  return (
    <div>
      <button onClick={onToggle} title={desc} className={buttonClass}>
        {/* Icon */}
        <BuffIcon buff={buff} linkedPerk={linkedPerk} />

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Active dot */}
            <span className={[
              'shrink-0 w-1.5 h-1.5 rounded-full',
              isActive
                ? activeColor === 'emerald' ? 'bg-emerald-400'
                : activeColor === 'red'     ? 'bg-red-400'
                :                            'bg-amber-400'
                : 'bg-white/15',
            ].join(' ')} />
            <span className="text-xs font-semibold truncate">{buff.name}</span>
            {isActive && isOverridden && (
              <span className="shrink-0 text-[8px] text-slate-500 bg-slate-900 px-1 py-0.5 rounded border border-slate-700 leading-none">
                overridden
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2 pr-1">
            {desc}
          </p>
        </div>

        {/* Percentage */}
        <span className={[
          'shrink-0 text-xs font-bold tabular-nums self-center',
          isActive && !isOverridden
            ? activeColor === 'emerald' ? 'text-emerald-400'
            : activeColor === 'red'     ? 'text-red-400'
            :                            'text-amber-400'
            : 'text-slate-600',
        ].join(' ')}>
          {pctStr(effectiveMult)}
        </span>
      </button>

      {/* Stack selector — shown only when active and buff has stacks */}
      {isActive && buff.stacks?.length ? (
        <StackSelector
          buff={buff}
          activeStackIndex={activeStackIndex}
          onSelect={onSelectStack}
        />
      ) : null}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ label, count, note }: { label: string; count?: number; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full leading-none">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/5" />
      {note && (
        <span className="text-[9px] text-slate-600 italic shrink-0">{note}</span>
      )}
    </div>
  );
}

// ─── Combined multiplier breakdown ───────────────────────────────────────────

function MultiplierBreakdown({
  activeBuffs,
  buffStacks,
}: {
  activeBuffs: string[];
  buffStacks: Record<string, number>;
}) {
  const { perkMult, empoweringMult, debuffMult, total } = useMemo(() => {
    let perkMult       = 1;
    let empoweringMult = 1;
    let debuffMult     = 1;

    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (!buff) return;
      const mult = getBuffMultiplier(buff, buffStacks[hash]);
      if (buff.stackType === 'multiplicative') {
        perkMult *= mult;
      } else if (buff.stackType === 'empowering') {
        if (mult > empoweringMult) empoweringMult = mult;
      } else if (buff.stackType === 'debuff') {
        if (mult > debuffMult) debuffMult = mult;
      }
    });

    return { perkMult, empoweringMult, debuffMult, total: perkMult * empoweringMult * debuffMult };
  }, [activeBuffs, buffStacks]);

  if (total === 1) return null;

  const parts: { label: string; value: number; color: string }[] = [];
  if (perkMult       > 1) parts.push({ label: 'Perks',      value: perkMult,       color: 'text-emerald-400' });
  if (empoweringMult > 1) parts.push({ label: 'Empowering', value: empoweringMult, color: 'text-amber-400'   });
  if (debuffMult     > 1) parts.push({ label: 'Debuff',     value: debuffMult,     color: 'text-red-400'     });

  return (
    <div className="mb-5 p-3 bg-black/40 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Combined Multiplier</span>
        <span className="text-xl font-black text-amber-400 tabular-nums">{multStr(total)}</span>
      </div>
      {parts.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {parts.map((p, i) => (
            <React.Fragment key={p.label}>
              {i > 0 && <span className="text-slate-600 text-xs">×</span>}
              <span className={`text-xs font-mono font-bold ${p.color}`}>
                {multStr(p.value)}
                <span className="text-[10px] font-normal text-slate-500 ml-0.5">{p.label}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const BuffToggle: React.FC = () => {
  const {
    activeBuffs, toggleBuff, setBuffStack, buffStacks,
    selectedPerks, activeWeapon,
  } = useWeaponStore(
    useShallow((s) => ({
      activeBuffs:   s.activeBuffs,
      toggleBuff:    s.toggleBuff,
      setBuffStack:  s.setBuffStack,
      buffStacks:    s.buffStacks,
      selectedPerks: s.selectedPerks,
      activeWeapon:  s.activeWeapon,
    }))
  );

  const { data: clarityData } = useClarityPerks();

  // ── Derive which perk buffs are visible (only equipped perks) ──────────────
  const { linkedPerkByBuffKey, linkedBuffKeys } = useMemo(() => {
    const byKey = new Map<string, Perk>();
    const keys  = new Set<string>();
    if (!activeWeapon) return { linkedPerkByBuffKey: byKey, linkedBuffKeys: keys };

    for (const [colName, perkHash] of Object.entries(selectedPerks)) {
      const col = activeWeapon.perkSockets.find((c) => c.name === colName);
      if (!col) continue;

      const basePerk = col.perks.find((p) => p.hash === perkHash);
      if (basePerk?.buffKey) {
        keys.add(basePerk.buffKey);
        byKey.set(basePerk.buffKey, basePerk);
      }

      // Enhanced version selected — buffKey lives on the base perk
      for (const p of col.perks) {
        if (p.enhancedVersion?.hash === perkHash) {
          if (p.buffKey) {
            keys.add(p.buffKey);
            byKey.set(p.buffKey, p);
          }
          if (p.enhancedVersion.buffKey && p.enhancedVersion.buffKey !== p.buffKey) {
            keys.add(p.enhancedVersion.buffKey);
            byKey.set(p.enhancedVersion.buffKey, p);
          }
        }
      }
    }
    return { linkedPerkByBuffKey: byKey, linkedBuffKeys: keys };
  }, [activeWeapon, selectedPerks]);

  // Only show weapon perk buffs that the player has equipped
  const visiblePerkBuffs = useMemo(
    () => _allBuffs.filter((b) => b.stackType === 'multiplicative' && linkedBuffKeys.has(b.hash)),
    [linkedBuffKeys],
  );

  const activeSet   = useMemo(() => new Set(activeBuffs), [activeBuffs]);
  const activeCount = activeBuffs.length;

  // Winning (highest) empowering buff among active ones
  const winningEmpowering = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'empowering' && buff.multiplier > best) {
        best = buff.multiplier;
        winner = hash;
      }
    });
    return winner;
  }, [activeBuffs]);

  // Winning debuff
  const winningDebuff = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'debuff' && buff.multiplier > best) {
        best = buff.multiplier;
        winner = hash;
      }
    });
    return winner;
  }, [activeBuffs]);

  return (
    <div className="bg-white/5 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Damage Buffs</h2>
        {activeCount > 0 && (
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            {activeCount} active
          </span>
        )}
      </div>

      {/* Combined multiplier breakdown */}
      <MultiplierBreakdown activeBuffs={activeBuffs} buffStacks={buffStacks} />

      <div className="space-y-5">

        {/* ── Weapon Perks — only visible when a perk with a buff is equipped ── */}
        <div>
          <SectionLabel
            label="Weapon Perks"
            count={visiblePerkBuffs.filter((b) => activeSet.has(b.hash)).length}
          />
          {visiblePerkBuffs.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2">
              Equip weapon perks to see their damage buffs here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {visiblePerkBuffs.map((buff) => {
                const linkedPerk = linkedPerkByBuffKey.get(buff.hash) ?? null;
                const clarityDesc = linkedPerk
                  ? getClarityText(clarityData, linkedPerk.hash)
                  : null;
                const stackIndex = buffStacks[buff.hash] ?? (buff.stacks ? buff.stacks.length - 1 : 0);
                return (
                  <BuffRow
                    key={buff.hash}
                    buff={buff}
                    isActive={activeSet.has(buff.hash)}
                    isOverridden={false}
                    linkedPerk={linkedPerk}
                    clarityDesc={clarityDesc}
                    activeStackIndex={stackIndex}
                    onToggle={() => toggleBuff(buff.hash)}
                    onSelectStack={(idx) => setBuffStack(buff.hash, idx)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Empowering buffs ── */}
        <div>
          <SectionLabel
            label="Empowering"
            count={_empoweringBuffs.filter((b) => activeSet.has(b.hash)).length}
            note="only highest applies"
          />
          <div className="space-y-1.5">
            {_empoweringBuffs.map((buff) => {
              const isActive    = activeSet.has(buff.hash);
              const isOverridden = isActive && winningEmpowering !== null && buff.hash !== winningEmpowering;
              return (
                <BuffRow
                  key={buff.hash}
                  buff={buff}
                  isActive={isActive}
                  isOverridden={isOverridden}
                  linkedPerk={null}
                  clarityDesc={null}
                  activeStackIndex={0}
                  onToggle={() => toggleBuff(buff.hash)}
                  onSelectStack={() => {}}
                />
              );
            })}
          </div>
        </div>

        {/* ── Debuffs ── */}
        <div>
          <SectionLabel
            label="Debuffs"
            count={_debuffBuffs.filter((b) => activeSet.has(b.hash)).length}
            note="only highest applies"
          />
          <div className="space-y-1.5">
            {_debuffBuffs.map((buff) => {
              const isActive    = activeSet.has(buff.hash);
              const isOverridden = isActive && winningDebuff !== null && buff.hash !== winningDebuff;
              return (
                <BuffRow
                  key={buff.hash}
                  buff={buff}
                  isActive={isActive}
                  isOverridden={isOverridden}
                  linkedPerk={null}
                  clarityDesc={null}
                  activeStackIndex={0}
                  onToggle={() => toggleBuff(buff.hash)}
                  onSelectStack={() => {}}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
