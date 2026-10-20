export const LS_RECENT_WEAPONS_KEY = 'd2tc_recent_weapons';
export const MAX_RECENT_WEAPONS    = 5;

export function loadRecentWeaponHashes(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_WEAPONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function pushRecentWeaponHash(hash: string, existing: string[]): string[] {
  const next = [hash, ...existing.filter((h) => h !== hash)].slice(0, MAX_RECENT_WEAPONS);
  try { localStorage.setItem(LS_RECENT_WEAPONS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

// ─── Recent searches ──────────────────────────────────────────────────────────

export const LS_RECENT_KEY = 'd2tc_recent_searches';
export const MAX_RECENT    = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function saveRecentSearches(searches: string[]) {
  try { localStorage.setItem(LS_RECENT_KEY, JSON.stringify(searches)); } catch { /* ignore */ }
}
