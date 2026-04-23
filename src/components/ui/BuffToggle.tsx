'use client';

import React, { useMemo, useState } from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import { useShallow } from 'zustand/react/shallow';
import { useWeaponStore } from '../../store/useWeaponStore';
import { BUFF_DATABASE, DamageBuff, ClassType, getBuffMultiplier } from '../../lib/buffDatabase';
import { EXOTIC_ARMOR, ExoticClassType } from '../../data/exoticArmor';

// Pre-compute buff groups
const _allBuffs = Object.values(BUFF_DATABASE);

function buffsForClass(classType: ClassType | null) {
  if (classType === null) {
    return _allBuffs.filter((b) => !b.classType);
  }
  return _allBuffs.filter((b) => b.classType === classType);
}

const _generalEmpowering  = buffsForClass(null).filter((b) => b.stackType === 'empowering');
const _generalDebuffs     = buffsForClass(null).filter((b) => b.stackType === 'debuff');
const _neutralBuffs       = buffsForClass('neutral');
const _hunterBuffs        = buffsForClass('hunter');
const _warlockBuffs       = buffsForClass('warlock');
const _titanBuffs         = buffsForClass('titan');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctStr(multiplier: number): string {
  const delta = multiplier * 100 - 100;
  return delta === 0 ? 'utility' : `+${delta.toFixed(0)}%`;
}
function multStr(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
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
    <div className="flex items-center gap-1 mt-1.5 ml-4 flex-wrap">
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
            +{(stack.multiplier * 100 - 100).toFixed(0)}%
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
  activeStackIndex: number;
  onToggle: () => void;
  onSelectStack: (idx: number) => void;
}

