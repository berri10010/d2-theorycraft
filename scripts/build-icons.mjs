// Converts the hand-collected icons in D2Assets/ (not committed) into small WebP files under
// public/icons/ and writes src/data/localIcons.json, which maps "<kind>:<name>" -> URL.
//
//   node scripts/build-icons.mjs
//
// Only the icons listed below are shipped. Add a line, rerun, and commit public/icons + localIcons.json.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'D2Assets', 'Assets');
const OUT = path.join(ROOT, 'public', 'icons');
const SIZE = 64; // displayed at 20-40px; 64 keeps them sharp on high-DPI screens

/** "<kind>:<name as the site displays it>" -> path under D2Assets/Assets */
const ICONS = {
  // Damage buffs (src/data/buffs.json)
  'buff:Radiant': 'abilities/effects/radiant.png',
  'buff:Empowering Rift': 'abilities/class/empowering rift (solar).png',
  'buff:Well of Radiance': 'abilities/super/well of radiance.png',
  'buff:Weapons of Light': 'abilities/super/ward of dawn.png',
  'buff:Banner Shield': 'abilities/super/banner shield.png',
  'buff:Sentinel Shield': 'abilities/super/sentinel shield.png',
  'buff:Noble Rounds (Lumina)': 'weapons/lumina.png',
  'buff:Weaken': 'abilities/effects/weaken.png',
  'buff:Shadowshot Tether': 'abilities/super/shadowshot - deadfall tether.png',
  'buff:Deadfall': 'abilities/super/shadowshot - deadfall tether.png',
  'buff:Moebius Quiver': 'abilities/super/shadowshot - moebius quiver.png',
  'buff:Divinity': 'weapons/divinity.png',
  'buff:Disruption Break': 'perks/weapons/disruption break.png',
  'buff:Tractor Cannon': 'weapons/tractor cannon.png',
  'buff:Worm Byproduct': 'weapons/whisper of the worm.png',
  'buff:Spark of Frequency': 'abilities/fragments/spark of frequency.png',
  'buff:Amplified': 'abilities/effects/amplified.png',
  'buff:Ember of Tempering': 'abilities/fragments/ember of tempering.png',
  'buff:Sever': 'abilities/effects/sever.png',
  'buff:Thread of Ascent': 'abilities/fragments/thread of ascent.png',
  'buff:Flow State': 'abilities/aspects/flow state.png',
  'buff:On Your Mark': 'abilities/aspects/on your mark.png',
  'buff:Heat Rises': 'abilities/aspects/heat rises.png',
  'buff:Rally Barricade': 'abilities/class/rally barricade (solar).png',

  // Armor mods (ArmorModPanel)
  'mod:Targeting': 'mods/standard/kinetic targeting.png',
  'mod:Loader': 'mods/standard/kinetic loader.png',
  'mod:Dexterity': 'mods/standard/kinetic dexterity.png',
  'mod:Unflinching Aim': 'mods/standard/unflinching kinetic aim.png',
  'mod:Weapon Surge': 'mods/standard/kinetic weapon surge.png',
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const map = {};
const converted = new Map(); // source file -> url, so shared sources are written once
let bytes = 0;
for (const [key, rel] of Object.entries(ICONS)) {
  const file = path.join(SRC, rel);
  if (!fs.existsSync(file)) throw new Error(`${key}: missing ${rel}`);
  let url = converted.get(rel);
  if (!url) {
    const name = `${slug(path.basename(rel, path.extname(rel)))}.webp`;
    const buf = await sharp(file).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer();
    fs.writeFileSync(path.join(OUT, name), buf);
    bytes += buf.length;
    url = `/icons/${name}`;
    converted.set(rel, url);
  }
  map[key] = url;
}

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'localIcons.json'), JSON.stringify(map, null, 2) + '\n');
console.log(`${Object.keys(map).length} icons -> ${converted.size} files, ${(bytes / 1024).toFixed(1)} KB`);
