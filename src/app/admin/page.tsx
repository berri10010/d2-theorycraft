'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWeaponDb } from '../../store/useWeaponDb';
import { groupWeapons } from '../../lib/weaponGroups';
import { Weapon, PerkColumn, WeaponGroup } from '../../types/weapon';
import { TIER_CONFIG, PerkTier } from '../../lib/perkTierDatabase';
import { BUNGIE_URL } from '../../lib/bungieUrl';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'coverage' | 'godroll' | 'perktiers';
type GodRollMode = 'pve' | 'pvp';
type SortDir = 'asc' | 'desc';

interface RollSlot {
  barrel: string[]; mag: string[]; perk1: string[]; perk2: string[];
  originTrait: string | null; mw: string; tier: string; rank: string; notes: string;
}
const BLANK_SLOT: RollSlot = {
  barrel: [], mag: [], perk1: [], perk2: [], originTrait: null, mw: '', tier: '', rank: '', notes: '',
};

interface PerkTierRow {
  pveTier: PerkTier | ''; pveNotes: string; pveRank: string; pveTags: string;
  pvpTier: PerkTier | ''; pvpNotes: string; pvpRank: string; pvpTags: string;
}
const BLANK_ROW: PerkTierRow = {
  pveTier: '', pveNotes: '', pveRank: '', pveTags: '',
  pvpTier: '', pvpNotes: '', pvpRank: '', pvpTags: '',
};

