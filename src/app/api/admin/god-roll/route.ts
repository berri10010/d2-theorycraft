import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'public', 'data', 'god-rolls.json');

function devOnly() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Admin routes are dev-only.' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const guard = devOnly(); if (guard) return guard;
  const weapon = req.nextUrl.searchParams.get('weapon');
  const raw = fs.readFileSync(FILE, 'utf-8');
  const db  = JSON.parse(raw) as Record<string, Record<string, unknown>>;

  // Coverage mode: return all weapon names with PvE/PvP status
  if (!weapon || weapon === '__coverage__') {
    const coverage: Record<string, { hasPve: boolean; hasPvp: boolean }> = {};
    for (const [name, e] of Object.entries(db)) {
      coverage[name] = {
        hasPve: Array.isArray(e.perk1) && e.perk1.length > 0,
        hasPvp: Array.isArray(e.pvpPerk1) && e.pvpPerk1.length > 0,
      };
    }
    return NextResponse.json({ coverage });
  }

  return NextResponse.json({ entry: db[weapon] ?? null });
}

export async function POST(req: NextRequest) {
  const guard = devOnly(); if (guard) return guard;
  const body = await req.json() as { weaponName: string; entry: Record<string, unknown> };
  if (!body.weaponName) return NextResponse.json({ error: 'Missing weaponName' }, { status: 400 });

  const raw = fs.readFileSync(FILE, 'utf-8');
  const db  = JSON.parse(raw);
  db[body.weaponName] = { ...(db[body.weaponName] ?? {}), ...body.entry };

  fs.writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n', 'utf-8');
  return NextResponse.json({ ok: true });
}
