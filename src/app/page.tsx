'use client';

import React, { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BUNGIE_URL } from '../lib/bungieUrl';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeaponResult {
  hash: string;
  name: string;
  baseName: string;
  variantLabel: string | null;
  icon: string;
  iconWatermark: string | null;
  damageType: string;
  ammoType: number;
  rarity: string | null;
  itemTypeDisplayName: string;
  seasonName: string | null;
  seasonNumber: number | null;
}

interface WeaponGroupResult {
  baseName: string;
  /** Best variant first (base > Adept > Timelost > Harrowed) */
  default: WeaponResult;
  variants: WeaponResult[];
}

interface GodRollEntry {
  weaponType: string;
  season: string | null;
  energy: string | null;
  frame: string | null;
  barrel: string[];
  mag: string[];
  perk1: string[];
  perk2: string[];
  originTrait: string | null;
  notes: string | null;
  rank: number | null;
  tier: string | null;
}

// ── Event watermark → display label ──────────────────────────────────────────
//
// These watermarks belong to seasonal events (Dawning, FotL, Solstice) or
// dedicated raid/expansion content whose watermarks are not tracked in the
// DIM watermark-to-season map. We map them to human-readable labels so the
// UI never displays a blank season field for these weapons.

const EVENT_WATERMARKS: Record<string, string> = {
  '50c3ebe414c6946429934d79504922fa': 'Dawning',
  '83fbcacd223402c09af4b7ab067f8cce': 'Dawning',
  '53dc0b02306726ff1517af33ac908cef': 'Festival of the Lost',
  '9c091ec0e22c01dacc25efb63b46eb9b': 'Solstice',
  'fe8bcc20fbfaf4cac69dfb640bb0b84e': 'Vow of the Disciple',
};

function eventLabelFor(iconWatermark: string | null): string | null {
  if (!iconWatermark) return null;
  const filename = iconWatermark.split('/').pop() ?? '';
  const hash = filename.replace('.png', '');
  return EVENT_WATERMARKS[hash] ?? null;
}

/** Returns the best available season label: seasonName → event label → null */
function seasonLabel(w: WeaponResult): string | null {
  return w.seasonName ?? eventLabelFor(w.iconWatermark);
}

// ── Variant priority (lower = shown first) ────────────────────────────────────
const VARIANT_PRIORITY = ['Adept', 'Timelost', 'Harrowed', 'Brave'];
function variantPriority(v: WeaponResult): number {
  if (!v.variantLabel) return -1;
  const idx = VARIANT_PRIORITY.indexOf(v.variantLabel);
  return idx === -1 ? VARIANT_PRIORITY.length : idx;
}

// ── Group flat weapon list into families ──────────────────────────────────────
function groupWeapons(weapons: WeaponResult[]): WeaponGroupResult[] {
  const map = new Map<string, WeaponResult[]>();
  for (const w of weapons) {
    const bucket = map.get(w.baseName);
    if (bucket) bucket.push(w);
    else map.set(w.baseName, [w]);
  }
  const groups: WeaponGroupResult[] = [];
  map.forEach((variants, baseName) => {
    variants.sort((a, b) => variantPriority(a) - variantPriority(b));
    groups.push({ baseName, default: variants[0], variants });
  });
  return groups;
}

// ── Ranked search over groups ─────────────────────────────────────────────────
function rankGroup(g: WeaponGroupResult, q: string): number {
  const name = g.baseName.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.split(/\s+/).some(word => word.startsWith(q))) return 1;
  if (name.includes(q)) return 2;
  return 999;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const VARIANT_COLOURS: Record<string, string> = {
  Adept:    'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/35',
  Timelost: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/35',
  Harrowed: 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/35',
  Brave:    'bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/35',
};

const DAMAGE_COLORS: Record<string, string> = {
  kinetic: 'text-slate-300',
  solar:   'text-orange-400',
  arc:     'text-blue-400',
  void:    'text-purple-400',
  stasis:  'text-cyan-400',
  strand:  'text-emerald-400',
};

const AMMO_LABELS: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const AMMO_COLORS: Record<number, string> = {
  1: 'text-green-400',
  2: 'text-purple-400',
  3: 'text-yellow-400',
};

const TIER_COLORS: Record<string, string> = {
  S: 'bg-amber-400 text-slate-950',
  A: 'bg-green-400 text-slate-950',
  B: 'bg-blue-400 text-slate-950',
  C: 'bg-slate-500 text-white',
  D: 'bg-slate-600 text-slate-300',
  E: 'bg-slate-700 text-slate-400',
  F: 'bg-slate-800 text-slate-500',
};

// ── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'TTK Math',
    desc: 'Precise time-to-kill for PvE and PvP. Stack damage buffs, tune resilience, and find the fastest kill pattern.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'God Rolls',
    desc: 'S/A/B/C tier perk ratings and community roll recommendations via TheAegisRelic.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Roll Editor',
    desc: 'Select perks, masterwork, and mods. See live stat changes and enhanced perk upgrades instantly.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: 'Share Builds',
    desc: 'Lock in your perks, masterwork, and buffs, then share the exact roll with a single link.',
  },
];

