import { NextResponse } from 'next/server';

const API_KEY = process.env.BUNGIE_API_KEY!;
const BUNGIE_ROOT = 'https://www.bungie.net';

async function fetchTable(path: string) {
  const res = await fetch(BUNGIE_ROOT + path);
  if (!res.ok) throw new Error('Failed: ' + res.status);
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('mode') === 'probe') {
    const urls: Record<string, string> = {
      clarity_full_entry: 'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/master/descriptions/clarity.json',
      dim_glyphs_output:  'https://raw.githubusercontent.com/DestinyItemManager/dim-custom-symbols/master/output/d2-font-glyphs.ts',
      dim_glyphs_data:    'https://raw.githubusercontent.com/DestinyItemManager/dim-custom-symbols/master/data/d2-font-glyphs.ts',
    };

    const results: Record<string, unknown> = {};
    await Promise.all(
      Object.entries(urls).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) { results[key] = `HTTP ${res.status}`; return; }
          const contentType = res.headers.get('content-type') ?? '';
          if (contentType.includes('json')) {
            const data = await res.json();
            // Return full first entry so we can see complete structure
            const firstEntry = Object.values(data as Record<string, unknown>)[0];
            results[key] = { _firstEntry: firstEntry, _totalKeys: Object.keys(data).length };
          } else {
            // TypeScript file — return first 1500 chars
            const text = await res.text();
            results[key] = text.slice(0, 1500);
          }
        } catch (e) {
          results[key] = String(e);
        }
      })
    );
    return NextResponse.json(results);
  }

  try {
    const manifestRes = await fetch(`${BUNGIE_ROOT}/Platform/Destiny2/Manifest/`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const manifest = await manifestRes.json();
    const paths = manifest.Response.jsonWorldComponentContentPaths.en;

    const [seasonDefs, items] = await Promise.all([
      fetchTable(paths.DestinySeasonDefinition),
      fetchTable(paths.DestinyInventoryItemDefinition),
    ]);

    // Test the artifact approach: for each season with artifactItemHash,
    // look up that item and check its iconWatermark
    const artifactResults: unknown[] = [];
    for (const season of Object.values(seasonDefs) as any[]) {
      const name = season.displayProperties?.name?.trim();
      if (!name || !season.artifactItemHash) continue;
      const artifact = items[season.artifactItemHash.toString()];
      artifactResults.push({
        seasonName: name,
        seasonNumber: season.seasonNumber,
        artifactItemHash: season.artifactItemHash,
        artifactFound: !!artifact,
        artifactName: artifact?.displayProperties?.name ?? null,
        artifactIconWatermark: artifact?.iconWatermark ?? null,
      });
    }

    // Show a few weapon watermarks to compare against artifact watermarks
    const WEAPON_ITEM_TYPE = 3;
    const weaponWatermarks = new Set<string>();
    for (const item of Object.values(items) as any[]) {
      if (item.itemType !== WEAPON_ITEM_TYPE) continue;
      if (!item.displayProperties?.name?.trim()) continue;
      if (item.iconWatermark) weaponWatermarks.add(item.iconWatermark);
    }

    // Check how many artifact watermarks actually appear on weapons
    const artifactWatermarks = new Set(
      artifactResults
        .map((r: any) => r.artifactIconWatermark)
        .filter(Boolean)
    );
    const matchCount = Array.from(artifactWatermarks).filter(w => weaponWatermarks.has(w)).length;

    return NextResponse.json({
      totalSeasons: Object.keys(seasonDefs).length,
      seasonsWithArtifact: artifactResults.length,
      artifactResults: artifactResults.slice(0, 15),
      totalWeaponWatermarks: weaponWatermarks.size,
      artifactWatermarksMatchingWeapons: matchCount,
      sampleWeaponWatermarks: Array.from(weaponWatermarks).slice(0, 5),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
