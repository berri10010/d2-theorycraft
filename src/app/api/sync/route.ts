import { NextResponse } from 'next/server';
import { syncManifest, clearCache } from '../../../lib/bungie/manifest';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  try {
    await clearCache();
    const result = await syncManifest();
    return NextResponse.json({ success: true, version: result.version, weaponCount: result.weaponCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
