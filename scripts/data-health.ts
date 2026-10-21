/**
 * Compares the freshly refreshed data with what is committed (HEAD) and prints a Markdown report.
 * Exits 1 when the refresh looks broken (e.g. most weapons vanished) so it is never committed.
 *
 *   npx tsx scripts/data-health.ts
 *
 * The refresh-data workflow adds the output to the run summary and the commit message.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { compareSnapshots, type DataSnapshot } from '../src/lib/dataHealth.js';
import type { WeaponStatEntry } from '../src/lib/weaponStats.js';

const ROOT = process.cwd();

const readNow = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

/** The committed version of a file, or null if it is not in git yet. */
function readHead(file: string): unknown {
  try {
    const out = execFileSync('git', ['show', `HEAD:${file.replace(/\\/g, '/')}`], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out.toString('utf8'));
  } catch {
    return null;
  }
}

const count = (v: unknown) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0);

function snapshot(read: (file: string) => unknown): DataSnapshot | null {
  const weapons = read('public/data/weapons.json');
  const stats = read('src/data/weaponStats.json');
  if (!Array.isArray(weapons) || !Array.isArray(stats)) return null;
  return {
    weapons: (weapons as Array<{ hash: string | number; name: string }>).map((w) => ({ hash: String(w.hash), name: w.name })),
    perkCount: count(read('public/data/perks.json')),
    sourceCount: count(read('public/data/sources.json')),
    pvpCount: count(read('public/data/pvp-wishlist.json')),
    stats: stats as WeaponStatEntry[],
  };
}

const after = snapshot(readNow);
if (!after) {
  console.error('Could not read the refreshed data.');
  process.exit(1);
}
const report = compareSnapshots(snapshot(readHead), after);
process.stdout.write(report.markdown);
if (report.errors.length) {
  console.error(`\nRefresh rejected: ${report.errors.join(' ')}`);
  process.exit(1);
}
