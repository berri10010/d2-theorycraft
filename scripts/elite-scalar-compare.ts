/**
 * Compares our PvE damage against an Elite with what it would be if each weapon type kept the Elite value of
 * MossyMax's "Weapon Combatant Scaling" tab (ACCURACY_REPORT X2c). Prints a table; changes nothing and is not run
 * in CI or wired into the app.
 *
 *   npx tsx scripts/elite-scalar-compare.ts
 *
 * Why: src/data/combatantScalars.json is that tab divided by each type's Elite value and multiplied by 3.0, so every
 * type does the same damage against an Elite (PvP x 3.0). The tab's own Elite values range from 1.70 to 5.0. Whether
 * the normalisation is right is unknown; the in-game test is shots to kill a known Elite with a pulse rifle and a
 * hand cannon, compared with the "shots" columns below.
 *
 * The source Elite values are copied from the table in ACCURACY_REPORT.md (the raw tab is not stored in the repo),
 * so they are rounded to two decimals. Damage is per shot (per projectile for pellet weapons) for one reference
 * frame of each type, and the Elite health is the site's own figure (PVE_HEALTH_TIERS), which is itself unverified.
 */
import fs from 'fs';
import path from 'path';

interface StatRow { lookup: string; type: string; ammo: string; frame: string; bodyDamage: number; critDamage: number; pellets: number | null; source?: string | null }

const ROOT = process.cwd();
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'weaponStats.json'), 'utf8')) as StatRow[];
const ours = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'combatantScalars.json'), 'utf8')) as Record<string, Record<string, number>>;

const ELITE_HP = 1344; // PVE_HEALTH_TIERS['Major / Elite'] in src/lib/damageMath.ts

// Spreadsheet type name -> subtype key in combatantScalars.json -> the source tab's own Elite value (ACCURACY_REPORT X2c).
const TYPES: Array<{ name: string; subtype: string; sourceElite: number }> = [
  { name: 'Pulse', subtype: '13', sourceElite: 1.70 },
  { name: 'Auto', subtype: '6', sourceElite: 1.78 },
  { name: 'Scout', subtype: '14', sourceElite: 1.85 },
  { name: 'Linear Fusion', subtype: '22', sourceElite: 1.93 },
  { name: 'SMG', subtype: '24', sourceElite: 1.99 },
  { name: 'Bow', subtype: '31', sourceElite: 2.03 },
  { name: 'Trace', subtype: '29', sourceElite: 2.04 },
  { name: 'Sidearm', subtype: '17', sourceElite: 2.15 },
  { name: 'Machine Gun', subtype: '8', sourceElite: 2.83 },
  { name: 'Shotgun', subtype: '7', sourceElite: 2.88 },
  { name: 'Glaive', subtype: '33', sourceElite: 3.00 },
  { name: 'Hand Cannon', subtype: '9', sourceElite: 3.08 },
  { name: 'Fusion', subtype: '11', sourceElite: 3.31 },
  { name: 'Sniper', subtype: '12', sourceElite: 3.43 },
  { name: 'Rocket Launcher', subtype: '10', sourceElite: 5.00 },
];

const PREFERRED_FRAMES = ['Adaptive', 'Precision', 'Aggressive', 'Rapid Fire', 'Lightweight', 'High-Impact'];

function referenceRow(type: string): StatRow | undefined {
  const own = rows.filter((r) => r.type === type && r.source !== 'compendium');
  for (const frame of PREFERRED_FRAMES) {
    const hit = own.find((r) => r.frame === frame);
    if (hit) return hit;
  }
  return own[0];
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (n: number, d = 1) => n.toFixed(d);

console.log(`Elite health used: ${ELITE_HP}. Damage is per shot (per projectile), PvE against an Elite, for one reference frame per type.\n`);
console.log([
  pad('Type', 16), pad('Frame', 12), pad('PvP body/crit', 15), pad('Ours x', 7), pad('Source x', 9),
  pad('Body (ours)', 12), pad('Body (source)', 14), pad('Shots to kill: ours', 20), pad('Shots to kill: source', 22),
].join(''));

for (const t of TYPES) {
  const row = referenceRow(t.name);
  const oursElite = ours[t.subtype]?.['Major / Elite'];
  if (!row || oursElite === undefined) {
    console.log(pad(t.name, 16) + '(no reference row or scalar)');
    continue;
  }
  const bodyOurs = row.bodyDamage * oursElite;
  const bodySource = row.bodyDamage * t.sourceElite;
  const critOurs = row.critDamage * oursElite;
  const critSource = row.critDamage * t.sourceElite;
  const shots = (dmg: number) => Math.ceil(ELITE_HP / dmg);
  console.log([
    pad(t.name, 16), pad(row.frame, 12), pad(`${num(row.bodyDamage)}/${num(row.critDamage)}`, 15), pad(num(oursElite, 2), 7), pad(num(t.sourceElite, 2), 9),
    pad(num(bodyOurs), 12), pad(num(bodySource), 14),
    pad(`${shots(bodyOurs)} body / ${shots(critOurs)} crit`, 20), pad(`${shots(bodySource)} body / ${shots(critSource)} crit`, 22),
  ].join(''));
}
console.log('\nPellet weapons (shotgun, fusion) fire several projectiles per shot: multiply damage and divide shots by the pellet count to compare with a whole trigger pull.');
