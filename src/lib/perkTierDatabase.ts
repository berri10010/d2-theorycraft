import tierData from '../data/perkTiers.json';

export type PerkTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PerkTierEntry {
  tier:     PerkTier;
  rank:     number;
  tags:     string[];
  notes:    string;
  // PvP fields — optional, only present when curated
  pvpTier?:  PerkTier;
  pvpRank?:  number;
  pvpTags?:  string[];
  pvpNotes?: string;
}

export const PERK_TIER_DATABASE = tierData as Record<string, PerkTierEntry>;

function resolve(perkName: string): PerkTierEntry | null {
  if (PERK_TIER_DATABASE[perkName]) return PERK_TIER_DATABASE[perkName];
  if (perkName.startsWith('Enhanced ')) {
    const base = perkName.replace(/^Enhanced\s+/, '');
    if (PERK_TIER_DATABASE[base]) return PERK_TIER_DATABASE[base];
  }
  return null;
}

/** Returns the full tier entry for a perk (PvE-centric). Null if not curated. */
export function getPerkTier(perkName: string): PerkTierEntry | null {
  return resolve(perkName);
}

/**
 * Returns the official curated tier for a perk in the given mode.
 * Null if the perk has no curated rating for that mode.
 */
export function getOfficialTier(perkName: string, mode: 'pve' | 'pvp'): PerkTier | null {
  const entry = resolve(perkName);
  if (!entry) return null;
  return mode === 'pvp' ? (entry.pvpTier ?? null) : (entry.tier ?? null);
}

/** Tier display config: colour classes and label for each tier. */
export const TIER_CONFIG: Record<PerkTier, { border: string; badge: string; label: string }> = {
  S: { border: 'border-amber-400',  badge: 'bg-amber-400 text-slate-950',  label: 'S' },
  A: { border: 'border-green-400',  badge: 'bg-green-400 text-slate-950',  label: 'A' },
  B: { border: 'border-blue-400',   badge: 'bg-blue-400 text-slate-950',   label: 'B' },
  C: { border: 'border-slate-400',  badge: 'bg-slate-400 text-slate-950',  label: 'C' },
  D: { border: 'border-slate-600',  badge: 'bg-slate-600 text-slate-200',  label: 'D' },
  E: { border: 'border-slate-700',  badge: 'bg-slate-700 text-slate-400',  label: 'E' },
  F: { border: 'border-slate-800',  badge: 'bg-slate-800 text-slate-500',  label: 'F' },
  G: { border: 'border-red-900',    badge: 'bg-red-900 text-red-400',      label: 'G' },
};
