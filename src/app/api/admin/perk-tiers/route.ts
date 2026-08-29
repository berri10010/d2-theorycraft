import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'src', 'data', 'perkTiers.json');

function devOnly() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Admin routes are dev-only.' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const guard = devOnly(); if (guard) return guard;
  const raw = fs.readFileSync(FILE, 'utf-8');
  return NextResponse.json(JSON.parse(raw));
}

export async function POST(req: NextRequest) {
  const guard = devOnly(); if (guard) return guard;
  const body = await req.json() as {
    updates: Record<string, {
      tier: string | null; notes: string | null; rank: number | null; tags: string[];
      pvpTier: string | null; pvpNotes: string | null; pvpRank: number | null; pvpTags: string[];
    }>;
  };
  if (!body.updates) return NextResponse.json({ error: 'Missing updates' }, { status: 400 });

  const raw = fs.readFileSync(FILE, 'utf-8');
  const db  = JSON.parse(raw);

  for (const [perkName, data] of Object.entries(body.updates)) {
    db[perkName] = { ...(db[perkName] ?? {}), ...data };
  }

  fs.writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n', 'utf-8');
  return NextResponse.json({ ok: true });
}
