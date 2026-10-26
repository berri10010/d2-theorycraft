/**
 * Writes one tiny JSON file per weapon to out/share/<hash>.json for the link-preview worker (see
 * src/lib/sharePreview.ts). Runs after `next build`, because it writes into the static export that gets deployed.
 *
 *   npx tsx scripts/build-share-data.ts
 */
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from '../src/lib/weaponPack.js';
import { shareRecord } from '../src/lib/sharePreview.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');
if (!fs.existsSync(OUT)) {
  console.error('out/ not found: run `next build` first.');
  process.exit(1);
}

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f), 'utf8'));
const weapons = unpackWeapons({ weapons: read('weapons.json'), perks: read('perks.json'), mods: read('mods.json'), statGroups: read('statgroups.json') });

const dir = path.join(OUT, 'share');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

let bytes = 0;
for (const w of weapons) {
  const json = JSON.stringify(shareRecord(w));
  bytes += json.length;
  fs.writeFileSync(path.join(dir, `${w.hash}.json`), json);
}
console.log(`share data: ${weapons.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB -> out/share/`);
