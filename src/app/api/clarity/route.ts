import { NextResponse } from 'next/server';
import { fetchClarityDescriptions } from '../../../lib/clarity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchClarityDescriptions();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
