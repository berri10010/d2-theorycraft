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
      // Clarity — fetch a few entries from clarity.json to see the perk data structure
      clarity_json_sample:       'https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/master/descriptions/clarity.json',
      // dim-custom-symbols — see what's in output/ and data/
      dim_output_dir:            'https://api.github.com/repos/DestinyItemManager/dim-custom-symbols/contents/output',
      dim_data_dir:              'https://api.github.com/repos/DestinyItemManager/dim-custom-symbols/contents/data',
      dim_svg_dir:               'https://api.github.com/repos/DestinyItemManager/dim-custom-symbols/contents/svg',
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
            if (Array.isArray(data)) {
              results[key] = (data as any[]).map((f: any) => f.name ?? f);
            } else {
              const entries = Object.entries(data as Record<string, unknown>).slice(0, 3);
              results[key] = Object.fromEntries(entries);
            }
          } else {
            // SVG or plain text — return first 300 chars
            const text = await res.text();
            results[key] = text.slice(0, 300);
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
