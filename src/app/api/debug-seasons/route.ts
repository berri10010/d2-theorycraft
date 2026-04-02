import { NextResponse } from 'next/server';

const API_KEY = process.env.BUNGIE_API_KEY!;
const BUNGIE_ROOT = 'https://www.bungie.net';

async function fetchTable(path: string) {
  const res = await fetch(BUNGIE_ROOT + path);
  if (!res.ok) throw new Error('Failed: ' + res.status);
  return res.json();
}

export async function GET() {
  try {
    // 1. Fetch manifest index
    const manifestRes = await fetch(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const manifest = await manifestRes.json();
    const paths = manifest.Response.jsonWorldComponentContentPaths.en;

    // 2. Report which season-related tables exist
    const seasonKeys = Object.keys(paths).filter(k =>
      k.toLowerCase().includes('season') || k.toLowerCase().includes('episode')
    );

    // 3. Fetch DestinySeasonDefinition if present
    let seasonSample: unknown[] = [];
    if (paths.DestinySeasonDefinition) {
      const seasonDefs = await fetchTable(paths.DestinySeasonDefinition);
      seasonSample = Object.values(seasonDefs).slice(0, 10);
    }

    // 4. Fetch a small slice of items and look for seasonHash + iconWatermark
    const items = await fetchTable(paths.DestinyInventoryItemDefinition);
    const WEAPON_ITEM_TYPE = 3;

    const weaponSamples: unknown[] = [];
    for (const item of Object.values(items) as any[]) {
      if (item.itemType !== WEAPON_ITEM_TYPE) continue;
      if (!item.displayProperties?.name?.trim()) continue;
      weaponSamples.push({
        name: item.displayProperties.name,
        seasonHash: item.seasonHash ?? null,
        iconWatermark: item.iconWatermark ?? null,
      });
      if (weaponSamples.length >= 20) break;
    }

    // 5. Count how many weapons have seasonHash vs iconWatermark
    let withSeasonHash = 0, withWatermark = 0, withBoth = 0, withNeither = 0, totalWeapons = 0;
    for (const item of Object.values(items) as any[]) {
      if (item.itemType !== WEAPON_ITEM_TYPE) continue;
      if (!item.displayProperties?.name?.trim()) continue;
      totalWeapons++;
      const hasSH = !!item.seasonHash;
      const hasWM = !!item.iconWatermark;
      if (hasSH) withSeasonHash++;
      if (hasWM) withWatermark++;
      if (hasSH && hasWM) withBoth++;
      if (!hasSH && !hasWM) withNeither++;
    }

    return NextResponse.json({
      seasonRelatedTableKeys: seasonKeys,
      hasDestinySeasonDefinition: !!paths.DestinySeasonDefinition,
      seasonDefinitionSample: seasonSample,
      weaponCoverage: { totalWeapons, withSeasonHash, withWatermark, withBoth, withNeither },
      weaponSamples,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
