/**
 * Lists every exotic weapon's intrinsic and perks, whether each carries a modelled effect (buffKey), and whether
 * the weapon has timing data, so the unmodelled ones can be ranked.
 *
 *   npx tsx scripts/audit-exotics.ts
 */
import fs from 'fs';
import path from 'path';
import { unpackWeapons } from '../src/lib/weaponPack.js';
import { lookupWeaponStat } from '../src/lib/weaponStats.js';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', f), 'utf8'));
const clarity = read('clarity.json');
const weapons = unpackWeapons({ weapons: read('weapons.json'), perks: read('perks.json'), mods: read('mods.json'), statGroups: read('statgroups.json') });
const seen = new Set<string>();
const rows: string[] = [];
for (const w of weapons) {
  if (w.rarity !== 'Exotic' || seen.has(w.name)) continue;
  seen.add(w.name);
  const stat = lookupWeaponStat(w.itemSubType, w.ammoType, w.intrinsicTrait?.name ?? null, w.name);
  const perks = w.perkSockets.flatMap((c) => c.perks).filter((p, i, a) => a.findIndex((q) => q.name === p.name) === i);
  const intr = w.intrinsicTrait;
  const modelled = (p: { buffKey: string | null }) => (p.buffKey ? 'Y' : '-');
  const desc = (p: { hash: string; description?: string }) => (clarity[p.hash]?.text ?? p.description ?? '').replace(/\s+/g, ' ').slice(0, 140);
  rows.push(
    `${w.name} [${w.itemTypeDisplayName}] stat:${stat ? (stat.approxFrom ? 'approx' : 'yes') : 'NO'} cat:${w.catalyst ? 'y' : 'n'}\n` +
    `   intrinsic ${intr ? `${modelled(intr)} ${intr.name}: ${desc(intr)}` : '(none)'}\n` +
    perks.map((p) => `   perk ${modelled(p)} ${p.name}: ${desc(p)}`).join('\n'),
  );
}
console.log(rows.join('\n'));
console.log(`\n${seen.size} exotics`);
