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
 *   public/data/weapons-0.json        Parsed Weapon[] — first half (perk.description stripped)
 *   public/data/weapons-1.json        Parsed Weapon[] — second half (perk.description stripped)
 *   public/data/clarity.json          Filtered Clarity perk descriptions
 *   public/data/god-rolls.json        God roll recommendations
 *   public/data/perk-descriptions.json Destiny Data Compendium perk text
 *
 * Note: perk.description is stripped from weapons-*.json to stay under the
 * Cloudflare Pages 25 MiB per-file asset limit.  Clarity + Compendium cover
 * perk descriptions at runtime.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseWeapons } from '../src/lib/bungie/parser.js';
import type { Weapon, Perk } from '../src/types/weapon.js';
import type { BungieSeasonDefinition } from '../src/lib/bungie/bungieTypes.js';

// ── Path helpers ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
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
  fs.writeFileSync(MANIFEST_VER_CACHE, version, 'utf-8');
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

// ── Strip perk descriptions ───────────────────────────────────────────────────
//
// perk.description (Bungie manifest text) is the largest text field per perk.
// Clarity + Compendium cover descriptions at runtime, so we strip this field
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

// ── Step 1: Weapons ───────────────────────────────────────────────────────────

async function buildWeapons() {
  console.log('\n[weapons] Fetching Bungie manifest...');

  // Fetch the lightweight manifest metadata first (~2 KB, always fast).
  const manifest = await bungieGet(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`);
  const version  = manifest.Response.version as string;
  const paths    = manifest.Response.jsonWorldComponentContentPaths.en as Record<string, string>;
  console.log(`  Manifest version: ${version}`);

  // ── Cache check: skip the ~24 MB table download if version unchanged ──────
  const cachedVersion = readCachedManifestVersion();
  if (cachedVersion === version && fs.existsSync(outPath('weapons-0.json')) && fs.existsSync(outPath('weapons-1.json'))) {
    console.log(`  ✓ Manifest unchanged since last build — skipping table download`);
    console.log(`    (delete .next/cache/bungie-manifest-version to force a refresh)`);
    return;
  }
  if (cachedVersion && cachedVersion !== version) {
    console.log(`  Manifest changed: ${cachedVersion} → ${version}`);
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.log('  Downloading tables (parallel)...');
  const [items, socketCategoryDefs, plugSetDefs, seasonDefs, dimWatermarkMap] = await Promise.all([
    fetchTable(paths.DestinyInventoryItemDefinition),
    fetchTable(paths.DestinySocketCategoryDefinition),
    fetchTable(paths.DestinyPlugSetDefinition),
    fetchTable(paths.DestinySeasonDefinition),
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

  console.log('  Parsing weapons...');
  const weapons = parseWeapons(items, socketCategoryDefs, plugSetDefs, seasonDefs, combinedWatermarkMap);
  console.log(`  Parsed ${weapons.length} weapons`);

  // Strip perk descriptions and split into two chunks to stay under the
  // Cloudflare Pages 25 MiB per-file asset limit.
  const stripped = stripDescriptions(weapons);
  const mid = Math.ceil(stripped.length / 2);
  write('weapons-0.json', stripped.slice(0, mid));
  write('weapons-1.json', stripped.slice(mid));

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

function parseCSVSimple(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(cell); cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

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

async function buildGodRolls() {
  console.log('\n[god-rolls] Fetching Google Sheets tabs...');
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
  const db: Record<string, unknown> = {};
  let tabCount = 0;

  await Promise.all(
    WEAPON_TABS.map(async (tab) => {
      try {
        const res = await fetch(base + encodeURIComponent(tab));
        if (!res.ok) return;
        const text = await res.text();
        const rows = parseCSVSimple(text);
        const split = (s?: string) => s ? s.split('\n').map(p => p.trim()).filter(Boolean) : [];

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = r[1]?.trim();
          if (!name || name === 'Name' || r.length < 12) continue;
          db[name] = {
            weaponType: TAB_TO_TYPE[tab] ?? tab,
            season: r[2]?.trim() || null,
            energy: r[3]?.trim() || null,
            frame: r[4]?.trim() || null,
            barrel: split(r[7]),
            mag: split(r[8]),
            perk1: split(r[9]),
            perk2: split(r[10]),
            originTrait: r[11]?.trim() || null,
            notes: r[12]?.trim() || null,
            rank: r[13] ? parseInt(r[13], 10) || null : null,
            tier: r[14]?.trim() || null,
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

// ── Step 4: Perk descriptions (Destiny Data Compendium) ──────────────────────

async function buildPerkDescriptions() {
  console.log('\n[perk-descriptions] Fetching Destiny Data Compendium...');
  const COMPENDIUM_ID = '1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4';
  const url = `https://docs.google.com/spreadsheets/d/${COMPENDIUM_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Gear Perks')}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Compendium fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSVSimple(text);

  const SKIP_NAMES = new Set([
    'Weapon Traits','Weapon Mods','Intrinsic Traits','Origin Traits',
    'Armor Set Bonuses','Perk','Gear Perks, Traits, and Mods',
    'Enhanced Traits will have their bonuses in',
  ]);

  const db: Record<string, unknown> = {};
  let section = 'Weapon Traits';

  for (const r of rows) {
    const name = r[0]?.trim();
    const desc = r[2]?.trim();
    if (!name) continue;
    if (['Weapon Traits','Weapon Mods','Intrinsic Traits','Origin Traits','Armor Set Bonuses'].includes(name)) {
      section = name; continue;
    }
    if (SKIP_NAMES.has(name) || name.startsWith('↑') || name.startsWith('(')) continue;
    if (!desc || desc.length < 10) continue;

    const baseDescription = desc.replace(/↑[^\n]*/g, '').replace(/\n+/g, '\n').replace(/\n/g, ' ').trim();
    const enhancedBonuses = Array.from(desc.matchAll(/↑([^\n]+)/g)).map(m => m[1].trim());

    db[name] = {
      description: desc.replace(/\n/g, ' ').trim(),
      baseDescription,
      enhancedBonuses,
      section,
    };
  }

  console.log(`  ${Object.keys(db).length} perk entries`);
  write('perk-descriptions.json', db);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== build-static-data ===');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const steps = [
    { name: 'weapons',           fn: buildWeapons },
    { name: 'clarity',           fn: buildClarity },
    { name: 'god-rolls',         fn: buildGodRolls },
    { name: 'perk-descriptions', fn: buildPerkDescriptions },
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
