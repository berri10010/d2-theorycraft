import { NextRequest, NextResponse } from 'next/server';
import { syncManifest, clearCache } from '../../../lib/bungie/manifest';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Called by the Vercel cron job every 6 days to keep the Redis cache warm.
// Requires the Authorization header to match the CRON_SECRET env var so
// random visitors can't trigger a full re-sync.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await clearCache();
    const result = await syncManifest();
    return NextResponse.json({ success: true, version: result.version, weaponCount: result.weaponCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
