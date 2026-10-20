'use client';
import { useEffect, useState } from 'react';

// One fetch per URL per page load, shared by every component that asks for it.
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
  let p = inflight.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} fetch failed: ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((d) => { cache.set(url, d); return d; })
      .catch((e) => { inflight.delete(url); throw e; }); // allow retry
    inflight.set(url, p);
  }
  return p;
}

/** Fetch a static JSON file from /data once and cache it for the page's lifetime. */
export function useStaticJson<T>(url: string): { data: T | null; loading: boolean; error: boolean } {
  const cached = cache.get(url) as T | undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache.has(url)) { setData(cache.get(url) as T); setLoading(false); return; }
    let mounted = true;
    load<T>(url)
      .then((d) => { if (mounted) { setData(d); setLoading(false); } })
      .catch(() => { if (mounted) { setLoading(false); setError(true); } });
    return () => { mounted = false; };
  }, [url]);

  return { data, loading, error };
}

export const usePvpWishlist = () =>
  useStaticJson<import('./pvpWishlist').PvpWishlistDatabase>('/data/pvp-wishlist.json');

export const useWeaponSources = () =>
  useStaticJson<import('./weaponSources').WeaponSourceDatabase>('/data/sources.json');