// ── Redirect handler (for old share links that used /?w=...) ─────────────────

function ShareLinkRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('w')) {
      router.replace(`/editor?${searchParams.toString()}`);
    }
  }, [searchParams, router]);
  return null;
}

// ── Weapon search component ───────────────────────────────────────────────────

interface WeaponSearchProps {
  groups: WeaponGroupResult[];
  loaded: boolean;
  loadError: boolean;
  onRetry: () => void;
}

function WeaponSearch({ groups, loaded, loadError, onRetry }: WeaponSearchProps) {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !loaded) return [];
    const scored = groups
      .map(g => ({ g, rank: rankGroup(g, q) }))
      .filter(({ rank }) => rank < 999);
    scored.sort((a, b) => a.rank - b.rank || a.g.baseName.localeCompare(b.g.baseName));
    return scored.slice(0, 8).map(({ g }) => g);
  }, [query, groups, loaded]);

  useEffect(() => {
    setOpen(results.length > 0);
    setFocused(-1);
  }, [results]);

  const go = (hash: string) => router.push(`/editor?w=${hash}`);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(f => Math.min(f + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, 0));
    } else if (e.key === 'Enter' && focused >= 0) {
      e.preventDefault();
      go(results[focused].default.hash);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <svg
          viewBox="0 0 20 20" fill="currentColor"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={loadError ? 'Failed to load weapons' : loaded ? `Search ${groups.length}+ weapons…` : 'Loading weapons…'}
          disabled={!loaded || loadError}
          className={[
            'w-full bg-white/8 border rounded-xl pl-12 pr-4 py-4 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-white/10 transition-all disabled:opacity-40',
            loadError ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/15 focus:border-amber-500/60',
          ].join(' ')}
          autoComplete="off"
        />
        {!loaded && !loadError && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-600 border-t-amber-500 rounded-full animate-spin" />
        )}
      </div>

      {/* Error state */}
      {loadError && (
        <div className="mt-3 flex items-center justify-between gap-3 bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">Couldn&apos;t load weapon data. The site may need to be redeployed.</p>
          <button
            onClick={onRetry}
            className="shrink-0 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 hover:border-amber-400/50 px-3 py-1.5 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results dropdown */}
      {open && (
        <ul
          ref={listRef}
          className="absolute z-[100] left-0 right-0 top-full mt-2 bg-[#0d0d0d] border border-white/10 rounded-xl overflow-y-auto shadow-2xl max-h-[420px]"
        >
          {results.map((group, i) => {
            const w = group.default;
            const altVariants = group.variants.filter(v => v.variantLabel);
            const sl = seasonLabel(w);

            return (
              <li key={group.baseName}>
                <button
                  onMouseDown={() => go(w.hash)}
                  onMouseEnter={() => setFocused(i)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    focused === i ? 'bg-white/8' : 'hover:bg-white/5',
                  ].join(' ')}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0 border border-white/10">
                    <img
                      src={BUNGIE_URL + w.icon}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${w.rarity === 'Exotic' ? 'text-yellow-400' : 'text-slate-100'}`}>
                        {group.baseName}
                      </p>
                      {altVariants.map(v => (
                        <button
                          key={v.hash}
                          onMouseDown={e => { e.stopPropagation(); go(v.hash); }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${VARIANT_COLOURS[v.variantLabel!] ?? 'bg-white/10 text-slate-400 border-white/20 hover:bg-white/20'}`}
                        >
                          {v.variantLabel}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className={DAMAGE_COLORS[w.damageType] ?? 'text-slate-400'}>
                        {w.damageType.charAt(0).toUpperCase() + w.damageType.slice(1)}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className={AMMO_COLORS[w.ammoType] ?? 'text-slate-400'}>
                        {AMMO_LABELS[w.ammoType] ?? ''}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span>{w.itemTypeDisplayName}</span>
                      {sl && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span>{sl}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600 shrink-0">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Featured God Rolls ────────────────────────────────────────────────────────

function FeaturedGodRolls({
  groups,
  godRolls,
}: {
  groups: WeaponGroupResult[];
  godRolls: Record<string, GodRollEntry> | null;
}) {
  const router = useRouter();

  const featured = useMemo(() => {
    if (!godRolls || !groups.length) return [];

    const byName = new Map(groups.map(g => [g.baseName.toLowerCase(), g]));

    const sorted = (Object.entries(godRolls) as [string, GodRollEntry][])
      .filter(([, r]) => r.season && parseInt(r.season) > 0)
      .sort(([, a], [, b]) => (parseInt(b.season!) || 0) - (parseInt(a.season!) || 0));

    const result: Array<{ name: string; group: WeaponGroupResult; roll: GodRollEntry }> = [];
    for (const [name, roll] of sorted) {
      if (result.length >= 6) break;
      const group = byName.get(name.toLowerCase());
      if (group) result.push({ name, group, roll });
    }
    return result;
  }, [godRolls, groups]);

  // Skeleton while data loads
  if (godRolls === null) {
    return (
      <section className="relative z-10 px-6 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="h-5 w-44 bg-white/8 rounded animate-pulse mb-2" />
              <div className="h-3.5 w-64 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="relative z-10 px-6 pb-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">Featured God Rolls</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest weapon additions and their recommended perks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map(({ name, group, roll }) => {
            const w = group.default;
            const sl = seasonLabel(w) ?? (roll.season ? `Season ${roll.season}` : null);
            const perks = [...roll.perk1.slice(0, 1), ...roll.perk2.slice(0, 1)];

            return (
              <button
                key={name}
                onClick={() => router.push(`/editor?w=${w.hash}`)}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 hover:border-white/15 transition-colors text-left flex flex-col gap-3 group"
              >
                {/* Header: icon + name + tier */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    <img src={BUNGIE_URL + w.icon} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm leading-tight truncate ${w.rarity === 'Exotic' ? 'text-yellow-400' : 'text-slate-100'}`}>
                        {name}
                      </p>
                      {roll.tier && TIER_COLORS[roll.tier] && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${TIER_COLORS[roll.tier]}`}>
                          {roll.tier}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      <span className={DAMAGE_COLORS[w.damageType] ?? 'text-slate-400'}>
                        {w.damageType.charAt(0).toUpperCase() + w.damageType.slice(1)}
                      </span>
                      {' · '}
                      {roll.weaponType}
                      {sl && ` · ${sl}`}
                    </p>
                  </div>
                </div>

                {/* Perk pills */}
                {perks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {perks.map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white/8 border border-white/10 rounded px-2 py-0.5 text-slate-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action */}
                <div className="flex justify-end mt-auto">
                  <span className="text-[10px] font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                    View Roll →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const [weaponGroups, setWeaponGroups] = useState<WeaponGroupResult[]>([]);
  const [weaponLoaded, setWeaponLoaded] = useState(false);
  const [weaponError, setWeaponError]   = useState(false);
  const [godRolls, setGodRolls]         = useState<Record<string, GodRollEntry> | null>(null);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const loadWeapons = useCallback(() => {
    setWeaponError(false);
    setWeaponLoaded(false);
    const fetchChunk = async (name: string) => {
      const res = await fetch(name);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<WeaponResult[]>;
    };
    Promise.all([fetchChunk('/data/weapons-0.json'), fetchChunk('/data/weapons-1.json'), fetchChunk('/data/weapons-2.json')])
      .then(([c0, c1, c2]) => { setWeaponGroups(groupWeapons([...c0, ...c1, ...c2])); setWeaponLoaded(true); })
      .catch(() => { setWeaponLoaded(true); setWeaponError(true); });
  }, []);

  useEffect(() => { loadWeapons(); }, [loadWeapons]);

  useEffect(() => {
    fetch('/data/god-rolls.json')
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, GodRollEntry> | null) => { if (data) setGodRolls(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans flex flex-col overflow-x-hidden">

      {/* Redirect handler for legacy share links */}
      <Suspense fallback={null}>
        <ShareLinkRedirector />
      </Suspense>

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="font-bold text-base tracking-tight text-white">D2 Theorycraft</span>
      </nav>

      {/* Hero + search */}
      <section className="relative z-20 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 flex-1">

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-none mb-4">
          Build the <span className="text-amber-400">perfect</span><br />weapon roll.
        </h1>

        <p className="text-base md:text-lg text-slate-500 max-w-md mb-10">
          Search for any weapon to get started.
        </p>

        <WeaponSearch
          groups={weaponGroups}
          loaded={weaponLoaded}
          loadError={weaponError}
          onRetry={loadWeapons}
        />

        <p className="text-xs text-slate-700 mt-5">
          Or{' '}
          <Link href="/editor" className="text-slate-500 hover:text-amber-400 transition-colors underline underline-offset-2">
            browse all weapons in the editor
          </Link>
        </p>
      </section>

      {/* Featured God Rolls */}
      <FeaturedGodRolls groups={weaponGroups} godRolls={godRolls} />

      {/* Tools & Features (collapsible) */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setFeaturesOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 py-3 border-t border-white/5 group"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tools &amp; Features
            </span>
            <svg
              viewBox="0 0 20 20" fill="currentColor"
              className={[
                'w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-all',
                featuresOpen ? 'rotate-180' : '',
              ].join(' ')}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {featuresOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 pb-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 hover:border-white/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center space-y-1">
        <p className="text-xs text-slate-600">
          Weapon data via{' '}
          <a href="https://bungie.net" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            Bungie API
          </a>
          {' · '}God roll analysis by{' '}
          <a href="https://twitter.com/theaegisrelic" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            TheAegisRelic
          </a>
        </p>
        <p className="text-xs text-slate-600">
          Perk descriptions from{' '}
          <a href="https://d2clarity.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            Clarity
          </a>
          {' · '}Description feedback via{' '}
          <a href="https://d2clarity.com/discord" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">
            Clarity Discord
          </a>
        </p>
        <p className="text-xs text-slate-700">Not affiliated with or endorsed by Bungie, Inc.</p>
      </footer>

    </div>
  );
}
