/**
 * Link previews for shared rolls. Chat apps and social sites read a link's Open Graph tags without running any
 * JavaScript, and the site is a static export, so every /editor link would otherwise look the same. The Cloudflare
 * worker (worker.ts) looks the weapon up in a tiny per-weapon file (written at build time by
 * scripts/build-share-data.ts) and rewrites the page head with a title, a description of the roll and the weapon's
 * picture. Everything here is plain functions so it can be tested without a worker.
 */
import type { Weapon } from '../types/weapon';
import { BUNGIE_URL } from './bungieUrl';

/** What the worker needs to know about one weapon, kept short because it is fetched per request. */
export interface ShareRecord {
  /** Name. */
  n: string;
  /** Weapon type, e.g. "Hand Cannon". */
  t: string;
  /** Damage type, lower case ("solar"), or null for kinetic. */
  e: string | null;
  /** Rarity, e.g. "Exotic". */
  r: string | null;
  /** Variant label, e.g. "Adept". */
  v: string | null;
  /** Picture: the screenshot, else the icon, as an absolute URL. */
  s: string | null;
  /** Perk hash -> name, for every perk the weapon can roll (plain and enhanced). */
  p: Record<string, string>;
  /** The masterwork stats this weapon can have, so a link's `mw` text can be checked before it is shown. */
  m: string[];
}

export function shareRecord(weapon: Weapon): ShareRecord {
  const p: Record<string, string> = {};
  for (const col of weapon.perkSockets) {
    for (const perk of col.perks) {
      p[perk.hash] = perk.name;
      if (perk.enhancedVersion) p[perk.enhancedVersion.hash] = perk.enhancedVersion.name;
    }
  }
  return {
    n: weapon.name,
    t: weapon.itemTypeDisplayName,
    e: weapon.damageType && weapon.damageType !== 'kinetic' ? weapon.damageType : null,
    r: weapon.rarity,
    v: weapon.variantLabel,
    s: weapon.screenshot ?? (weapon.icon ? BUNGIE_URL + weapon.icon : null),
    p,
    m: weapon.masterworkOptions ?? [],
  };
}

export interface Preview {
  title: string;
  description: string;
  image: string | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A title, description and picture for a shared roll, from the weapon record and the link's query string. */
export function buildPreview(rec: ShareRecord, params: URLSearchParams): Preview {
  const mode = params.get('m') === 'pvp' ? 'PvP' : 'PvE';
  const perks = (params.get('p') ?? '').split(',').map((h) => rec.p[h]).filter((n): n is string => !!n);
  const unique = [...new Set(perks)];

  const kind = [rec.t, rec.e ? cap(rec.e) : null, rec.r === 'Exotic' ? 'Exotic' : null, rec.v].filter(Boolean).join(' · ');
  const parts = [kind];
  if (unique.length) parts.push(`Roll: ${unique.slice(0, 8).join(' / ')}`);
  const mw = params.get('mw');
  if (mw && rec.m?.includes(mw)) parts.push(`Masterwork: ${mw}`); // never print text from the link that is not a real option
  if (params.get('cat') === '1') parts.push('Catalyst complete');
  const buffs = (params.get('b') ?? '').split(',').filter(Boolean).length;
  if (buffs) parts.push(`${buffs} external buff${buffs === 1 ? '' : 's'}`);

  return {
    title: `${rec.n} · ${mode} roll · D2 Theorycraft`,
    description: parts.join(' — ') + `. Tweak it, see the stats and time to kill.`,
    image: rec.s,
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The Open Graph and Twitter tags for a preview, as one HTML string to append to the page head. */
export function previewMetaTags(preview: Preview, url: string): string {
  const t = (name: string, content: string) => `<meta property="${name}" content="${escapeHtml(content)}"/>`;
  const n = (name: string, content: string) => `<meta name="${name}" content="${escapeHtml(content)}"/>`;
  return [
    t('og:type', 'website'),
    t('og:site_name', 'D2 Theorycraft'),
    t('og:title', preview.title),
    t('og:description', preview.description),
    t('og:url', url),
    ...(preview.image ? [t('og:image', preview.image), n('twitter:image', preview.image)] : []),
    n('twitter:card', preview.image ? 'summary_large_image' : 'summary'),
    n('twitter:title', preview.title),
    n('twitter:description', preview.description),
  ].join('');
}

/** A weapon hash from a link's `w` parameter: digits only, so it is safe to put in a file path. */
export function weaponHashParam(params: URLSearchParams): string | null {
  const w = params.get('w');
  return w && /^\d{1,12}$/.test(w) ? w : null;
}
