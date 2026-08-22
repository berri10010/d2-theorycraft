/**
 * Refresh god-rolls.json from TheAegisRelic's live Google Sheet.
 *
 * Uses the gviz JSON endpoint (not CSV) so multi-line quoted cells parse
 * correctly — perk options are newline-delimited in the sheet cells.
 *
 * Usage:  npm run refresh-god-rolls
 *
 * Column layout (as of Season 29 sheet revision):
 *   [0]  WEAPON image  [1]  Name        [2]  Season     [3]  Energy
 *   [4]  Frame         [5]  Source       [6]  Stun       [7]  Ammo
 *   [8]  ⬆️            [9]  Barrel       [10] Mag        [11] MW
 *   [12] Perk 1        [13] Perk 2       [14] Origin     [15] Notes
 *   [16] Rank #        [17] Tier
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const OUT_DIR    = path.join(ROOT, 'public', 'data');

const SHEET_ID = '1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY';
const WEAPON_TABS = [
  'Autos','Bows','HCs','Pulses','Scouts','Sidearms','SMGs','BGLs',
  'Fusions','Glaives','Shotguns','Snipers','Rocket Sidearms','Traces',
  'HGLs','LFRs','LMGs','Rockets','Swords','Other','Exotic Weapons',
];
const TAB_TO_TYPE: Record<string, string> = {
  Autos:'Auto Rifle', Bows:'Bow', HCs:'Hand Cannon', Pulses:'Pulse Rifle',
  Scouts:'Scout Rifle', Sidearms:'Sidearm', SMGs:'Submachine Gun',
  BGLs:'Breech Grenade Launcher', Fusions:'Fusion Rifle', Glaives:'Glaive',
  Shotguns:'Shotgun', Snipers:'Sniper Rifle', 'Rocket Sidearms':'Rocket Sidearm',
  Traces:'Trace Rifle', HGLs:'Heavy Grenade Launcher', LFRs:'Linear Fusion Rifle',
  LMGs:'Machine Gun', Rockets:'Rocket Launcher', Swords:'Sword',
  Other:'Other', 'Exotic Weapons':'Exotic',
};

type GvizCell = { v: string | number | null; f?: string } | null;
interface GvizResponse {
  table: {
    cols: Array<{ label: string }>;
    rows: Array<{ c: GvizCell[] }>;
  };
}

async function fetchGvizTab(tab: string): Promise<GvizResponse['table'] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  // Strip the JSONP wrapper: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonStr = raw.replace(/^[^{]+/, '').replace(/\);?\s*$/, '');
  const data = JSON.parse(jsonStr) as GvizResponse;
  return data.table ?? null;
}

function cellStr(cell: GvizCell): string {
  if (!cell || cell.v == null) return '';
  return String(cell.v).trim();
}

function splitOptions(cell: GvizCell): string[] {
  const s = cellStr(cell);
  if (!s) return [];
  // Options are newline-delimited in the sheet; fall back to comma-delimited.
  const parts = s.includes('\n') ? s.split('\n') : s.split(',');
  return parts.map(p => p.trim()).filter(Boolean);
}

async function main() {
  console.log('[refresh-god-rolls] Fetching from TheAegisRelic\'s sheet (gviz JSON)...\n');

  const db: Record<string, unknown> = {};
  let totalWeapons = 0;

  await Promise.all(
    WEAPON_TABS.map(async (tab) => {
      try {
        const table = await fetchGvizTab(tab);
        if (!table) { console.warn(`  ✗ ${tab}: empty response`); return; }

        // Swords and Glaives have an extra stat-recommendation column at c[12]
        // (e.g. "Impact" for swords, "Shield Duration" for glaives) that shifts
        // perk1 through tier columns by +1.
        const perkOffset = (tab === 'Swords' || tab === 'Glaives') ? 1 : 0;

        let count = 0;
        for (const row of table.rows) {
          const c = row.c;
          const name = cellStr(c[1]);
          if (!name || name === 'Name') continue;

          const o = 12 + perkOffset;
          db[name] = {
            weaponType:  TAB_TO_TYPE[tab] ?? tab,
            season:      cellStr(c[2]) || null,
            energy:      cellStr(c[3]) || null,
            frame:       cellStr(c[4]) || null,
            source:      cellStr(c[5]) || null,
            barrel:      splitOptions(c[9]),
            mag:         splitOptions(c[10]),
            mw:          cellStr(c[11]) || null,
            perk1:       splitOptions(c[o]),
            perk2:       splitOptions(c[o + 1]),
            originTrait: cellStr(c[o + 2]) || null,
            notes:       cellStr(c[o + 3]) || null,
            rank:        c[o + 4]?.v != null ? Number(c[o + 4].v) || null : null,
            tier:        cellStr(c[o + 5]) || null,
          };
          count++;
        }

        totalWeapons += count;
        console.log(`  ✓ ${tab.padEnd(18)} ${count} weapons`);
      } catch (e) {
        console.warn(`  ✗ ${tab}: ${e instanceof Error ? e.message : e}`);
      }
    })
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, 'god-rolls.json');
  fs.writeFileSync(outFile, JSON.stringify(db), 'utf-8');
  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`\n✓ god-rolls.json — ${totalWeapons} weapons (${kb} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
