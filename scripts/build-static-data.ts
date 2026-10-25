/**
 * Build-time data generation script.
 *
 * Runs BEFORE `next build` via the `prebuild` npm script.
 * Fetches all external data sources and writes static JSON files into
 * public/data/ so the fully-static Next.js export can serve them as
 * plain CDN assets — no server or API routes needed at runtime.
 *
 * Usage (automatic via package.json):
 *   npm run build
 *     → runs this script first (prebuild)
 *     → then runs next build
 *
 * Required environment variable:
 *   BUNGIE_API_KEY  — your Bungie developer API key
 *
 * Outputs:
 *   public/data/weapons.json          Packed weapons (perks/mods referenced by hash)
 *   public/data/perks.json            Each distinct perk once (description stripped)
 *   public/data/mods.json             Each distinct weapon mod once
 *   public/data/statgroups.json       Bungie raw → display stat curves, per stat group
 *   public/data/pvp-wishlist.json     r/CrucibleGuidebook community PvP recommendations, per weapon
 *   public/data/sources.json          Where each weapon drops (Sax's Monument of Triumph loot sheet)
 *   public/data/clarity.json          Filtered Clarity perk descriptions
 *   public/data/god-rolls.json        God roll recommendations
 *
 * Note: perk.description is stripped from the weapon data to keep it small.
 * Clarity covers perk descriptions at runtime.  See
 * src/lib/weaponPack.ts for the packed format.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseWeapons } from '../src/lib/bungie/parser.js';
import { packWeapons, unpackWeapons, type PackedWeapon } from '../src/lib/weaponPack.js';
import { PVP_WISHLIST_URL, parseWishlistBlocks, buildPvpEntries } from '../src/lib/pvpWishlist.js';
import { SAX_SHEET_ID, SAX_TABS, buildSourceTable, type SaxTab } from '../src/lib/weaponSources.js';
import {
  WEAPON_STAT_SHEET_ID, WEAPON_STAT_CHART_GID, WEAPON_DATA_GID, parseWeaponStatSheet, mergeWeaponStats, sheetIsMidUpdate,
} from '../src/lib/weaponStatSheet.js';
import type { WeaponStatEntry } from '../src/lib/weaponStats.js';
import { PRIDE_SHEET_ID, PRIDE_LEGENDARY_GID, PRIDE_EXOTIC_GID, PRIDE_STATUS_GID, parsePrideSheet, rekeyToWeapons, snapPerkNames } from '../src/lib/prideSheet.js';
import type { Weapon, Perk } from '../src/types/weapon.js';
import type { BungieSeasonDefinition, BungieStatGroupDefinition } from '../src/lib/bungie/bungieTypes.js';

// ── Path helpers ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// Load .env.local if present and BUNGIE_API_KEY is not set
if (!process.env.BUNGIE_API_KEY) {
  try {
    const envPath = path.join(ROOT, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    // Ignore env loading errors
  }
}

const OUT_DIR    = path.join(ROOT, 'public', 'data');

function outPath(name: string) { return path.join(OUT_DIR, name); }
function write(name: string, data: unknown) {
  fs.writeFileSync(outPath(name), JSON.stringify(data), 'utf-8');
  const bytes = fs.statSync(outPath(name)).size;
  console.log(`  ✓ ${name} (${(bytes / 1024).toFixed(1)} KB)`);
}

// ── Manifest version cache ────────────────────────────────────────────────────
//
// The Bungie manifest DB is ~24 MB.  We cache the last-seen version string in
// .next/cache/bungie-manifest-version and skip the heavy table downloads when
// the version hasn't changed.
//
// Cache location: .next/cache/ — Cloudflare Pages (and most CI platforms)
// restore this directory from the build output cache before each build run,
// so this file survives across deployments as long as the cache is warm.
//
// DATA_FORMAT_VERSION: bump this whenever parser logic changes in a way that
// would produce different weapon data output from the same manifest.
// This forces a re-parse even when the Bungie manifest version is unchanged.
const DATA_FORMAT_VERSION = '21';

const NEXT_CACHE_DIR     = path.join(ROOT, '.next', 'cache');
const MANIFEST_VER_CACHE = path.join(NEXT_CACHE_DIR, 'bungie-manifest-version');

function readCachedManifestVersion(): string | null {
  try {
    return fs.readFileSync(MANIFEST_VER_CACHE, 'utf-8').trim();
  } catch {
    return null; // cache file doesn't exist yet — first build
  }
}

function writeCachedManifestVersion(version: string): void {
  fs.mkdirSync(NEXT_CACHE_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_VER_CACHE, `${DATA_FORMAT_VERSION}:${version}`, 'utf-8');
}

// ── Bungie API helpers ────────────────────────────────────────────────────────

const BUNGIE_ROOT = 'https://www.bungie.net';

function apiKey(): string {
  const k = process.env.BUNGIE_API_KEY;
  if (!k) throw new Error('BUNGIE_API_KEY env var is not set');
  return k;
}

async function bungieGet(url: string) {
  const res = await fetch(url, { headers: { 'X-API-Key': apiKey() } });
  if (!res.ok) throw new Error(`Bungie fetch failed (${res.status}): ${url}`);
  return res.json();
}

async function fetchTable(relativePath: string) {
  const res = await fetch(BUNGIE_ROOT + relativePath);
  if (!res.ok) throw new Error(`Table fetch failed (${res.status}): ${relativePath}`);
  return res.json();
}

// ── Screenshot URL validation ─────────────────────────────────────────────────
//
// Multiple weapon entries can share the same baseName, season, and variantLabel
// (Bungie sometimes publishes several "versions" of the same weapon).  When
// selectDefault() must break the tie it prefers the variant with a live
// screenshot URL.  We HEAD-check only the small set of URLs that are actually
// involved in such tie-breaks and null out any that return non-200, so the
// client-side algorithm can rely on `screenshot !== null` as a reliable signal.

async function validateTieBreakerScreenshots(weapons: Weapon[]): Promise<Weapon[]> {
  // Identify screenshot URLs that are actual tie-breaking candidates.
  const byBase = new Map<string, Weapon[]>();
  for (const w of weapons) {
    const list = byBase.get(w.baseName) ?? [];
    list.push(w);
    byBase.set(w.baseName, list);
  }

  const urlsToCheck = new Set<string>();
  for (const variants of byBase.values()) {
    const maxSeason = Math.max(...variants.map(v => v.seasonNumber ?? 0));
    let candidates = variants.filter(v => (v.seasonNumber ?? 0) === maxSeason);
    const baseOnly = candidates.filter(v => v.variantLabel === null);
    if (baseOnly.length > 0) candidates = baseOnly;
    if (candidates.length > 1) {
      for (const w of candidates) {
        if (w.screenshot) urlsToCheck.add(w.screenshot);
      }
    }
  }

  if (urlsToCheck.size === 0) return weapons;
  console.log(`  Validating ${urlsToCheck.size} tie-breaker screenshot URLs...`);

  // HEAD-check in batches of 20 with a 5-second timeout per request.
  const broken = new Set<string>();
  const urls = [...urlsToCheck];
  const BATCH = 20;
  for (let i = 0; i < urls.length; i += BATCH) {
    await Promise.all(
      urls.slice(i, i + BATCH).map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (!res.ok) broken.add(url);
        } catch {
          broken.add(url);
        }
      })
    );
  }

  if (broken.size > 0) {
    console.log(`  ✓ Nulled ${broken.size} broken screenshot URL(s): ${[...broken].map(u => u.split('/').pop()).join(', ')}`);
    return weapons.map(w =>
      w.screenshot && broken.has(w.screenshot) ? { ...w, screenshot: null } : w
    );
  }
  console.log(`  ✓ All ${urlsToCheck.size} screenshot URLs valid`);
  return weapons;
}

// ── Strip perk descriptions ───────────────────────────────────────────────────
//
// perk.description (Bungie manifest text) is the largest text field per perk.
// Clarity covers descriptions at runtime, so we strip this field
// before writing to keep each chunk under the Cloudflare 25 MiB asset limit.

function stripPerk(perk: Perk): Perk {
  return {
    ...perk,
    description: '',
    enhancedVersion: perk.enhancedVersion ? stripPerk(perk.enhancedVersion) : null,
  };
}

function stripDescriptions(weapons: Weapon[]): Weapon[] {
  return weapons.map((w) => ({
    ...w,
    intrinsicTrait: w.intrinsicTrait ? stripPerk(w.intrinsicTrait) : null,
    perkSockets: w.perkSockets.map((col) => ({
      ...col,
      perks: col.perks.map(stripPerk),
    })),
  }));
}

const WEAPON_FILES = ['weapons.json', 'perks.json', 'mods.json', 'statgroups.json'];

// ── Step 1: Weapons ───────────────────────────────────────────────────────────

async function buildWeapons() {
  console.log('\n[weapons] Fetching Bungie manifest...');

  // Fetch the lightweight manifest metadata first (~2 KB, always fast).
  const manifest = await bungieGet(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`);
  const version  = manifest.Response.version as string;
  const paths    = manifest.Response.jsonWorldComponentContentPaths.en as Record<string, string>;
  console.log(`  Manifest version: ${version}`);

  // ── Cache check: skip the ~24 MB table download if version unchanged ──────
  const cacheKey = `${DATA_FORMAT_VERSION}:${version}`;
  const cachedVersion = readCachedManifestVersion();
  if (cachedVersion === cacheKey && WEAPON_FILES.every((f) => fs.existsSync(outPath(f)))) {
    console.log(`  ✓ Manifest unchanged since last build — skipping table download`);
    console.log(`    (delete .next/cache/bungie-manifest-version to force a refresh)`);
    return;
  }
  if (cachedVersion && cachedVersion !== cacheKey) {
    console.log(`  Cache miss: ${cachedVersion} → ${cacheKey}`);
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log('  Downloading tables (parallel)...');
  const [items, socketCategoryDefs, plugSetDefs, seasonDefs, collectibleDefs, statGroupDefs, dimWatermarkMap] = await Promise.all([
    fetchTable(paths.DestinyInventoryItemDefinition),
    fetchTable(paths.DestinySocketCategoryDefinition),
    fetchTable(paths.DestinyPlugSetDefinition),
    fetchTable(paths.DestinySeasonDefinition),
    fetchTable(paths.DestinyCollectibleDefinition),
    fetchTable(paths.DestinyStatGroupDefinition),
    fetch('https://raw.githubusercontent.com/DestinyItemManager/d2-additional-info/master/output/watermark-to-season.json')
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({})),
  ]);

  // Artifact watermark → season number (fallback for seasons not yet in DIM map)
  const artifactWatermarkMap: Record<string, number> = {};
  const seasonDefValues = Object.values(seasonDefs) as BungieSeasonDefinition[];
  for (const season of seasonDefValues) {
    if (!season.artifactItemHash || !season.seasonNumber) continue;
    const artifact = (items as any)[season.artifactItemHash.toString()];
    if (artifact?.iconWatermark) {
      artifactWatermarkMap[artifact.iconWatermark] = season.seasonNumber;
    }
  }
  const combinedWatermarkMap = { ...artifactWatermarkMap, ...dimWatermarkMap };
  console.log(`  Watermark map: ${Object.keys(dimWatermarkMap).length} DIM + ${Object.keys(artifactWatermarkMap).length} artifact entries`);

  // Build collectibleHash → sourceString map for weapon acquisition info
  const collectibleMap: Record<string, string> = {};
  for (const coll of Object.values(collectibleDefs as Record<string, { hash?: number; sourceString?: string }>)) {
    if (coll.hash && coll.sourceString?.trim()) {
      collectibleMap[coll.hash.toString()] = coll.sourceString.trim();
    }
  }
  console.log(`  Collectibles: ${Object.keys(collectibleMap).length} entries with sourceString`);

  console.log('  Parsing weapons...');
  const rawWeapons = parseWeapons(items, socketCategoryDefs, plugSetDefs, seasonDefs, combinedWatermarkMap, collectibleMap, statGroupDefs as Record<string, BungieStatGroupDefinition>);
  console.log(`  Parsed ${rawWeapons.length} weapons`);

  // Null out 404 screenshot URLs for tie-breaking candidates before writing.
  const weapons = await validateTieBreakerScreenshots(rawWeapons);

  // Strip perk descriptions, then store each distinct perk / mod once.
  const pack = packWeapons(stripDescriptions(weapons));
  write('weapons.json', pack.weapons);
  write('perks.json', pack.perks);
  write('mods.json', pack.mods);
  write('statgroups.json', pack.statGroups);

  // Persist the version so the next build can skip this download if unchanged.
  writeCachedManifestVersion(version);
  console.log(`  Cached manifest version for next build`);
}

// ── Step 2: Clarity perk descriptions ────────────────────────────────────────

async function buildClarity() {
  console.log('\n[clarity] Fetching Clarity database...');
  const res = await fetch(
    'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/master/descriptions/clarity.json'
  );
  if (!res.ok) throw new Error(`Clarity fetch failed: ${res.status}`);
  const full = await res.json() as Record<string, any>;

  // Filter to weapon-relevant entries only
  const filtered: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(full)) {
    const t = (entry.type ?? '') as string;
    if (t.includes('Weapon') || t.includes('Origin Trait') || t.includes('Intrinsic')) {
      filtered[key] = entry;
    }
  }
  console.log(`  ${Object.keys(filtered).length} / ${Object.keys(full).length} entries kept (weapon-relevant)`);
  write('clarity.json', filtered);
}

// ── Step 3: God rolls (Google Sheets) ────────────────────────────────────────
//
// Column layout (Season 29 sheet revision — 18 columns):
//   [0]  WEAPON image  [1]  Name        [2]  Season     [3]  Energy
//   [4]  Frame         [5]  Source       [6]  Stun       [7]  Ammo
//   [8]  ⬆️            [9]  Barrel       [10] Mag        [11] MW
//   [12] Perk 1        [13] Perk 2       [14] Origin     [15] Notes
//   [16] Rank #        [17] Tier
//
// Uses the gviz JSON endpoint (not CSV) so multi-line quoted cells — perk
// options are newline-delimited in the sheet — parse correctly.

const SHEET_ID = '1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY';
const WEAPON_TABS = [
  'Autos','Bows','HCs','Pulses','Scouts','Sidearms','SMGs','BGLs',
  'Fusions','Glaives','Shotguns','Snipers','Rocket Sidearms','Traces',
  'HGLs','LFRs','LMGs','Rockets','Swords','Other','Exotic Weapons',
];
const TAB_TO_TYPE: Record<string, string> = {
  Autos:'Auto Rifle', Bows:'Bow', HCs:'Hand Cannon', Pulses:'Pulse Rifle',
  Scouts:'Scout Rifle', Sidearms:'Sidearm', SMGs:'Submachine Gun',
  BGLs:'Breech Grenade Launcher', Fusions:'Fusion Rifle', Glaives:'Glaive',
  Shotguns:'Shotgun', Snipers:'Sniper Rifle', 'Rocket Sidearms':'Rocket Sidearm',
  Traces:'Trace Rifle', HGLs:'Heavy Grenade Launcher', LFRs:'Linear Fusion Rifle',
  LMGs:'Machine Gun', Rockets:'Rocket Launcher', Swords:'Sword',
  Other:'Other', 'Exotic Weapons':'Exotic',
};

type GvizCell = { v: string | number | null; f?: string } | null;

function gvizCellStr(cell: GvizCell): string {
  if (!cell || cell.v == null) return '';
  return String(cell.v).trim();
}

function gvizSplitOptions(cell: GvizCell): string[] {
  const s = gvizCellStr(cell);
  if (!s) return [];
  const parts = s.includes('\n') ? s.split('\n') : s.split(',');
  return parts.map(p => p.trim()).filter(Boolean);
}

async function fetchGvizTab(tab: string): Promise<GvizCell[][] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const raw = await res.text();
  // Strip JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonStr = raw.replace(/^[^{]+/, '').replace(/\);?\s*$/, '');
  const data = JSON.parse(jsonStr) as { table?: { rows?: Array<{ c: GvizCell[] }> } };
  return data.table?.rows?.map(r => r.c) ?? null;
}

async function buildGodRolls() {
  // If god-rolls.json was committed to the repo (e.g. refreshed via
  // `npm run refresh-god-rolls`), use it as-is and skip the fetch.
  if (fs.existsSync(outPath('god-rolls.json'))) {
    const existing = JSON.parse(fs.readFileSync(outPath('god-rolls.json'), 'utf8'));
    console.log(`\n[god-rolls] Using committed file (${Object.keys(existing).length} entries) — skipping Google Sheets fetch.`);
    console.log(`    (run \`npm run refresh-god-rolls\` to pull fresh data from TheAegisRelic's sheet)`);
    return;
  }

  console.log('\n[god-rolls] Fetching Google Sheets tabs (gviz JSON)...');
  const db: Record<string, unknown> = {};
  let tabCount = 0;

  await Promise.all(
    WEAPON_TABS.map(async (tab) => {
      try {
        const rows = await fetchGvizTab(tab);
        if (!rows) return;
        for (const c of rows) {
          const name = gvizCellStr(c[1]);
          if (!name || name === 'Name') continue;
          db[name] = {
            weaponType:  TAB_TO_TYPE[tab] ?? tab,
            season:      gvizCellStr(c[2]) || null,
            energy:      gvizCellStr(c[3]) || null,
            frame:       gvizCellStr(c[4]) || null,
            source:      gvizCellStr(c[5]) || null,
            barrel:      gvizSplitOptions(c[9]),
            mag:         gvizSplitOptions(c[10]),
            mw:          gvizCellStr(c[11]) || null,
            perk1:       gvizSplitOptions(c[12]),
            perk2:       gvizSplitOptions(c[13]),
            originTrait: gvizCellStr(c[14]) || null,
            notes:       gvizCellStr(c[15]) || null,
            rank:        c[16]?.v != null ? Number(c[16].v) || null : null,
            tier:        gvizCellStr(c[17]) || null,
          };
        }
        tabCount++;
      } catch {
        console.warn(`  ⚠ Failed to load tab: ${tab}`);
      }
    })
  );

  console.log(`  ${Object.keys(db).length} entries from ${tabCount}/${WEAPON_TABS.length} tabs`);
  write('god-rolls.json', db);
}

// ── Step 4: Back-fill seasonNumber from god-rolls for event weapons ───────────
// Event weapons (Dawning, Solstice, FotL, etc.) have null seasonNumber in the
// Bungie manifest because their watermarks are not in the DIM watermark map.
// TheAegisRelic's god-rolls database records the correct season for these, so
// we patch weapons.json after both files are written.

async function patchEventWeaponSeasons() {
  console.log('\n[patch-seasons] Back-filling null seasonNumbers from god-rolls...');

  const grPath = outPath('god-rolls.json');
  const wPath = outPath('weapons.json');

  if (!fs.existsSync(grPath) || !fs.existsSync(wPath)) {
    console.log('  Skipping — required files not present.');
    return;
  }

  const godRolls = JSON.parse(fs.readFileSync(grPath, 'utf8')) as Record<string, { season?: string | null }>;

  // name → season number from god-rolls
  const grSeason = new Map<string, number>();
  for (const [name, entry] of Object.entries(godRolls)) {
    if (entry.season) {
      const n = parseInt(entry.season, 10);
      if (!isNaN(n) && n > 0) grSeason.set(name, n);
    }
  }

  let patchCount = 0;
  const weapons = JSON.parse(fs.readFileSync(wPath, 'utf8')) as PackedWeapon[];
  for (const w of weapons) {
    if (w.seasonNumber === null) {
      const s = grSeason.get(w.name);
      if (s !== undefined) { w.seasonNumber = s; patchCount++; }
    }
  }
  if (patchCount > 0) write('weapons.json', weapons);

  console.log(`  Patched ${patchCount} weapon entries (${grSeason.size} god-roll seasons available).`);
}

// ── Step 5: Third-party community data (PvP wishlist, weapon sources) ────────
// These come from sources we don't control, so a failure here keeps the previously committed
// file (with a warning) instead of failing the whole build.

function readJson<T>(name: string): T { return JSON.parse(fs.readFileSync(outPath(name), 'utf8')) as T; }

function loadUnpackedWeapons() {
  return unpackWeapons({
    weapons: readJson('weapons.json'),
    perks: readJson('perks.json'),
    mods: readJson('mods.json'),
    statGroups: readJson('statgroups.json'),
  });
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function buildPvpWishlist() {
  console.log('\n[pvp-wishlist] Fetching r/CrucibleGuidebook community PvP wishlist...');
  try {
    const text = await fetchText(PVP_WISHLIST_URL);
    const blocks = parseWishlistBlocks(text);
    const { entries, unmatched } = buildPvpEntries(blocks, loadUnpackedWeapons());
    if (Object.keys(entries).length === 0) throw new Error('no weapons matched — refusing to overwrite');
    console.log(`  ${blocks.length} weapon blocks → ${Object.keys(entries).length} weapons`);
    if (unmatched.length) console.log(`  ⚠ ${unmatched.length} not in the weapon data: ${unmatched.slice(0, 8).join(', ')}`);
    write('pvp-wishlist.json', entries);
  } catch (err) {
    console.warn(`  ⚠ PvP wishlist not updated: ${err instanceof Error ? err.message : err}`);
    if (!fs.existsSync(outPath('pvp-wishlist.json'))) write('pvp-wishlist.json', {});
  }
}

// Pride Eternal's PvP spreadsheet -> public/data/pride.json (PvP tiers, preferred perks and notes).
// Only the gviz endpoint is readable for this sheet (the CSV export returns 401).
async function buildPride() {
  console.log("\n[pride] Fetching Pride Eternal's PvP spreadsheet...");
  try {
    const tab = (gid: string) => fetchText(`https://docs.google.com/spreadsheets/d/${PRIDE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`);
    const parsed = parsePrideSheet(await tab(PRIDE_LEGENDARY_GID), await tab(PRIDE_EXOTIC_GID), await tab(PRIDE_STATUS_GID));
    if (parsed.legendary < 400 || parsed.exotic < 80) throw new Error(`only ${parsed.legendary} legendary / ${parsed.exotic} exotic rows — refusing to overwrite`);
    console.log(`  ${parsed.legendary} legendary + ${parsed.exotic} exotic rows → ${Object.keys(parsed.entries).length} lookup keys`);
    const unmatched = rekeyToWeapons(parsed.entries, loadUnpackedWeapons().flatMap((w) => [w.name, w.baseName]));
    if (unmatched.length) console.log(`  ⚠ ${unmatched.length} not in the weapon data: ${unmatched.slice(0, 8).join(', ')}`);
    const fixed = snapPerkNames(parsed.entries, Object.values(readJson('perks.json') as Record<string, { name: string }>).map((p) => p.name));
    if (fixed) console.log(`  ${fixed} misspelled perk names corrected`);
    write('pride.json', parsed.entries);
  } catch (err) {
    console.warn(`  ⚠ Pride's sheet not updated: ${err instanceof Error ? err.message : err}`);
    if (!fs.existsSync(outPath('pride.json'))) write('pride.json', {});
  }
}

async function buildWeaponSources() {
  console.log("\n[sources] Fetching Sax's Monument of Triumph loot sources...");
  try {
    const tabs: Partial<Record<SaxTab, string>> = {};
    for (const tab of SAX_TABS) {
      tabs[tab] = await fetchText(`https://docs.google.com/spreadsheets/d/${SAX_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
    }
    const { sources, unmatched } = buildSourceTable(tabs, loadUnpackedWeapons());
    if (Object.keys(sources).length < 100) throw new Error(`only ${Object.keys(sources).length} weapons matched — refusing to overwrite`);
    console.log(`  ${Object.keys(sources).length} weapons with sources`);
    if (unmatched.length) console.log(`  ⚠ ${unmatched.length} sheet rows not matched: ${unmatched.slice(0, 8).join('; ')}`);
    write('sources.json', sources);
  } catch (err) {
    console.warn(`  ⚠ Weapon sources not updated: ${err instanceof Error ? err.message : err}`);
    if (!fs.existsSync(outPath('sources.json'))) write('sources.json', {});
  }
}

// Frame damage + timing from huwugo's WeaponStat Chart -> src/data/weaponStats.json (bundled, not in public/).
// While the sheet carries its "CURRENTLY UPDATING / MAY BE INACCURATE" banner the automated job leaves
// the committed data alone; set FORCE_WEAPON_STATS=1 to ingest it anyway.
async function buildWeaponStats() {
  console.log("\n[weapon-stats] Fetching huwugo's WeaponStat Chart...");
  const target = path.join(ROOT, 'src', 'data', 'weaponStats.json');
  const metaPath = path.join(ROOT, 'src', 'data', 'weaponStatsMeta.json');
  try {
    const tab = (gid: string) => fetchText(`https://docs.google.com/spreadsheets/d/${WEAPON_STAT_SHEET_ID}/export?format=csv&gid=${gid}`);
    const parsed = parseWeaponStatSheet(await tab(WEAPON_STAT_CHART_GID), await tab(WEAPON_DATA_GID));
    if (parsed.entries.length < 100) throw new Error(`only ${parsed.entries.length} usable rows — refusing to overwrite`);
    console.log(`  ${parsed.entries.length} usable rows (${parsed.skipped.length} skipped), ${parsed.version || 'version unknown'}`);

    if (sheetIsMidUpdate(parsed.banner) && process.env.FORCE_WEAPON_STATS !== '1') {
      console.warn(`  ⚠ Sheet is flagged mid-update ("${parsed.banner.slice(0, 60)}…") — keeping the committed data. Set FORCE_WEAPON_STATS=1 to ingest anyway.`);
      return;
    }

    const existing = JSON.parse(fs.readFileSync(target, 'utf8')) as WeaponStatEntry[];
    const merged = mergeWeaponStats(existing, parsed.entries);
    const next = JSON.stringify(merged.entries);
    if (next === JSON.stringify(existing)) { console.log('  No changes.'); return; }
    fs.writeFileSync(target, next);
    fs.writeFileSync(metaPath, JSON.stringify({
      source: `https://docs.google.com/spreadsheets/d/${WEAPON_STAT_SHEET_ID}`,
      sheetVersion: parsed.version, rows: parsed.entries.length, keptFromPrevious: merged.kept,
      sheetBanner: parsed.banner || null,
    }, null, 2) + '\n');
    console.log(`  ✓ weaponStats.json: ${merged.updated} updated, ${merged.added} added, ${merged.kept} kept (no longer in the sheet)`);
  } catch (err) {
    console.warn(`  ⚠ Weapon stats not updated: ${err instanceof Error ? err.message : err}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== build-static-data ===');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const steps = [
    { name: 'weapons',              fn: buildWeapons },
    { name: 'clarity',              fn: buildClarity },
    { name: 'god-rolls',            fn: buildGodRolls },
    { name: 'patch-event-seasons',  fn: patchEventWeaponSeasons },
    { name: 'pvp-wishlist',         fn: buildPvpWishlist },
    { name: 'pride',                fn: buildPride },
    { name: 'weapon-sources',       fn: buildWeaponSources },
    { name: 'weapon-stats',         fn: buildWeaponStats },
  ];

  let failed = 0;
  for (const { name, fn } of steps) {
    try {
      await fn();
    } catch (err) {
      console.error(`\n  ✗ ${name} FAILED:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} step(s) failed. Aborting build.`);
    process.exit(1);
  }

  console.log('\n=== All static data files written successfully ===\n');
}

main();
