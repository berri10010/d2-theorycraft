/**
 * Dev-only admin server — runs on port 3001 alongside `next dev`.
 * Handles god roll and perk tier file reads/writes for the /admin page.
 * Start with: node scripts/admin-server.mjs
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT  = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT  = 3001;

const GOD_ROLLS_FILE  = join(ROOT, 'public', 'data', 'god-rolls.json');
const PERK_TIERS_FILE = join(ROOT, 'src', 'data', 'perkTiers.json');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

createServer(async (req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // ── /god-roll ──────────────────────────────────────────────────────────────
  if (pathname === '/god-roll') {
    let db = {};
    try { db = JSON.parse(readFileSync(GOD_ROLLS_FILE, 'utf-8')); } catch { /* first run */ }

    if (req.method === 'GET') {
      const w = url.searchParams.get('weapon');
      if (!w || w === '__coverage__' || w === '__check__') {
        const coverage = {};
        for (const [name, e] of Object.entries(db)) {
          coverage[name] = {
            hasPve: Array.isArray(e.perk1) && e.perk1.length > 0,
            hasPvp: Array.isArray(e.pvpPerk1) && e.pvpPerk1.length > 0,
          };
        }
        return json(res, 200, { coverage });
      }
      return json(res, 200, { entry: db[w] ?? null });
    }

    if (req.method === 'POST') {
      try {
        const { weaponName, entry } = await readBody(req);
        if (!weaponName || !entry) return json(res, 400, { error: 'Missing weaponName or entry' });
        db[weaponName] = { ...db[weaponName], ...entry };
        writeFileSync(GOD_ROLLS_FILE, JSON.stringify(db, null, 2), 'utf-8');
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 500, { error: String(e) }); }
    }
  }

  // ── /perk-tiers ────────────────────────────────────────────────────────────
  if (pathname === '/perk-tiers') {
    let data = {};
    try { data = JSON.parse(readFileSync(PERK_TIERS_FILE, 'utf-8')); } catch { /* first run */ }

    if (req.method === 'GET') {
      return json(res, 200, data);
    }

    if (req.method === 'POST') {
      try {
        const { updates } = await readBody(req);
        if (!updates) return json(res, 400, { error: 'Missing updates' });
        for (const [name, entry] of Object.entries(updates)) {
          data[name] = { ...data[name], ...entry };
        }
        writeFileSync(PERK_TIERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 500, { error: String(e) }); }
    }
  }

  json(res, 404, { error: 'Not found' });

}).listen(PORT, () => {
  console.log(`\n  D2 Theorycraft Admin Server`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Writes to: ${ROOT}\n`);
});