interface DiffEntry {
  type: 'added' | 'modified' | 'removed';
  name: string;
  changes: Array<{ field: string; from: string; to: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colsOf(w: Weapon, type: string): PerkColumn[] { return w.perkSockets.filter((c) => c.columnType === type); }

function perkNamesOf(cols: PerkColumn[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const col of cols) for (const p of col.perks) if (!p.isEnhanced && !seen.has(p.name)) { seen.add(p.name); out.push(p.name); }
  return out;
}

function tierOrder(t: string): number {
  return ['S','A','B','C','D','E','F','G',''].indexOf(t as PerkTier | '');
}

const TIER_OPTIONS: (PerkTier | '')[] = ['S','A','B','C','D','E','F','G',''];

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { cells.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    cells.push(cur); rows.push(cells);
  }
  return rows;
}

function diffPerkRows(
  original: Record<string, PerkTierRow>,
  current: Record<string, PerkTierRow>,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const keys = new Set([...Object.keys(original), ...Object.keys(current)]);
  const FIELDS: (keyof PerkTierRow)[] = ['pveTier','pveRank','pveTags','pveNotes','pvpTier','pvpRank','pvpTags','pvpNotes'];
  for (const name of keys) {
    const o = original[name]; const c = current[name];
    if (!o && c) { diffs.push({ type: 'added',   name, changes: [] }); continue; }
    if (o && !c) { diffs.push({ type: 'removed', name, changes: [] }); continue; }
    if (o && c) {
      const changes = FIELDS.filter((f) => (o[f] ?? '') !== (c[f] ?? '')).map((f) => ({ field: f, from: String(o[f] ?? ''), to: String(c[f] ?? '') }));
      if (changes.length) diffs.push({ type: 'modified', name, changes });
    }
  }
  return diffs.sort((a,b) => a.name.localeCompare(b.name));
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function TierPill({ value, onChange }: { value: PerkTier | ''; onChange: (v: PerkTier | '') => void }) {
  return (
    <div className="flex gap-0.5">
      {TIER_OPTIONS.map((t) => {
        const cfg = t ? TIER_CONFIG[t] : null; const isActive = value === t;
        return (
          <button key={t||'none'} onClick={() => onChange(t)}
            className={['text-[8px] font-black leading-none w-5 h-5 rounded transition-all',
              isActive ? cfg ? cfg.badge : 'bg-white/10 text-slate-400' : 'bg-white/5 text-slate-600 hover:text-slate-300 hover:bg-white/10',
            ].join(' ')}>
            {t||'—'}
          </button>
        );
      })}
    </div>
  );
}

function MultiCheck({ label, names, selected, onChange }: {
  label: string; names: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (n: string) => onChange(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      {names.length === 0 ? <p className="text-[10px] text-slate-700 italic">None</p> : (
        <div className="flex flex-wrap gap-1.5">
          {names.map((n) => (
            <button key={n} onClick={() => toggle(n)}
              className={['text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all',
                selected.includes(n) ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200',
              ].join(' ')}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OriginSelect({ names, value, onChange }: { names: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Origin Trait</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <button key={n} onClick={() => onChange(value === n ? null : n)}
            className={['text-[10px] font-medium px-2 py-0.5 rounded-md border transition-all',
              value === n ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200',
            ].join(' ')}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Diff Modal ───────────────────────────────────────────────────────────────

function DiffModal({ diffs, onConfirm, onCancel }: {
  diffs: DiffEntry[]; onConfirm: () => void; onCancel: () => void;
}) {
  const added    = diffs.filter((d) => d.type === 'added');
  const modified = diffs.filter((d) => d.type === 'modified');
  const removed  = diffs.filter((d) => d.type === 'removed');

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[#111] border border-white/15 rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-bold text-white">
            Review Changes
            <span className="ml-2 text-xs font-normal text-slate-400">
              {diffs.length === 0 ? 'No changes' : `${diffs.length} entr${diffs.length === 1 ? 'y' : 'ies'} changed`}
            </span>
          </h3>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-200 transition-colors text-lg leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4 text-xs">
          {diffs.length === 0 && <p className="text-slate-500 text-center py-4">Nothing to save — no changes detected.</p>}

          {added.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">+ Added ({added.length})</p>
              {added.map((d) => <p key={d.name} className="text-slate-300 py-0.5 truncate">{d.name}</p>)}
            </div>
          )}
          {modified.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">~ Modified ({modified.length})</p>
              {modified.map((d) => (
                <div key={d.name} className="mb-2">
                  <p className="text-slate-200 font-semibold">{d.name}</p>
                  {d.changes.map((c) => (
                    <p key={c.field} className="text-slate-500 pl-2">
                      {c.field}: <span className="line-through text-red-400/70">{c.from || '—'}</span>
                      {' → '}
                      <span className="text-emerald-400">{c.to || '—'}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
          {removed.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">− Removed ({removed.length})</p>
              {removed.map((d) => <p key={d.name} className="text-slate-400 line-through py-0.5">{d.name}</p>)}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/8">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm font-semibold border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={diffs.length === 0}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            Save {diffs.length > 0 ? `${diffs.length} change${diffs.length === 1 ? '' : 's'}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── God Roll Form ────────────────────────────────────────────────────────────

function GodRollForm({ weapon, slot, onChange }: { weapon: Weapon; slot: RollSlot; onChange: (s: RollSlot) => void }) {
  const barrelNames = useMemo(() => perkNamesOf(colsOf(weapon, 'barrel')), [weapon]);
  const magNames    = useMemo(() => perkNamesOf(colsOf(weapon, 'mag')),    [weapon]);
  const perkCols    = useMemo(() => colsOf(weapon, 'perk'),                [weapon]);
  const originNames = useMemo(() => perkNamesOf(colsOf(weapon, 'origin')), [weapon]);
  const perk1Names  = useMemo(() => perkNamesOf(perkCols.slice(0,1)),      [perkCols]);
  const perk2Names  = useMemo(() => perkNamesOf(perkCols.slice(1,2)),      [perkCols]);
  const set = <K extends keyof RollSlot>(k: K, v: RollSlot[K]) => onChange({ ...slot, [k]: v });

  return (
    <div className="space-y-4">
      <MultiCheck label="Barrel" names={barrelNames} selected={slot.barrel} onChange={(v) => set('barrel', v)} />
      <MultiCheck label="Magazine" names={magNames} selected={slot.mag} onChange={(v) => set('mag', v)} />
      <MultiCheck label="Trait 1" names={perk1Names} selected={slot.perk1} onChange={(v) => set('perk1', v)} />
      <MultiCheck label="Trait 2" names={perk2Names} selected={slot.perk2} onChange={(v) => set('perk2', v)} />
      <OriginSelect names={originNames} value={slot.originTrait} onChange={(v) => set('originTrait', v)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Masterwork</label>
          <input value={slot.mw} onChange={(e) => set('mw', e.target.value)} placeholder="e.g. Range"
            className="w-full text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-700" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rank</label>
          <input type="number" value={slot.rank} onChange={(e) => set('rank', e.target.value)} placeholder="e.g. 3"
            className="w-full text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-700" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tier</label>
        <div className="flex gap-1.5">
          {['S','A','B','C','D',''].map((t) => (
            <button key={t||'none'} onClick={() => set('tier', t)}
              className={['text-xs font-bold px-2.5 py-1 rounded-md border transition-all',
                slot.tier === t ? t ? 'bg-amber-500/25 border-amber-500/50 text-amber-300' : 'bg-white/10 border-white/20 text-slate-400' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20',
              ].join(' ')}>
              {t||'—'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Analyst Notes</label>
        <textarea value={slot.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Notes about playstyle, strengths, caveats…"
          className="w-full text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-700 resize-y" />
      </div>
    </div>
  );
}

// ─── Coverage Tab ─────────────────────────────────────────────────────────────

type Coverage = Record<string, { hasPve: boolean; hasPvp: boolean }>;

function CoverageTab({ groups, onEdit }: { groups: WeaponGroup[]; onEdit: (g: WeaponGroup) => void }) {
  const [coverage, setCoverage] = useState<Coverage>({});
  const [filter, setFilter]     = useState('');
  const [pveFil, setPveFil]     = useState<'all'|'yes'|'no'>('all');
  const [pvpFil, setPvpFil]     = useState<'all'|'yes'|'no'>('all');
  const [sortDir, setSortDir]   = useState<SortDir>('asc');

  useEffect(() => {
    fetch('/api/admin/god-roll?weapon=__coverage__')
      .then((r) => r.json())
      .then((d: { coverage: Coverage }) => setCoverage(d.coverage ?? {}))
      .catch(() => {});
  }, []);

  // Coverage for a group: check baseName entry (applies to whole family)
  const groupHasPve = (g: WeaponGroup) => !!(coverage[g.baseName]?.hasPve);
  const groupHasPvp = (g: WeaponGroup) => !!(coverage[g.baseName]?.hasPvp);
  // Version-specific overrides (any variant with its own entry)
  const groupHasOverride = (g: WeaponGroup) => g.variants.some((v) => v.name !== g.baseName && coverage[v.name]);

  const rows = useMemo(() => {
    const q = filter.toLowerCase();
    return groups
      .filter((g) => {
        if (q && !g.baseName.toLowerCase().includes(q)) return false;
        if (pveFil === 'yes' && !groupHasPve(g)) return false;
        if (pveFil === 'no'  &&  groupHasPve(g)) return false;
        if (pvpFil === 'yes' && !groupHasPvp(g)) return false;
        if (pvpFil === 'no'  &&  groupHasPvp(g)) return false;
        return true;
      })
      .sort((a, b) => sortDir === 'asc' ? a.baseName.localeCompare(b.baseName) : b.baseName.localeCompare(a.baseName));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, coverage, filter, pveFil, pvpFil, sortDir]);

  const pveCount     = groups.filter(groupHasPve).length;
  const pvpCount     = groups.filter(groupHasPvp).length;
  const missingCount = groups.filter((g) => !groupHasPve(g)).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Weapon families', value: groups.length,  color: 'text-slate-200' },
          { label: 'PvE curated',     value: pveCount,       color: 'text-amber-400' },
          { label: 'PvP curated',     value: pvpCount,       color: 'text-sky-400'   },
          { label: 'Missing PvE',     value: missingCount,   color: 'text-red-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter weapons…"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-600 w-48" />
        {(['all','yes','no'] as const).map((v) => (
          <button key={`pve-${v}`} onClick={() => setPveFil(v)}
            className={['text-[10px] font-semibold px-2 py-1 rounded border transition-all', pveFil === v ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'].join(' ')}>
            PvE: {v}
          </button>
        ))}
        {(['all','yes','no'] as const).map((v) => (
          <button key={`pvp-${v}`} onClick={() => setPvpFil(v)}
            className={['text-[10px] font-semibold px-2 py-1 rounded border transition-all', pvpFil === v ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'].join(' ')}>
            PvP: {v}
          </button>
        ))}
        <button onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
          className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
          Name {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Table */}
      <div className="border border-white/8 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_60px_60px_80px] gap-0 text-[9px] font-bold text-slate-600 uppercase tracking-widest px-4 py-2 bg-white/3 border-b border-white/8">
          <span>Weapon family</span><span>Versions</span><span className="text-center">PvE</span><span className="text-center">PvP</span><span />
        </div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-white/5">
          {rows.length === 0 && <p className="text-center text-slate-600 text-xs py-8">No weapons match the filter.</p>}
          {rows.map((g) => {
            const hasPve = groupHasPve(g); const hasPvp = groupHasPvp(g);
            const hasOverride = groupHasOverride(g);
            const icon = g.default.icon;
            return (
              <div key={g.baseName} className="grid grid-cols-[1fr_auto_60px_60px_80px] gap-0 items-center px-4 py-2 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  {icon && <div className="relative w-6 h-6 shrink-0"><Image src={BUNGIE_URL+icon} alt="" fill sizes="24px" className="object-cover rounded" unoptimized /></div>}
                  <span className="text-xs text-slate-200 truncate">{g.baseName}</span>
                  {hasOverride && <span className="text-[9px] text-sky-400 border border-sky-500/30 px-1 rounded shrink-0">overrides</span>}
                </div>
                <span className="text-[10px] text-slate-600 mr-4">{g.variants.length}v</span>
                <span className={`text-center text-sm font-bold ${hasPve ? 'text-emerald-400' : 'text-red-900'}`}>{hasPve ? '✓' : '✗'}</span>
                <span className={`text-center text-sm font-bold ${hasPvp ? 'text-emerald-400' : 'text-red-900'}`}>{hasPvp ? '✓' : '✗'}</span>
                <button onClick={() => onEdit(g)} className="text-[10px] font-semibold text-amber-500 hover:text-amber-300 transition-colors text-right">Edit →</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Global Perk Tier Table ───────────────────────────────────────────────────

function PerkTiersTab({
  rows, originalRows, tierMode, setTierMode, onChange, onSave,
}: {
  rows: Record<string, PerkTierRow>;
  originalRows: Record<string, PerkTierRow>;
  tierMode: GodRollMode;
  setTierMode: (m: GodRollMode) => void;
  onChange: (name: string, row: PerkTierRow) => void;
  onSave: () => void;
}) {
  const [filter,   setFilter]   = useState('');
  const [tierFil,  setTierFil]  = useState<PerkTier | ''>('');
  const [sortBy,   setSortBy]   = useState<'name'|'tier'>('name');
  const [sortDir,  setSortDir]  = useState<SortDir>('asc');
  const [newPerk,  setNewPerk]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const diffCount = useMemo(() => diffPerkRows(originalRows, rows).length, [originalRows, rows]);

  const displayRows = useMemo(() => {
    const q = filter.toLowerCase();
    return Object.entries(rows)
      .filter(([name, row]) => {
        if (q && !name.toLowerCase().includes(q)) return false;
        const t = tierMode === 'pvp' ? row.pvpTier : row.pveTier;
        if (tierFil && t !== tierFil) return false;
        return true;
      })
      .sort(([na, ra], [nb, rb]) => {
        let cmp = 0;
        if (sortBy === 'tier') {
          const ta = tierMode === 'pvp' ? ra.pvpTier : ra.pveTier;
          const tb = tierMode === 'pvp' ? rb.pvpTier : rb.pveTier;
          cmp = tierOrder(ta) - tierOrder(tb);
        }
        if (cmp === 0) cmp = na.localeCompare(nb);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rows, filter, tierFil, sortBy, sortDir, tierMode]);

  const handleExport = () => {
    const header = 'name,pveTier,pveRank,pveTags,pveNotes,pvpTier,pvpRank,pvpTags,pvpNotes\n';
    const body = Object.entries(rows)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([name, r]) => [
        escapeCSV(name),
        r.pveTier, r.pveRank, escapeCSV(r.pveTags), escapeCSV(r.pveNotes),
        r.pvpTier, r.pvpRank, escapeCSV(r.pvpTags), escapeCSV(r.pvpNotes),
      ].join(','))
      .join('\n');
    downloadCSV('perk-tiers.csv', header + body);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) return;
      const header = parsed[0].map((h) => h.trim());
      const nameIdx    = header.indexOf('name');
      const pveTierIdx = header.indexOf('pveTier');
      const pveRankIdx = header.indexOf('pveRank');
      const pveTagsIdx = header.indexOf('pveTags');
      const pveNotesIdx= header.indexOf('pveNotes');
      const pvpTierIdx = header.indexOf('pvpTier');
      const pvpRankIdx = header.indexOf('pvpRank');
      const pvpTagsIdx = header.indexOf('pvpTags');
      const pvpNotesIdx= header.indexOf('pvpNotes');
      if (nameIdx === -1) return;
      for (const row of parsed.slice(1)) {
        const name = row[nameIdx]?.trim(); if (!name) continue;
        onChange(name, {
          pveTier:  (row[pveTierIdx]?.trim() ?? '') as PerkTier | '',
          pveRank:  row[pveRankIdx]?.trim()  ?? '',
          pveTags:  row[pveTagsIdx]?.trim()  ?? '',
          pveNotes: row[pveNotesIdx]?.trim() ?? '',
          pvpTier:  (row[pvpTierIdx]?.trim() ?? '') as PerkTier | '',
          pvpRank:  row[pvpRankIdx]?.trim()  ?? '',
          pvpTags:  row[pvpTagsIdx]?.trim()  ?? '',
          pvpNotes: row[pvpNotesIdx]?.trim() ?? '',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddPerk = () => {
    const name = newPerk.trim(); if (!name || rows[name]) return;
    onChange(name, { ...BLANK_ROW }); setNewPerk('');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search perks…"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-600 w-44" />

        {/* Tier filter */}
        <select value={tierFil} onChange={(e) => setTierFil(e.target.value as PerkTier | '')}
          className="text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 focus:outline-none">
          <option value="">All tiers</option>
          {TIER_OPTIONS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
          <option value="">Unrated</option>
        </select>

        {/* Sort */}
        <button onClick={() => { setSortBy('name'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}
          className={['text-[10px] px-2 py-1 rounded border transition-all', sortBy==='name' ? 'bg-white/10 border-white/20 text-slate-200' : 'bg-white/5 border-white/10 text-slate-500'].join(' ')}>
          Name {sortBy==='name' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>
        <button onClick={() => { setSortBy('tier'); setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}
          className={['text-[10px] px-2 py-1 rounded border transition-all', sortBy==='tier' ? 'bg-white/10 border-white/20 text-slate-200' : 'bg-white/5 border-white/10 text-slate-500'].join(' ')}>
          Tier {sortBy==='tier' ? (sortDir==='asc'?'↑':'↓') : ''}
        </button>

        {/* PvE/PvP mode */}
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 ml-2">
          {(['pve','pvp'] as const).map((m) => (
            <button key={m} onClick={() => setTierMode(m)}
              className={['px-2.5 py-1 text-[10px] rounded-md font-bold uppercase transition-colors', tierMode===m ? 'bg-white/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'].join(' ')}>
              {m}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-600 ml-1">{displayRows.length} perks</span>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button onClick={handleExport}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors">
            Export CSV
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors">
            Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={onSave}
            className={['text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors', diffCount > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'].join(' ')}>
            Save{diffCount > 0 ? ` (${diffCount})` : ''}
          </button>
        </div>
      </div>

      {/* Add new perk */}
      <div className="flex gap-2">
        <input value={newPerk} onChange={(e) => setNewPerk(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddPerk(); }}
          placeholder="Add perk by name…"
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-600 flex-1 max-w-xs" />
        <button onClick={handleAddPerk} disabled={!newPerk.trim() || !!rows[newPerk.trim()]}
          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors">
          + Add
        </button>
      </div>

      {/* Table */}
      <div className="border border-white/8 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white/3 border-b border-white/8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          <span className="w-48 shrink-0">Perk</span>
          <span className="w-44">Tier</span>
          <span className="w-14">Rank</span>
          <span className="w-36">Tags</span>
          <span className="flex-1">Notes</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-white/5">
          {displayRows.length === 0 && (
            <p className="text-center text-slate-600 text-xs py-8">No perks match the current filter.</p>
          )}
          {displayRows.map(([name, row]) => {
            if (tierMode === 'pvp') {
              const set = (k: keyof Pick<PerkTierRow,'pvpTier'|'pvpNotes'|'pvpRank'|'pvpTags'>, v: string) =>
                onChange(name, { ...row, [k]: v });
              return (
                <div key={name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/3 transition-colors">
                  <span className="text-xs text-slate-300 w-48 shrink-0 truncate" title={name}>{name}</span>
                  <div className="w-44 shrink-0"><TierPill value={row.pvpTier} onChange={(v) => set('pvpTier', v)} /></div>
                  <input value={row.pvpRank} onChange={(e) => set('pvpRank', e.target.value)} type="number" placeholder="—"
                    className="w-14 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
                  <input value={row.pvpTags} onChange={(e) => set('pvpTags', e.target.value)} placeholder="tags"
                    className="w-36 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
                  <input value={row.pvpNotes} onChange={(e) => set('pvpNotes', e.target.value)} placeholder="Notes…"
                    className="flex-1 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
                </div>
              );
            }
            const set = (k: keyof Pick<PerkTierRow,'pveTier'|'pveNotes'|'pveRank'|'pveTags'>, v: string) =>
              onChange(name, { ...row, [k]: v });
            return (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/3 transition-colors">
                <span className="text-xs text-slate-300 w-48 shrink-0 truncate" title={name}>{name}</span>
                <div className="w-44 shrink-0"><TierPill value={row.pveTier} onChange={(v) => set('pveTier', v)} /></div>
                <input value={row.pveRank} onChange={(e) => set('pveRank', e.target.value)} type="number" placeholder="—"
                  className="w-14 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
                <input value={row.pveTags} onChange={(e) => set('pveTags', e.target.value)} placeholder="tags"
                  className="w-36 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
                <input value={row.pveNotes} onChange={(e) => set('pveNotes', e.target.value)} placeholder="Notes…"
                  className="flex-1 text-[10px] px-1.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 focus:outline-none focus:border-amber-500/40 placeholder-slate-700" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── God Roll Tab ─────────────────────────────────────────────────────────────

function GodRollTab({ groups, initialGroup, onGroupChange }: {
  groups: WeaponGroup[]; initialGroup: WeaponGroup | null; onGroupChange: (g: WeaponGroup | null) => void;
}) {
  const [query,           setQuery]           = useState(initialGroup?.baseName ?? '');
  const [group,           setGroup]           = useState<WeaponGroup | null>(initialGroup);
  const [saveKey,         setSaveKey]         = useState<string>(initialGroup?.baseName ?? '');
  const [overrideVersion, setOverrideVersion] = useState(false);
  const [rollMode,        setRollMode]        = useState<GodRollMode>('pve');
  const [pveSlot,         setPveSlot]         = useState<RollSlot>(BLANK_SLOT);
  const [pvpSlot,         setPvpSlot]         = useState<RollSlot>(BLANK_SLOT);
  const [diff,            setDiff]            = useState<DiffEntry[] | null>(null);
  const [pendingSave,     setPendingSave]     = useState(false);
  const [status,          setStatus]          = useState<string | null>(null);

  useEffect(() => {
    if (initialGroup && initialGroup !== group) {
      setGroup(initialGroup);
      setQuery(initialGroup.baseName);
      setSaveKey(initialGroup.baseName);
      setOverrideVersion(false);
      loadGroupData(initialGroup);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroup]);

  const filtered = useMemo(() => {
    if (!query.trim() || group) return [];
    const q = query.toLowerCase();
    return groups.filter((g) => g.baseName.toLowerCase().includes(q)).slice(0, 12);
  }, [groups, query, group]);

  const loadGroupData = async (g: WeaponGroup) => {
    setPveSlot(BLANK_SLOT); setPvpSlot(BLANK_SLOT);
    // Prefer baseName key; fall back to default weapon name for legacy data
    const keysToTry = [g.baseName, g.default.name].filter((v, i, a) => a.indexOf(v) === i);
    for (const key of keysToTry) {
      try {
        const res  = await fetch(`/api/admin/god-roll?weapon=${encodeURIComponent(key)}`);
        const data = await res.json() as { entry: Record<string, unknown> | null };
        if (data.entry) {
          const e = data.entry;
          const arr = (v: unknown) => Array.isArray(v) ? v as string[] : [];
          const str = (v: unknown) => typeof v === 'string' ? v : '';
          const num = (v: unknown) => typeof v === 'number' ? String(v) : '';
          setPveSlot({ barrel:arr(e.barrel),mag:arr(e.mag),perk1:arr(e.perk1),perk2:arr(e.perk2),
            originTrait:typeof e.originTrait==='string'?e.originTrait:null,mw:str(e.mw),tier:str(e.tier),rank:num(e.rank),notes:str(e.notes) });
          setPvpSlot({ barrel:arr(e.pvpBarrel),mag:arr(e.pvpMag),perk1:arr(e.pvpPerk1),perk2:arr(e.pvpPerk2),
            originTrait:typeof e.pvpOriginTrait==='string'?e.pvpOriginTrait:null,mw:str(e.pvpMw),tier:str(e.pvpTier),rank:num(e.pvpRank),notes:str(e.pvpNotes) });
          break;
        }
      } catch { /* leave blank */ }
    }
  };

  const selectGroup = (g: WeaponGroup) => {
    setGroup(g); setQuery(g.baseName);
    setSaveKey(g.baseName); setOverrideVersion(false);
    onGroupChange(g); loadGroupData(g);
  };

  // The weapon used to populate perk checkboxes
  const activeWeapon = group
    ? (overrideVersion ? (group.variants.find((v) => v.name === saveKey) ?? group.default) : group.default)
    : null;

  const requestSave = () => {
    const d: DiffEntry[] = [{ type: 'modified', name: saveKey, changes: [
      { field: 'PvE Tier', from: '?', to: pveSlot.tier || '—' },
      { field: 'PvP Tier', from: '?', to: pvpSlot.tier || '—' },
    ]}];
    setDiff(d); setPendingSave(true);
  };

  const confirmSave = async () => {
    if (!group) return;
    setDiff(null); setPendingSave(false);
    try {
      const entry = {
        barrel:pveSlot.barrel,mag:pveSlot.mag,perk1:pveSlot.perk1,perk2:pveSlot.perk2,
        originTrait:pveSlot.originTrait,mw:pveSlot.mw||null,tier:pveSlot.tier||null,
        rank:pveSlot.rank?Number(pveSlot.rank):null,notes:pveSlot.notes||null,
        pvpBarrel:pvpSlot.barrel,pvpMag:pvpSlot.mag,pvpPerk1:pvpSlot.perk1,pvpPerk2:pvpSlot.perk2,
        pvpOriginTrait:pvpSlot.originTrait,pvpMw:pvpSlot.mw||null,pvpTier:pvpSlot.tier||null,
        pvpRank:pvpSlot.rank?Number(pvpSlot.rank):null,pvpNotes:pvpSlot.notes||null,
      };
      const res = await fetch('/api/admin/god-roll', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({weaponName:saveKey,entry}) });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Saved!');
    } catch (err) { setStatus(`Error: ${String(err)}`); }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="space-y-4">
      {pendingSave && diff && (
        <DiffModal diffs={diff} onConfirm={confirmSave} onCancel={() => { setDiff(null); setPendingSave(false); }} />
      )}

      {/* Weapon family search */}
      <div className="relative">
        <input value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value !== group?.baseName) { setGroup(null); onGroupChange(null); } }}
          placeholder="Search weapon family…"
          className="w-full text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-600" />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/15 rounded-xl shadow-2xl z-20 overflow-hidden max-h-60 overflow-y-auto">
            {filtered.map((g) => (
              <button key={g.baseName} onClick={() => selectGroup(g)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition-colors text-left">
                {g.default.icon && <div className="relative w-7 h-7 shrink-0"><Image src={BUNGIE_URL+g.default.icon} alt="" fill sizes="28px" className="object-cover rounded" unoptimized /></div>}
                <div>
                  <p className="text-xs font-semibold text-slate-200">{g.baseName}</p>
                  <p className="text-[10px] text-slate-500">{g.default.itemTypeDisplayName} · {g.variants.length} version{g.variants.length > 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {group && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {group.default.icon && <div className="relative w-9 h-9 shrink-0"><Image src={BUNGIE_URL+group.default.icon} alt="" fill sizes="36px" className="object-cover rounded-lg" unoptimized /></div>}
              <div>
                <p className="text-sm font-bold text-white">{group.baseName}</p>
                <p className="text-[10px] text-slate-500">
                  {group.variants.length} version{group.variants.length > 1 ? 's' : ''} · saves as <span className="text-amber-400 font-mono">{saveKey}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                {(['pve','pvp'] as const).map((m) => (
                  <button key={m} onClick={() => setRollMode(m)}
                    className={['px-3 py-1 text-xs rounded-md font-bold uppercase transition-colors', rollMode===m ? 'bg-white/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'].join(' ')}>
                    {m}
                  </button>
                ))}
              </div>
              <button onClick={requestSave}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors">
                Save Roll
              </button>
            </div>
          </div>

          {/* Version override — only shown when family has multiple variants */}
          {group.variants.length > 1 && (
            <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={overrideVersion} onChange={(e) => {
                  setOverrideVersion(e.target.checked);
                  setSaveKey(e.target.checked ? group.default.name : group.baseName);
                }} className="accent-amber-500" />
                <span className="text-xs text-slate-400">Override for a specific version only</span>
              </label>
              {overrideVersion && (
                <select value={saveKey} onChange={(e) => setSaveKey(e.target.value)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200 focus:outline-none ml-2">
                  {group.variants.map((v) => (
                    <option key={v.hash} value={v.name}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            {activeWeapon && (rollMode === 'pve'
              ? <GodRollForm weapon={activeWeapon} slot={pveSlot} onChange={setPveSlot} />
              : <GodRollForm weapon={activeWeapon} slot={pvpSlot} onChange={setPvpSlot} />)}
          </div>
        </>
      )}

      {status && (
        <div className={['fixed bottom-6 right-6 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-2xl z-50', status.startsWith('Error') ? 'bg-red-500/90 text-white' : 'bg-emerald-600/90 text-white'].join(' ')}>
          {status}
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { weapons, isLoading, fetchWeapons } = useWeaponDb();
  const weaponGroups = useMemo(() => groupWeapons(weapons), [weapons]);
  const [tab,          setTab]          = useState<AdminTab>('coverage');
  const [godRollGroup, setGodRollGroup] = useState<WeaponGroup | null>(null);
  const [tierMode,     setTierMode]     = useState<GodRollMode>('pve');
  const [perkRows,     setPerkRows]     = useState<Record<string, PerkTierRow>>({});
  const [origRows,     setOrigRows]     = useState<Record<string, PerkTierRow>>({});
  const [showDiff,     setShowDiff]     = useState(false);
  const [status,       setStatus]       = useState<string | null>(null);
  const [isDev,        setIsDev]        = useState(true);

  useEffect(() => { fetchWeapons(); }, [fetchWeapons]);

  useEffect(() => {
    fetch('/api/admin/god-roll?weapon=__check__').then((r) => { if (r.status === 403) setIsDev(false); }).catch(() => {});
  }, []);

  // Load all perk tiers globally
  useEffect(() => {
    fetch('/api/admin/perk-tiers').then((r) => r.json()).then((data: Record<string, {
      tier?: string; rank?: number; tags?: string[]; notes?: string;
      pvpTier?: string; pvpRank?: number; pvpTags?: string[]; pvpNotes?: string;
    }>) => {
      const rows: Record<string, PerkTierRow> = {};
      for (const [name, e] of Object.entries(data)) {
        rows[name] = {
          pveTier:  (e.tier      ?? '') as PerkTier | '',
          pveNotes: e.notes      ?? '',
          pveRank:  e.rank  != null ? String(e.rank)  : '',
          pveTags:  (e.tags      ?? []).join(', '),
          pvpTier:  (e.pvpTier   ?? '') as PerkTier | '',
          pvpNotes: e.pvpNotes   ?? '',
          pvpRank:  e.pvpRank != null ? String(e.pvpRank) : '',
          pvpTags:  (e.pvpTags   ?? []).join(', '),
        };
      }
      setPerkRows(rows);
      setOrigRows(rows);
    }).catch(() => {});
  }, []);

  const handlePerkRowChange = useCallback((name: string, row: PerkTierRow) => {
    setPerkRows((r) => ({ ...r, [name]: row }));
  }, []);

  const diffs = useMemo(() => diffPerkRows(origRows, perkRows), [origRows, perkRows]);

  const confirmSaveTiers = async () => {
    setShowDiff(false);
    try {
      const updates: Record<string, unknown> = {};
      for (const [name, row] of Object.entries(perkRows)) {
        updates[name] = {
          tier:     row.pveTier  || null,
          notes:    row.pveNotes || null,
          rank:     row.pveRank  ? Number(row.pveRank)  : null,
          tags:     row.pveTags.split(',').map((t) => t.trim()).filter(Boolean),
          pvpTier:  row.pvpTier  || null,
          pvpNotes: row.pvpNotes || null,
          pvpRank:  row.pvpRank  ? Number(row.pvpRank)  : null,
          pvpTags:  row.pvpTags.split(',').map((t) => t.trim()).filter(Boolean),
        };
      }
      const res = await fetch('/api/admin/perk-tiers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ updates }) });
      if (!res.ok) throw new Error(await res.text());
      setOrigRows({ ...perkRows });
      setStatus('Perk tiers saved!');
    } catch (err) { setStatus(`Error: ${String(err)}`); }
    setTimeout(() => setStatus(null), 3000);
  };

  const goToGodRoll = (g: WeaponGroup) => {
    setGodRollGroup(g);
    setTab('godroll');
  };

  if (!isDev) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-400 font-bold text-lg">Admin — Development Only</p>
          <p className="text-slate-500 text-sm">This page is only accessible in development mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans">
      {showDiff && (
        <DiffModal diffs={diffs} onConfirm={confirmSaveTiers} onCancel={() => setShowDiff(false)} />
      )}

      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">D2 Theorycraft Admin</h1>
            <p className="text-[10px] text-amber-500 font-semibold mt-0.5 uppercase tracking-wider">Dev only · writes to source data files</p>
          </div>
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">← Editor</a>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {([
            { id: 'coverage',  label: 'Coverage' },
            { id: 'godroll',   label: 'God Rolls' },
            { id: 'perktiers', label: `Perk Tiers${diffs.length > 0 ? ` (${diffs.length}✎)` : ''}` },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={['px-4 py-1.5 text-sm rounded-lg font-semibold transition-colors', tab===id ? 'bg-white/10 text-amber-400' : 'text-slate-500 hover:text-slate-200'].join(' ')}>
              {label}
            </button>
          ))}
        </div>

        {isLoading && tab === 'coverage' && <p className="text-[10px] text-slate-600">Loading weapon database…</p>}

        {/* Tab panels */}
        {tab === 'coverage'  && <CoverageTab groups={weaponGroups} onEdit={goToGodRoll} />}
        {tab === 'godroll'   && <GodRollTab groups={weaponGroups} initialGroup={godRollGroup} onGroupChange={setGodRollGroup} />}
        {tab === 'perktiers' && (
          <PerkTiersTab
            rows={perkRows}
            originalRows={origRows}
            tierMode={tierMode}
            setTierMode={setTierMode}
            onChange={handlePerkRowChange}
            onSave={() => setShowDiff(true)}
          />
        )}

      </div>

      {status && (
        <div className={['fixed bottom-6 right-6 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-2xl z-50', status.startsWith('Error') ? 'bg-red-500/90 text-white' : 'bg-emerald-600/90 text-white'].join(' ')}>
          {status}
        </div>
      )}
    </div>
  );
}
