import type { Weapon, GameMode, DamageType } from '../types/weapon';
import { BUNGIE_URL } from './bungieUrl';
import { getStatsForWeapon } from './weaponStatMappings';

/** Everything the card shows, resolved to plain values so the drawing code has no store or weapon logic. */
export interface RollCardData {
  name: string;
  variantLabel: string | null;
  rarity: string | null;
  typeLine: string;
  frame: string | null;
  damageType: DamageType;
  mode: GameMode;
  masterwork: string | null;
  crafted: boolean;
  perks: Array<{ column: string; name: string; iconUrl: string | null }>;
  stats: Array<{ label: string; value: number; bar: boolean }>;
  imageUrl: string | null;
  iconUrl: string | null;
  url: string;
}

const AMMO: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
const ELEMENT: Record<DamageType, string> = {
  kinetic: 'Kinetic', arc: 'Arc', solar: 'Solar', void: 'Void', stasis: 'Stasis', strand: 'Strand',
};

/** Stats drawn as bars on the card (0 to 100 scale), in the order getStatsForWeapon lists them for the weapon. */
const BAR_STATS = new Set([
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Velocity', 'Blast Radius', 'Accuracy',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration',
  'Cooling Efficiency', 'Heat Generated', 'Vent Speed', 'Persistence',
]);
const NUMBER_STATS = new Set(['Magazine', 'Zoom', 'Airborne Effectiveness', 'Ammo Generation']);
const MAX_STATS = 9;

const abs = (path: string | null | undefined) => (path ? (path.startsWith('http') ? path : `${BUNGIE_URL}${path}`) : null);

export function buildRollCardData(opts: {
  weapon: Weapon;
  selectedPerks: Record<string, string>;
  calcStats: Record<string, number>;
  mode: GameMode;
  masterworkStat: string | null;
  isCrafted: boolean;
  url: string;
}): RollCardData {
  const { weapon, selectedPerks, calcStats } = opts;

  const perks = weapon.perkSockets.flatMap((column) => {
    const hash = selectedPerks[column.name];
    if (!hash) return [];
    const perk = column.perks.find((p) => p.hash === hash)
      ?? column.perks.map((p) => p.enhancedVersion).find((p) => p?.hash === hash);
    return perk ? [{ column: column.name, name: perk.name, iconUrl: abs(perk.icon) }] : [];
  });

  const wanted = getStatsForWeapon(weapon.itemTypeDisplayName, weapon.intrinsicTrait?.name ?? null);
  const stats = wanted
    .filter((s) => BAR_STATS.has(s) || NUMBER_STATS.has(s))
    .map((label) => ({ label, value: Math.round(calcStats[label] ?? weapon.baseStats[label] ?? NaN), bar: BAR_STATS.has(label) }))
    .filter((s) => Number.isFinite(s.value))
    // Bars first (they carry the picture), then the plain numbers, capped so the card stays readable.
    .sort((a, b) => Number(b.bar) - Number(a.bar))
    .slice(0, MAX_STATS);

  return {
    name: weapon.baseName || weapon.name,
    variantLabel: weapon.variantLabel,
    rarity: weapon.rarity,
    typeLine: [weapon.itemTypeDisplayName, ELEMENT[weapon.damageType] ?? 'Kinetic', AMMO[weapon.ammoType]].filter(Boolean).join(' · '),
    frame: weapon.intrinsicTrait?.name ?? null,
    damageType: weapon.damageType,
    mode: opts.mode,
    masterwork: opts.masterworkStat,
    crafted: opts.isCrafted,
    perks,
    stats,
    imageUrl: abs(weapon.screenshot),
    iconUrl: abs(weapon.icon),
    url: opts.url,
  };
}

