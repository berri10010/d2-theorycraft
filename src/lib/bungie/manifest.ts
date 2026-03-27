import { Redis } from '@upstash/redis';
import { Weapon } from '../../types/weapon';
import { parseWeapons } from './parser';
import {
  BungieManifestResponse,
  BungieInventoryItem,
  BungieSocketCategoryDefinition,
  BungiePlugSetDefinition,
} from './bungieTypes';

const BUNGIE_ROOT = 'https://www.bungie.net';
const CACHE_VERSION_KEY = 'd2:manifest-version';
const CACHE_WEAPONS_KEY = 'd2:weapons';

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in environment variables.'
    );
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
  const redis = getRedis();
  const manifest = await fetchManifestIndex();
  const currentVersion = manifest.Response.version;
  const paths = manifest.Response.jsonWorldComponentContentPaths.en;

  const cachedVersion = await redis.get<string>(CACHE_VERSION_KEY);
  if (cachedVersion === currentVersion) {
    const cached = await redis.get<Weapon[]>(CACHE_WEAPONS_KEY);
    if (cached) {
      return { synced: false, version: currentVersion, weaponCount: cached.length };
    }
  }

  console.log('Syncing Bungie manifest v' + currentVersion + '...');

  const [items, socketCategoryDefs, plugSetDefs] = await Promise.all([
    fetchTable(paths.DestinyInventoryItemDefinition) as Promise<Record<string, BungieInventoryItem>>,
    fetchTable(paths.DestinySocketCategoryDefinition) as Promise<Record<string, BungieSocketCategoryDefinition>>,
    fetchTable(paths.DestinyPlugSetDefinition) as Promise<Record<string, BungiePlugSetDefinition>>,
  ]);

  console.log('  Parsing weapons...');
  const weapons = parseWeapons(items, socketCategoryDefs, plugSetDefs);

  // Store version and weapons in Redis. TTL of 7 days as a safety net —
  // syncManifest will refresh earlier if the Bungie manifest version changes.
  await Promise.all([
    redis.set(CACHE_VERSION_KEY, currentVersion, { ex: 60 * 60 * 24 * 7 }),
    redis.set(CACHE_WEAPONS_KEY, weapons, { ex: 60 * 60 * 24 * 7 }),
  ]);

  console.log('  Done - cached ' + weapons.length + ' weapons.');
  return { synced: true, version: currentVersion, weaponCount: weapons.length };
}

export async function getCachedWeapons(): Promise<Weapon[] | null> {
  try {
    const redis = getRedis();
    return await redis.get<Weapon[]>(CACHE_WEAPONS_KEY);
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
