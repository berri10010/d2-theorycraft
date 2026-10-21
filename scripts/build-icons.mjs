// Builds src/data/localIcons.json, which maps "<kind>:<name>" -> icon for the damage-buff toggles
// and armor-mod rows (neither data set stores icons of its own).
//
//   node scripts/build-icons.mjs        (needs BUNGIE_API_KEY, from the environment or .env.local)
//
// Two sources:
//   { item: hash } / { sandbox: hash }  Bungie manifest entry; stored as the CDN path, so the browser
//                                       loads it from bungie.net like every other icon.
//   'path/under/D2Assets/Assets.png'    for the few things the manifest has no icon for; converted to a
//                                       64px WebP in public/icons (D2Assets itself is gitignored).
// Commit localIcons.json and public/icons after changing anything here.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'D2Assets', 'Assets');
const OUT = path.join(ROOT, 'public', 'icons');
const SIZE = 64; // displayed at 20-40px; 64 keeps them sharp on high-DPI screens
const BUNGIE = 'https://www.bungie.net';

const ICONS = {
  // Damage buffs (src/data/buffs.json)
  'buff:Radiant': { item: 716946858 },
  'buff:Empowering Rift': { item: 2979486802 }, // Warlock, Solar
  'buff:Well of Radiance': { item: 2274196887 },
  'buff:Banner Shield': { sandbox: 3112248479 },
  'buff:Sentinel Shield': { item: 4260353952 },
  'buff:Noble Rounds (Lumina)': { item: 2144092201 },
  'buff:Weaken': { item: 278235650 },
  'buff:Shadowshot Tether': { sandbox: 2999301420 },
  'buff:Moebius Quiver': { item: 2722573681 },
  'buff:Divinity': { item: 4103414242 },
  'buff:Disruption Break': { item: 1683379515 },
  'buff:Tractor Cannon': { item: 3580904581 },
  'buff:Worm Byproduct': { item: 1679262379 },
  'buff:Spark of Frequency': { item: 1727069361 },
  'buff:Ember of Tempering': { item: 362132290 },
  'buff:Thread of Ascent': { item: 4208512216 },
  'buff:Flow State': { item: 4194622036 },
  'buff:On Your Mark': { item: 3066103999 },
  'buff:Heat Rises': { item: 83039194 },
  'buff:Rally Barricade': { item: 2495523341 }, // Titan, Solar
  'buff:Blessing of the Sky': { item: 743139589 },
  'buff:Helm of Saint-14': { item: 106575079 },
  "buff:Gyrfalcon's Hauberk": { item: 461841403 },
  'buff:No Backup Plans': { item: 730200061 },
  'buff:Hazardous Propulsion': { item: 77153391 },
  'buff:Prismatic Transfer': { item: 1533272841 },
  "buff:Felwinter's Helm": { item: 728668916 },
  'buff:Flash Counter': { item: 2244851822 },
  'buff:Whisper of Hedrons': { item: 3469412970 },

  // Not in the manifest
  'buff:Weapons of Light': 'abilities/super/ward of dawn.png',
  'buff:Amplified': 'abilities/effects/amplified.png',
  'buff:Sever': 'abilities/effects/sever.png',
  'buff:Deadfall': 'abilities/super/shadowshot - deadfall tether.png',

  // Armor mods (ArmorModPanel row labels)
  'mod:Targeting': { item: 2214424583 },
  'mod:Loader': { item: 2237975061 },
  'mod:Dexterity': { item: 1561736585 },
  'mod:In-Flight Comp.': { item: 2899505723 },
  'mod:Unflinching Aim': { item: 1262438062 },
  'mod:Ammo Generation': { item: 2305736470 },
  'mod:Weapon Surge': { item: 14520248 },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function apiKey() {
  if (process.env.BUNGIE_API_KEY) return process.env.BUNGIE_API_KEY;
  const env = path.join(ROOT, '.env.local');
  const m = fs.existsSync(env) && fs.readFileSync(env, 'utf8').match(/^BUNGIE_API_KEY=(.+)$/m);
  if (m) return m[1].trim();
  throw new Error('BUNGIE_API_KEY is not set');
}

async function manifestTables() {
  const headers = { 'X-API-Key': apiKey() };
  const man = await (await fetch(`${BUNGIE}/Platform/Destiny2/Manifest/`, { headers })).json();
  const paths = man.Response.jsonWorldComponentContentPaths.en;
  const get = async (name) => (await fetch(BUNGIE + paths[name])).json();
  return { item: await get('DestinyInventoryItemLiteDefinition'), sandbox: await get('DestinySandboxPerkDefinition') };
}

const tables = Object.values(ICONS).some((v) => typeof v === 'object') ? await manifestTables() : null;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const map = {};
const converted = new Map(); // source file -> url, so shared sources are written once
let bytes = 0;
for (const [key, spec] of Object.entries(ICONS)) {
  if (typeof spec === 'string') {
    const file = path.join(SRC, spec);
    if (!fs.existsSync(file)) throw new Error(`${key}: missing D2Assets/Assets/${spec}`);
    let url = converted.get(spec);
    if (!url) {
      const name = `${slug(path.basename(spec, path.extname(spec)))}.webp`;
      const buf = await sharp(file).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer();
      fs.writeFileSync(path.join(OUT, name), buf);
      bytes += buf.length;
      url = `/icons/${name}`;
      converted.set(spec, url);
    }
    map[key] = url;
  } else {
    const [table, hash] = Object.entries(spec)[0];
    const icon = tables[table][hash]?.displayProperties?.icon;
    if (!icon) throw new Error(`${key}: no icon for ${table} ${hash}`);
    map[key] = icon;
  }
}

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'localIcons.json'), JSON.stringify(map, null, 2) + '\n');
const remote = Object.values(map).filter((u) => u.startsWith('/common/')).length;
console.log(`${Object.keys(map).length} icons: ${remote} from the Bungie CDN, ${converted.size} local (${(bytes / 1024).toFixed(1)} KB)`);