/** File name for a saved card: "the-messenger-roll.png". */
export function rollCardFileName(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'weapon'}-roll.png`;
}

// ── Drawing ──────────────────────────────────────────────────────────────────

export const CARD_W = 1200;
export const CARD_H = 630;

const ELEMENT_TINT: Record<DamageType, string> = {
  kinetic: '#94a3b8', arc: '#60a5fa', solar: '#fb923c', void: '#c084fc', stasis: '#22d3ee', strand: '#34d399',
};
const RARITY_COLOR: Record<string, string> = { Exotic: '#fbbf24', Legendary: '#d8b4fe' };

export interface CardImages {
  hero: HTMLImageElement | null;
  icon: HTMLImageElement | null;
  perks: Array<HTMLImageElement | null>;
}

/**
 * Loads an image so it can be drawn on a canvas that must stay exportable. An `<img crossOrigin>` is not enough: the
 * browser may serve the same URL from its cache from an earlier plain `<img>` load, a copy stored without CORS
 * headers, and drawing that taints the canvas. A CORS `fetch` that bypasses the cache always gets the right headers.
 */
export async function loadCardImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) return null;
    const objectUrl = URL.createObjectURL(await res.blob());
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null); };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

export function loadCardImages(data: RollCardData): Promise<CardImages> {
  return Promise.all([
    loadCardImage(data.imageUrl),
    loadCardImage(data.iconUrl),
    Promise.all(data.perks.map((p) => loadCardImage(p.iconUrl))),
  ]).then(([hero, icon, perks]) => ({ hero, icon, perks }));
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export function drawRollCard(canvas: HTMLCanvasElement, data: RollCardData, images: CardImages, fontFamily = 'system-ui, sans-serif') {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const tint = ELEMENT_TINT[data.damageType] ?? ELEMENT_TINT.kinetic;
  const font = (w: number | string, px: number) => `${w} ${px}px ${fontFamily}`;

  // Background
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#0b0e14');
  bg.addColorStop(1, '#141a26');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Weapon art, faded in from the left
  if (images.hero) {
    const h = CARD_H;
    const w = (images.hero.width / images.hero.height) * h;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(images.hero, CARD_W - w + 120, 0, w, h);
    ctx.globalAlpha = 1;
  }
  const fade = ctx.createLinearGradient(0, 0, CARD_W, 0);
  fade.addColorStop(0, 'rgba(11,14,20,0.97)');
  fade.addColorStop(0.45, 'rgba(11,14,20,0.82)');
  fade.addColorStop(1, 'rgba(11,14,20,0.35)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Element accent bar
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 8, CARD_H);

  // Header
  const pad = 48;
  let x = pad;
  if (images.icon) {
    ctx.drawImage(images.icon, pad, 40, 72, 72);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, 40, 72, 72);
    x = pad + 72 + 20;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = RARITY_COLOR[data.rarity ?? ''] ?? '#f1f5f9';
  ctx.font = font(800, 44);
  ctx.fillText(fit(ctx, data.name, 640 - (x - pad)), x, 82);
  ctx.fillStyle = '#94a3b8';
  ctx.font = font(500, 20);
  const sub = [data.typeLine, data.variantLabel].filter(Boolean).join(' · ');
  ctx.fillText(fit(ctx, sub, 640 - (x - pad)), x, 112);

  // Perks
  const rowH = 66;
  let y = 160;
  ctx.font = font(700, 14);
  ctx.fillStyle = '#64748b';
  ctx.fillText('ROLL', pad, y - 14);
  if (data.frame) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = font(600, 18);
    ctx.fillText(fit(ctx, data.frame, 520), pad + 56 + 18, y + 20);
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.arc(pad + 28, y + 14, 6, 0, Math.PI * 2); ctx.fill();
    y += 46;
  }
  if (data.perks.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = font(500, 18);
    ctx.fillText('No perks chosen yet.', pad, y + 28);
  }
  data.perks.forEach((perk, i) => {
    const cy = y + i * rowH + 28;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(pad + 28, cy, 27, 0, Math.PI * 2); ctx.fill();
    const img = images.perks[i];
    if (img) {
      ctx.save();
      ctx.beginPath(); ctx.arc(pad + 28, cy, 24, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, pad + 4, cy - 24, 48, 48);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pad + 28, cy, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = font(700, 22);
    ctx.fillText(fit(ctx, perk.name, 480), pad + 72, cy + 2);
    ctx.fillStyle = '#64748b';
    ctx.font = font(600, 14);
    ctx.fillText(perk.column.toUpperCase(), pad + 72, cy + 22);
  });

  // Stats
  const sx = 700, sw = 450;
  let sy = 160;
  ctx.fillStyle = '#64748b';
  ctx.font = font(700, 14);
  ctx.fillText('STATS', sx, sy - 14);
  ctx.textBaseline = 'middle';
  for (const stat of data.stats) {
    const cy = sy + 18;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = font(600, 18);
    ctx.textAlign = 'left';
    ctx.fillText(stat.label.replace('Airborne Effectiveness', 'Airborne').replace('Ammo Generation', 'Ammo Gen').replace('Aim Assistance', 'Aim Assist'), sx, cy);
    if (stat.bar) {
      const bx = sx + 150, bw = sw - 150 - 54;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bx, cy - 5, bw, 10);
      ctx.fillStyle = tint;
      ctx.fillRect(bx, cy - 5, (bw * Math.max(0, Math.min(100, stat.value))) / 100, 10);
    }
    ctx.fillStyle = '#f8fafc';
    ctx.font = font(800, 20);
    ctx.textAlign = 'right';
    ctx.fillText(String(stat.value), sx + sw, cy);
    sy += 44;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Footer
  const tags = [data.mode === 'pve' ? 'PvE' : 'PvP', data.masterwork ? `${data.masterwork} masterwork` : null, data.crafted ? 'Crafted' : null].filter(Boolean).join(' · ');
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, CARD_H - 56, CARD_W, 56);
  ctx.fillStyle = '#94a3b8';
  ctx.font = font(600, 18);
  ctx.fillText(tags, pad, CARD_H - 21);
  ctx.fillStyle = tint;
  ctx.font = font(800, 20);
  ctx.textAlign = 'right';
  ctx.fillText('D2 Theorycraft · d2theorycraft.com', CARD_W - pad, CARD_H - 20);
  ctx.textAlign = 'left';
}
