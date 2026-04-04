'use client';
import { useState, useEffect } from 'react';
import { ClarityDatabase } from './clarity';

// Module-level cache so the fetch only happens once per page load
let _cache: ClarityDatabase | null = null;
let _promise: Promise<ClarityDatabase> | null = null;

function load(): Promise<ClarityDatabase> {
  if (!_promise) {
    _promise = fetch('/data/clarity.json')
      .then((r) => {
        if (!r.ok) throw new Error('clarity fetch failed');
        return r.json() as Promise<ClarityDatabase>;
      })
      .then((d) => { _cache = d; return d; });
  }
  return _promise;
}

export function useClarityPerks(): { data: ClarityDatabase | null; loading: boolean; error: boolean } {
  const [data, setData] = useState<ClarityDatabase | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (_cache) { setData(_cache); setLoading(false); return; }
    let mounted = true;
    load()
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => {
        _promise = null; // allow retry
        if (mounted) { setLoading(false); setError(true); }
      });
    return () => { mounted = false; };
  }, []);

  return { data, loading, error };
}
