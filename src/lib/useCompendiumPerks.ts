'use client';
import { useState, useEffect } from 'react';
import { PerkDescriptionDatabase } from './compendium';

let _cache: PerkDescriptionDatabase | null = null;
let _promise: Promise<PerkDescriptionDatabase> | null = null;

function load(): Promise<PerkDescriptionDatabase> {
  if (!_promise) {
    _promise = fetch('/data/perk-descriptions.json')
      .then((r) => { if (!r.ok) throw new Error('perk-descriptions fetch failed'); return r.json() as Promise<PerkDescriptionDatabase>; })
      .then((d) => { _cache = d; return d; })
      .catch(() => {
        _promise = null; // allow retry
        return {} as PerkDescriptionDatabase;
      });
  }
  return _promise;
}

export function useCompendiumPerks(): { data: PerkDescriptionDatabase | null; loading: boolean } {
  const [data, setData] = useState<PerkDescriptionDatabase | null>(_cache);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setData(_cache); setLoading(false); return; }
    let mounted = true;
    load().then((d) => { if (mounted) { setData(d); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}
