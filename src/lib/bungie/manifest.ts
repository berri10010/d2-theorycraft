import { Redis } from '@upstash/redis';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { Weapon } from '../../types/weapon';
import { parseWeapons } from './parser';
import {
  BungieManifestResponse,
  BungieInventoryItem,
  BungieSocketCategoryDefinition,
  BungiePlugSetDefinition,
  BungieSeasonDefinition,
} from './bungieTypes';
import { BUNGIE_URL as BUNGIE_ROOT } from '../bungieUrl';

const gzipAsync   = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const CACHE_VERSION_KEY = 'd2:manifest-version-v9'; // bumped — DIM watermark-to-season community map
const CACHE_WEAPONS_KEY = 'd2:weapons-gz-v9';       // bumped — use d2-additional-info watermark→seasonNumber for reliable season data
const TTL               = 60 * 60 * 24 * 7; // 7 days

function getRedis(): Redis {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment variables.');
  }
  return new Redis({ url, token });
}

function getApiKey(): string {
  const key = process.env.BUNGIE_API_KEY;
  if (!key || key === 'paste_your_api_key_here') {
    throw new Error('BUNGIE_API_KEY is not set in .env.local');
  }
  return key;
}

async function compress(data: unknown): Promise<string> {
  const json       = JSON.stringify(data);
  const compressed = await gzipAsync(Buffer.from(json, 'utf-8'));
  return compressed.toString('base64');
}

async function decompress<T>(encoded: string): Promise<T> {
  const buf         = Buffer.from(encoded, 'base64');
  const decompressed = await gunzipAsync(buf);
  return JSON.parse(decompressed.toString('utf-8')) as T;
}

async function fetchManifestIndex(): Promise<BungieManifestResponse> {
  const res = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/', {
    headers: { 'X-API-Key': getApiKey() },
  });
  if (!res.ok) throw new Error('Bungie API returned ' + res.status + '. Check your API key.');
  return res.json();
}

async function fetchTable(relativePath: string) {
  console.log('  Downloading: ' + relativePath.split('/').pop() + '...');
  const res = await fetch(BUNGIE_ROOT + relativePath);
  if (!res.ok) throw new Error('Failed to fetch manifest table: ' + res.status);
  return res.json();
}

export interface SyncResult {
  synced: boolean;
  version: string;
  weaponCount: number;
}

export async function syncManifest(): Promise<SyncResult> {
  const redis          = getRedis();
  const manifest       = await fetchManifestIndex();
  const currentVersion = manifest.Response.version;
  const paths          = manifest.Response.jsonWorldComponentContentPaths.en;

  const cachedVersion = await redis.get<string>(CACHE_VERSION_KEY);
  if (cachedVersion === currentVersion) {
    const encoded = await redis.get<string>(CACHE_WEAPONS_KEY);
    if (encoded) {
      const cached = await decompress<Weapon[]>(encoded);
      return { synced: false, version: currentVersion, weaponCount: cached.length };
    }
  }

  console.log('Syncing Bungie manifest v' + currentVersion + '...');

  const [items, socketCategoryDefs, plugSetDefs, seasonDefs, dimWatermarkMap] = await Promise.all([
    fetchTable(paths.DestinyInventoryItemDefinition) as Promise<Record<string, BungieInventoryItem>>,
    fetchTable(paths.DestinySocketCategoryDefinition) as Promise<Record<string, BungieSocketCategoryDefinition>>,
    fetchTable(paths.DestinyPlugSetDefinition) as Promise<Record<string, BungiePlugSetDefinition>>,
    fetchTable(paths.DestinySeasonDefinition) as Promise<Record<string, BungieSeasonDefinition>>,
    // Community-maintained map of iconWatermark path → season number.
    // Bungie never sets seasonHash on weapons, so this is the only reliable source.
    fetch('https://raw.githubusercontent.com/DestinyItemManager/d2-additional-info/master/output/watermark-to-season.json')
      .then(r => r.json() as Promise<Record<string, number>>)
      .catch(() => ({} as Record<string, number>)),
  ]);

  // Build an artifact watermark → season number map directly from Bungie's season definitions.
  // Every season has a unique artifact whose iconWatermark matches that season's weapons.
  // This covers new episodes/seasons that the DIM community map hasn't been updated for yet.
  const artifactWatermarkMap: Record<string, number> = {};
  for (const season of Object.values(seasonDefs)) {
    if (!season.artifactItemHash || !season.seasonNumber) continue;
    const artifact = items[season.artifactItemHash.toString()];
    if (artifact?.iconWatermark) {
      artifactWatermarkMap[artifact.iconWatermark] = season.seasonNumber;
    }
  }
  // Merge: artifact map fills gaps for new seasons; DIM map overwrites with
  // community-verified entries where it has them (DIM takes priority).
  const combinedWatermarkMap: Record<string, number> = { ...artifactWatermarkMap, ...dimWatermarkMap };
  console.log(`  Watermark map: ${Object.keys(dimWatermarkMap).length} DIM + ${Object.keys(artifactWatermarkMap).length} artifact entries.`);

  console.log('  Parsing weapons...');
  const weapons = parseWeapons(items, socketCategoryDefs, plugSetDefs, seasonDefs, combinedWatermarkMap);

  console.log('  Compressing...');
  const encoded = await compress(weapons);
  const sizeMB  = (Buffer.byteLength(encoded, 'utf-8') / 1024 / 1024).toFixed(2);
  console.log(`  Compressed size: ${sizeMB} MB`);

  await Promise.all([
    redis.set(CACHE_VERSION_KEY, currentVersion, { ex: TTL }),
    redis.set(CACHE_WEAPONS_KEY, encoded,        { ex: TTL }),
  ]);

  console.log('  Done - cached ' + weapons.length + ' weapons.');
  return { synced: true, version: currentVersion, weaponCount: weapons.length };
}

export async function getCachedWeapons(): Promise<Weapon[] | null> {
  try {
    const redis   = getRedis();
    const encoded = await redis.get<string>(CACHE_WEAPONS_KEY);
    if (!encoded) return null;
    return await decompress<Weapon[]>(encoded);
  } catch {
    return null;
  }
}

export async function getCachedVersion(): Promise<string | null> {
  try {
    const redis = getRedis();
    return await redis.get<string>(CACHE_VERSION_KEY);
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.del(CACHE_VERSION_KEY),
    redis.del(CACHE_WEAPONS_KEY),
  ]);
}