function BuffRow({ buff, isActive, isOverridden, activeStackIndex, onToggle, onSelectStack }: BuffRowProps) {
  const isDebuff    = buff.stackType === 'debuff';
  const isUtility   = buff.multiplier === 1.0;
  const activeColor = isDebuff ? 'red' : 'amber';

  const effectiveMult = isActive
    ? getBuffMultiplier(buff, buff.stacks?.length ? activeStackIndex : undefined)
    : buff.multiplier;

  const buttonClass = [
    'flex items-start gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border text-left w-full',
    isActive
      ? isDebuff
        ? 'bg-red-500/15 border-red-500/50 text-red-300'
        : isUtility
          ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
          : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
      : 'bg-white/3 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200',
  ].join(' ');

  return (
    <div>
      <button onClick={onToggle} title={buff.description} className={buttonClass}>
        <span className={[
          'shrink-0 w-1.5 h-1.5 rounded-full mt-1.5',
          isActive
            ? isDebuff ? 'bg-red-400' : isUtility ? 'bg-sky-400' : 'bg-amber-400'
            : 'bg-white/15',
        ].join(' ')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold truncate">{buff.name}</span>
            {isActive && isOverridden && (
              <span className="shrink-0 text-[8px] text-slate-500 bg-slate-900 px-1 py-0.5 rounded border border-slate-700 leading-none">
                overridden
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2 pr-1">
            {buff.description}
          </p>
        </div>
        <span className={[
          'shrink-0 text-xs font-bold tabular-nums self-center',
          isActive && !isOverridden
            ? isDebuff ? 'text-red-400' : isUtility ? 'text-sky-400' : 'text-amber-400'
            : 'text-slate-600',
        ].join(' ')}>
          {pctStr(effectiveMult)}
        </span>
      </button>
      {isActive && buff.stacks?.length ? (
        <StackSelector buff={buff} activeStackIndex={activeStackIndex} onSelect={onSelectStack} />
      ) : null}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  label: string;
  note?: string;
  activeCount: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ label, note, activeCount, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-2 mb-2 group">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {activeCount > 0 && (
          <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full leading-none">
            {activeCount}
          </span>
        )}
        <div className="flex-1 h-px bg-white/5" />
        {note && !open && (
          <span className="text-[9px] text-slate-600 italic shrink-0">{note}</span>
        )}
        <svg
          className={[
            'shrink-0 w-3 h-3 text-slate-600 transition-transform duration-200 group-hover:text-slate-400',
            open ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
        >
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          {note && <p className="text-[9px] text-slate-600 italic mb-2">{note}</p>}
          <div className="space-y-1.5">{children}</div>
        </>
      )}
    </div>
  );
}

// ─── External multiplier breakdown ───────────────────────────────────────────

function ExternalMultiplierBreakdown({ activeBuffs }: { activeBuffs: string[] }) {
  const { empoweringMult, debuffMult, total } = useMemo(() => {
    let empoweringMult = 1;
    let debuffMult     = 1;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (!buff) return;
      const mult = buff.multiplier;
      if (buff.stackType === 'empowering' && mult > empoweringMult) empoweringMult = mult;
      if (buff.stackType === 'debuff'     && mult > debuffMult)     debuffMult     = mult;
    });
    return { empoweringMult, debuffMult, total: empoweringMult * debuffMult };
  }, [activeBuffs]);

  if (total === 1) return null;

  const parts: { label: string; value: number; color: string }[] = [];
  if (empoweringMult > 1) parts.push({ label: 'Empowering', value: empoweringMult, color: 'text-amber-400' });
  if (debuffMult     > 1) parts.push({ label: 'Debuff',     value: debuffMult,     color: 'text-red-400'  });

  return (
    <div className="mb-5 p-3 bg-black/40 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">External Multiplier</span>
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

// ─── Exotic armor selector ────────────────────────────────────────────────────

interface ExoticArmorSectionProps {
  classType: ExoticClassType;
  activeWeaponType: string | null;
  activeExoticArmor: Record<ExoticClassType, string | null>;
  setExoticArmor: (cls: ExoticClassType, id: string | null) => void;
}

function ExoticArmorSection({ classType, activeWeaponType, activeExoticArmor, setExoticArmor }: ExoticArmorSectionProps) {
  const [open, setOpen] = useState(false);
  const exotics   = EXOTIC_ARMOR[classType];
  const selectedId = activeExoticArmor[classType] ?? null;
  const selected   = selectedId ? exotics.find((e) => e.id === selectedId) ?? null : null;

  // Determine which stat bonuses apply for the current weapon type
  const universalBonuses   = selected?.statBonuses ?? null;
  const typeSpecific        = selected?.weaponTypeStatBonuses ?? null;
  const typeMatches         = typeSpecific && activeWeaponType
    ? typeSpecific.types.includes(activeWeaponType)
    : false;

  return (
    <CollapsibleSection
      label="Exotic Armor"
      activeCount={selected ? 1 : 0}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="space-y-2">
        {/* Dropdown */}
        <select
          value={selectedId ?? ''}
          onChange={(e) => setExoticArmor(classType, e.target.value || null)}
          className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/40 transition-colors"
        >
          <option value="">— None equipped —</option>
          {exotics.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {/* Selected exotic details */}
        {selected && (
          <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/15 space-y-1.5">
            <p className="text-[10px] text-slate-400 leading-relaxed">{selected.description}</p>

            {/* Universal stat bonuses */}
            {universalBonuses && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(universalBonuses).map(([stat, bonus]) => (
                  <span key={stat} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-green-400/10 border border-green-400/20 text-green-400">
                    +{bonus} {stat}
                  </span>
                ))}
              </div>
            )}

            {/* Weapon-type-specific stat bonuses */}
            {typeSpecific && (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(typeSpecific.bonuses).map(([stat, bonus]) => (
                    <span
                      key={stat}
                      className={[
                        'text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border',
                        typeMatches
                          ? 'bg-green-400/10 border-green-400/20 text-green-400'
                          : 'bg-white/5 border-white/10 text-slate-500',
                      ].join(' ')}
                    >
                      +{bonus} {stat}
                    </span>
                  ))}
                </div>
                {!typeMatches && (
                  <p className="text-[9px] text-slate-600 italic">
                    Applies to: {typeSpecific.types.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Effect note for complex mechanics */}
            {selected.effectNote && (
              <p className="text-[9px] text-slate-600 italic">{selected.effectNote}</p>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

// ─── Class buff section ───────────────────────────────────────────────────────

interface ClassSectionProps {
  label: string;
  buffs: DamageBuff[];
  activeSet: Set<string>;
  winningEmpowering: string | null;
  winningDebuff: string | null;
  buffStacks: Record<string, number>;
  toggleBuff: (hash: string) => void;
  setBuffStack: (hash: string, idx: number) => void;
}

function ClassSection({
  label, buffs, activeSet, winningEmpowering, winningDebuff, buffStacks, toggleBuff, setBuffStack,
}: ClassSectionProps) {
  const [open, setOpen] = useState(false);
  const activeCount = buffs.filter((b) => activeSet.has(b.hash)).length;
  if (buffs.length === 0) return null;

  return (
    <CollapsibleSection
      label={label}
      activeCount={activeCount}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      {buffs.map((buff) => {
        const isActive     = activeSet.has(buff.hash);
        const isOverridden =
          isActive &&
          ((buff.stackType === 'empowering' && winningEmpowering !== null && buff.hash !== winningEmpowering) ||
           (buff.stackType === 'debuff'     && winningDebuff     !== null && buff.hash !== winningDebuff));
        const stackIndex = buffStacks[buff.hash] ?? 0;
        return (
          <BuffRow
            key={buff.hash}
            buff={buff}
            isActive={isActive}
            isOverridden={isOverridden}
            activeStackIndex={stackIndex}
            onToggle={() => toggleBuff(buff.hash)}
            onSelectStack={(idx) => setBuffStack(buff.hash, idx)}
          />
        );
      })}
    </CollapsibleSection>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const BuffToggle: React.FC = () => {
  const { activeBuffs, toggleBuff, buffStacks, setBuffStack, activeExoticArmor, setExoticArmor, activeWeapon } = useWeaponStore(
    useShallow((s) => ({
      activeBuffs:       s.activeBuffs,
      toggleBuff:        s.toggleBuff,
      buffStacks:        s.buffStacks,
      setBuffStack:      s.setBuffStack,
      activeExoticArmor: s.activeExoticArmor,
      setExoticArmor:    s.setExoticArmor,
      activeWeapon:      s.activeWeapon,
    }))
  );
  const activeWeaponType = activeWeapon?.itemTypeDisplayName ?? null;

  const [empoweringOpen, setEmpoweringOpen] = useState(false);
  const [debuffOpen,     setDebuffOpen]     = useState(false);
  const [neutralOpen,    setNeutralOpen]    = useState(false);

  const activeSet   = useMemo(() => new Set(activeBuffs), [activeBuffs]);
  const activeCount = activeBuffs.length;

  const winningEmpowering = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'empowering' && buff.multiplier > best) { best = buff.multiplier; winner = hash; }
    });
    return winner;
  }, [activeBuffs]);

  const winningDebuff = useMemo(() => {
    let winner: string | null = null;
    let best = 0;
    activeBuffs.forEach((hash) => {
      const buff = BUFF_DATABASE[hash];
      if (buff?.stackType === 'debuff' && buff.multiplier > best) { best = buff.multiplier; winner = hash; }
    });
    return winner;
  }, [activeBuffs]);

  const classSectionProps = { activeSet, winningEmpowering, winningDebuff, buffStacks, toggleBuff, setBuffStack };

  return (
    <CollapsiblePanel
      defaultOpen={false}
      title="External Buffs"
      headerRight={activeCount > 0 && (
        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/30">
          {activeCount} active
        </span>
      )}
    >

      <ExternalMultiplierBreakdown activeBuffs={activeBuffs} />

      <div className="space-y-5">

        {/* Empowering (general) */}
        <CollapsibleSection
          label="Empowering"
          note="only highest applies"
          activeCount={_generalEmpowering.filter((b) => activeSet.has(b.hash)).length}
          open={empoweringOpen}
          onToggle={() => setEmpoweringOpen((v) => !v)}
        >
          {_generalEmpowering.map((buff) => {
            const isActive     = activeSet.has(buff.hash);
            const isOverridden = isActive && winningEmpowering !== null && buff.hash !== winningEmpowering;
            return (
              <BuffRow
                key={buff.hash}
                buff={buff}
                isActive={isActive}
                isOverridden={isOverridden}
                activeStackIndex={0}
                onToggle={() => toggleBuff(buff.hash)}
                onSelectStack={() => {}}
              />
            );
          })}
        </CollapsibleSection>

        {/* Debuffs (general) */}
        <CollapsibleSection
          label="Debuffs"
          note="only highest applies"
          activeCount={_generalDebuffs.filter((b) => activeSet.has(b.hash)).length}
          open={debuffOpen}
          onToggle={() => setDebuffOpen((v) => !v)}
        >
          {_generalDebuffs.map((buff) => {
            const isActive     = activeSet.has(buff.hash);
            const isOverridden = isActive && winningDebuff !== null && buff.hash !== winningDebuff;
            const stackIndex   = buffStacks[buff.hash] ?? 0;
            return (
              <BuffRow
                key={buff.hash}
                buff={buff}
                isActive={isActive}
                isOverridden={isOverridden}
                activeStackIndex={stackIndex}
                onToggle={() => toggleBuff(buff.hash)}
                onSelectStack={(idx) => setBuffStack(buff.hash, idx)}
              />
            );
          })}
        </CollapsibleSection>

        {/* Class-neutral abilities */}
        <CollapsibleSection
          label="Class Neutral"
          note="abilities & fragments"
          activeCount={_neutralBuffs.filter((b) => activeSet.has(b.hash)).length}
          open={neutralOpen}
          onToggle={() => setNeutralOpen((v) => !v)}
        >
          {_neutralBuffs.map((buff) => {
            const isActive     = activeSet.has(buff.hash);
            const isOverridden =
              isActive &&
              ((buff.stackType === 'empowering' && winningEmpowering !== null && buff.hash !== winningEmpowering) ||
               (buff.stackType === 'debuff'     && winningDebuff     !== null && buff.hash !== winningDebuff));
            const stackIndex = buffStacks[buff.hash] ?? 0;
            return (
              <BuffRow
                key={buff.hash}
                buff={buff}
                isActive={isActive}
                isOverridden={isOverridden}
                activeStackIndex={stackIndex}
                onToggle={() => toggleBuff(buff.hash)}
                onSelectStack={(idx) => setBuffStack(buff.hash, idx)}
              />
            );
          })}
        </CollapsibleSection>

        {/* Hunter */}
        <div className="space-y-2">
          <ExoticArmorSection classType="hunter"  activeWeaponType={activeWeaponType} activeExoticArmor={activeExoticArmor} setExoticArmor={setExoticArmor} />
          <ClassSection label="Hunter Abilities" buffs={_hunterBuffs}  {...classSectionProps} />
        </div>

        {/* Warlock */}
        <div className="space-y-2">
          <ExoticArmorSection classType="warlock" activeWeaponType={activeWeaponType} activeExoticArmor={activeExoticArmor} setExoticArmor={setExoticArmor} />
          <ClassSection label="Warlock Abilities" buffs={_warlockBuffs} {...classSectionProps} />
        </div>

        {/* Titan */}
        <div className="space-y-2">
          <ExoticArmorSection classType="titan"   activeWeaponType={activeWeaponType} activeExoticArmor={activeExoticArmor} setExoticArmor={setExoticArmor} />
          <ClassSection label="Titan Abilities"   buffs={_titanBuffs}   {...classSectionProps} />
        </div>

      </div>
    </CollapsiblePanel>
  );
};
