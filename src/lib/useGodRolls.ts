'use client';
import { useState, useEffect } from 'react';
import { GodRollDatabase } from './godRolls';

// Module-level cache so data is only fetched once per page load
let _cache: GodRollDatabase | null = null;
let _promise: Promise<GodRollDatabase> | null = null;

function loadGodRolls(): Promise<GodRollDatabase> {
  if (!_promise) {
    _promise = fetch('/data/god-rolls.json')
      .then((r) => {
        if (!r.ok) throw new Error(`god-rolls fetch failed: ${r.status}`);
        return r.json() as Promise<GodRollDatabase>;
      })
      .then((d) => {
        _cache = d;
        return d;
      });
  }
  return _promise;
}

/**
 * Returns the full PvE god-roll database.
 * The first call triggers a fetch of /data/god-rolls.json; subsequent renders
 * return from the module-level cache instantly.
 */
export function useGodRolls(): { data: GodRollDatabase | null; loading: boolean; error: boolean } {
  const [data, setData] = useState<GodRollDatabase | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (_cache) {
      setData(_cache);
      setLoading(false);
      return;
    }
    let mounted = true;
    loadGodRolls()
      .then((d) => {
        if (mounted) { setData(d); setLoading(false); }
      })
      .catch(() => {
        _promise = null; // allow retry
        if (mounted) { setLoading(false); setError(true); }
      });
    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}
