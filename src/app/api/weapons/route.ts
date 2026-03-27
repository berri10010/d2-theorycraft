import { NextResponse } from 'next/server';
import { getCachedWeapons, syncManifest } from '../../../lib/bungie/manifest';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET() {
  try {
    let weapons = await getCachedWeapons();

    if (!weapons) {
      const result = await syncManifest();
      weapons = await getCachedWeapons();
      if (!weapons) return NextResponse.json({ error: 'Sync completed but no weapon data found.' }, { status: 500 });
      return NextResponse.json({ weapons, meta: { synced: true, version: result.version, count: weapons.length } });
    }

    return NextResponse.json({ weapons, meta: { synced: false, count: weapons.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/weapons]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
