'use client';
import { useMemo } from 'react';
import type { Weapon, GameMode } from '../types/weapon';
import { useGodRolls } from './useGodRolls';
import { usePvpWishlist, usePride } from './useStaticJson';
import { lookupGodRoll, pvpGodRoll, type GodRollEntry } from './godRolls';
import { lookupPvpEntry } from './pvpWishlist';

export interface MetaRollSource {
  /** The recommendation for the weapon in this mode, or null when none of the sources has one. */
  entry: GodRollEntry | null;
  /** Who it comes from, for display. */
  source: string;
  loading: boolean;
}

/**
 * The meta recommendation for a weapon: Aegis's PvE analysis in PvE; in PvP Pride Eternal's sheet
 * (with the CrucibleGuidebook wishlist filling any gaps) unless a PvP roll was curated by hand.
 */
export function useMetaRoll(weapon: Weapon | null, mode: GameMode): MetaRollSource {
  const { data: godRollDb, loading: aegisLoading } = useGodRolls();
  const { data: wishlistDb, loading: wishlistLoading } = usePvpWishlist();
  const { data: prideDb, loading: prideLoading } = usePride();

  return useMemo(() => {
    const loading = aegisLoading || (mode === 'pvp' && (wishlistLoading || prideLoading));
    if (!weapon) return { entry: null, source: '', loading };
    const pve = godRollDb ? lookupGodRoll(godRollDb, weapon) : null;
    if (mode === 'pve') return { entry: pve, source: "Aegis's PvE analysis", loading };

    const pride = prideDb ? lookupGodRoll(prideDb, weapon) : null;
    const wishlist = wishlistDb ? lookupPvpEntry(wishlistDb, weapon) : null;
    const entry = pvpGodRoll(pve, wishlist, pride);
    const curated = !!pve && (pve.pvpPerk1?.length || pve.pvpPerk2?.length || pve.pvpBarrel?.length || pve.pvpMag?.length);
    const source = curated ? 'Curated PvP roll' : pride ? "Pride Eternal's PvP sheet" : 'Community PvP wishlist';
    return { entry, source, loading };
  }, [weapon, mode, godRollDb, wishlistDb, prideDb, aegisLoading, wishlistLoading, prideLoading]);
}
