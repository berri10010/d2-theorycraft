import type { Weapon, GameMode, DamageType } from '../types/weapon';
import { BUNGIE_URL } from './bungieUrl';
import { getStatsForWeapon } from './weaponStatMappings';

/** One perk the weapon can roll in a column, and whether the roll has it selected. */
export interface CardPerk {
  name: string;
  iconUrl: string | null;
  selected: boolean;
  enhanced: boolean;
}

/** Everything the card shows, resolved to plain values so the drawing code has no store or weapon logic. */
export interface RollCardData {
  name: string;
  variantLabel: string | null;
  rarity: string | null;
  itemType: string;
  flavorText: string | null;
  damageType: DamageType;
  mode: GameMode;
  masterwork: string | null;
  crafted: boolean;
  columns: Array<{ name: string; perks: CardPerk[] }>;
  intrinsic: { name: string; description: string; iconUrl: string | null } | null;
  /** Stats drawn as a bar with a number (0 to 100). */
  bars: Array<{ label: string; value: number }>;
  /** Stats shown as a plain number (rounds per minute, magazine, recoil direction). */
  numbers: Array<{ label: string; value: number }>;
  imageUrl: string | null;
  iconUrl: string | null;
  url: string;
}

/** The names the game's inspect screen uses, where ours differ. */
const GAME_LABEL: Record<string, string> = {
  Reload: 'Reload Speed',
  'Aim Assistance': 'Aim Assistance',
  RPM: 'Rounds Per Minute',
};

const BAR_STATS = new Set([
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Velocity', 'Blast Radius', 'Accuracy',
  'Zoom', 'Airborne Effectiveness', 'Ammo Generation',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration',
  'Cooling Efficiency', 'Heat Generated', 'Vent Speed', 'Persistence',
]);
const NUMBER_STATS = new Set(['RPM', 'Magazine', 'Recoil Direction', 'Charge Time', 'Draw Time', 'Ammo Capacity', 'Inventory Size']);
const MAX_BARS = 10;
const MAX_NUMBERS = 4;
/** Options shown per perk column; the selected one is always kept. */
const MAX_ROWS = 4;

const abs = (path: string | null | undefined) => (path ? (path.startsWith('http') ? path : `${BUNGIE_URL}${path}`) : null);

export function buildRollCardData(opts: {
  weapon: Weapon;
  selectedPerks: Record<string, string>;
  calcStats: Record<string, number>;
  mode: GameMode;
  masterworkStat: string | null;
  isCrafted: boolean;
  url: string;
  /** The intrinsic's description, resolved by the caller (it can come from Clarity, which loads separately). */
  intrinsicDescription?: string | null;
}): RollCardData {
  const { weapon, selectedPerks, calcStats } = opts;

  const columns = weapon.perkSockets.map((column) => {
    const chosen = selectedPerks[column.name];
    // An origin trait is not a choice: it is always the one the weapon has.
    const selectedHash = chosen ?? (column.columnType === 'origin' ? column.perks[0]?.hash : undefined);
    const all: CardPerk[] = column.perks.map((p) => ({
      name: p.name,
      iconUrl: abs(p.icon),
      selected: selectedHash !== undefined && (p.hash === selectedHash || p.enhancedVersion?.hash === selectedHash),
      enhanced: p.isEnhanced,
    }));
    let perks = all.slice(0, MAX_ROWS);
    const sel = all.findIndex((p) => p.selected);
    if (sel >= MAX_ROWS) perks = [...all.slice(0, MAX_ROWS - 1), all[sel]];
    return { name: column.name, perks };
  }).filter((c) => c.perks.length > 0);

  const statValue = (label: string) => Math.round(calcStats[label] ?? weapon.baseStats[label] ?? (label === 'RPM' ? weapon.rpm : NaN));
  const wanted = getStatsForWeapon(weapon.itemTypeDisplayName, weapon.intrinsicTrait?.name ?? null);
  const pick = (set: Set<string>, max: number) => wanted
    .filter((s) => set.has(s))
    .map((s) => ({ label: GAME_LABEL[s] ?? s, value: statValue(s) }))
    .filter((s) => Number.isFinite(s.value))
    .slice(0, max);

  const intr = weapon.intrinsicTrait;
  return {
    name: weapon.baseName || weapon.name,
    variantLabel: weapon.variantLabel,
    rarity: weapon.rarity,
    itemType: weapon.itemTypeDisplayName,
    flavorText: weapon.flavorText,
    damageType: weapon.damageType,
    mode: opts.mode,
    masterwork: opts.masterworkStat,
    crafted: opts.isCrafted,
    columns,
    intrinsic: intr ? { name: intr.name, description: opts.intrinsicDescription ?? intr.description ?? '', iconUrl: abs(intr.icon) } : null,
    bars: pick(BAR_STATS, MAX_BARS),
    numbers: pick(NUMBER_STATS, MAX_NUMBERS),
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
// Laid out like the game's weapon inspect screen: rarity-tinted grey, big uppercase name, every perk option of a
// column stacked with the rolled one lit, the intrinsic below, the weapon art on the right and the stats under it.

export const CARD_W = 1920;
export const CARD_H = 1080;

const RARITY_GLOW: Record<string, string> = {
  Exotic: '206,174,51', Legendary: '128,82,158', Rare: '80,120,170', Uncommon: '60,140,80', Common: '140,140,150',
};
const RARITY_LINE: Record<string, string> = {
  Exotic: '#ceae33', Legendary: '#a47cc4', Rare: '#5078aa', Uncommon: '#3c8c50', Common: '#8c8c96',
};

export interface CardImages {
  hero: HTMLImageElement | null;
  icon: HTMLImageElement | null;
  intrinsic: HTMLImageElement | null;
  /** Same shape as `data.columns[i].perks[j]`. */
  perks: Array<Array<HTMLImageElement | null>>;
}

const CARD_IMAGE_TIMEOUT_MS = 8000;

/**
 * Loads an image so it can be drawn on a canvas that must stay exportable. An `<img crossOrigin>` is not enough: the
 * browser may serve the same URL from its cache from an earlier plain `<img>` load, a copy stored without CORS
 * headers, and drawing that taints the canvas. A CORS `fetch` that bypasses the cache always gets the right headers.
 */
export async function loadCardImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  // A hung request must not hold the whole card back: after the timeout the image simply draws as a blank.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve(null); }, CARD_IMAGE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchCardImage(url, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCardImage(url: string, signal: AbortSignal): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store', signal });
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
    loadCardImage(data.intrinsic?.iconUrl ?? null),
    Promise.all(data.columns.map((c) => Promise.all(c.perks.map((p) => loadCardImage(p.iconUrl))))),
  ]).then(([hero, icon, intrinsic, perks]) => ({ hero, icon, intrinsic, perks }));
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = fit(ctx, `${lines[maxLines - 1]}…`, maxWidth); }
  return lines;
}

function drawPerk(ctx: CanvasRenderingContext2D, perk: CardPerk, img: HTMLImageElement | null, cx: number, cy: number) {
  const r = 40;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (perk.selected) {
    const g = ctx.createRadialGradient(cx, cy - 10, 6, cx, cy, r);
    g.addColorStop(0, '#8fbde6'); g.addColorStop(1, '#5e93c7');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (perk.enhanced) {
      const gold = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      gold.addColorStop(0.35, 'rgba(231,196,92,0)'); gold.addColorStop(1, 'rgba(231,196,92,0.95)');
      ctx.fillStyle = gold;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  } else {
    ctx.fillStyle = perk.enhanced ? 'rgba(60,52,30,0.75)' : 'rgba(34,36,44,0.78)';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  if (img) ctx.drawImage(img, cx - 34, cy - 34, 68, 68);
  ctx.restore();
  ctx.lineWidth = perk.selected ? 2 : 1.5;
  ctx.strokeStyle = perk.selected ? 'rgba(255,255,255,0.9)' : perk.enhanced ? 'rgba(231,196,92,0.7)' : 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (perk.enhanced) { // the in-game "enhanced" arrow, top left of the circle
    ctx.fillStyle = '#e7c45c';
    ctx.beginPath(); ctx.moveTo(cx - 36, cy - 30); ctx.lineTo(cx - 29, cy - 40); ctx.lineTo(cx - 22, cy - 30); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 31, cy - 31, 4, 16);
  }
}

export function drawRollCard(canvas: HTMLCanvasElement, data: RollCardData, images: CardImages, fontFamily = 'system-ui, sans-serif') {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const font = (w: number | string, px: number, style = '') => `${style} ${w} ${px}px ${fontFamily}`.trim();
  const rarity = data.rarity ?? 'Common';
  const glow = RARITY_GLOW[rarity] ?? RARITY_GLOW.Common;
  const line = RARITY_LINE[rarity] ?? RARITY_LINE.Common;

  // Grey base with a rarity glow behind the weapon, as in the game
  const base = ctx.createLinearGradient(0, 0, 0, CARD_H);
  base.addColorStop(0, '#4a4a52'); base.addColorStop(1, '#2a2b32');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const halo = ctx.createRadialGradient(1500, 300, 60, 1500, 300, 1000);
  halo.addColorStop(0, `rgba(${glow},0.75)`); halo.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Weapon art: Bungie's screenshot is the gun on the game's own rarity backdrop, so it goes full-bleed, with the
  // left side pulled back to grey so the perks and text stay readable.
  if (images.hero) {
    const h = (images.hero.height / images.hero.width) * CARD_W;
    ctx.drawImage(images.hero, 0, (CARD_H - h) / 2, CARD_W, h);
    const left = ctx.createLinearGradient(0, 0, 1100, 0);
    left.addColorStop(0, 'rgba(38,39,46,0.92)'); left.addColorStop(0.7, 'rgba(38,39,46,0.55)'); left.addColorStop(1, 'rgba(38,39,46,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, 1100, CARD_H);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, 0, CARD_W, 48);
  ctx.fillStyle = line; ctx.fillRect(0, 44, CARD_W, 4);

  // Header
  const left = 144;
  ctx.textBaseline = 'alphabetic';
  if (images.icon) {
    ctx.drawImage(images.icon, left, 106, 96, 96);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(left, 106, 96, 96);
  }
  const hx = left + 96 + 28;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#fff';
  ctx.font = font(500, 76);
  ctx.fillText(fit(ctx, data.name.toUpperCase(), 1080 - hx), hx, 168);
  ctx.font = font(400, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText([data.itemType.toUpperCase(), data.variantLabel?.toUpperCase()].filter(Boolean).join(' | '), hx, 208);
  ctx.shadowBlur = 0;
  if (data.flavorText) {
    ctx.font = font(400, 24, 'italic');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(fit(ctx, data.flavorText, 900), left, 262);
  }

  // Weapon perks
  const sectionLabel = (text: string, y: number, width: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = font(400, 24);
    ctx.fillText(text, left, y);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(left, y + 14, width, 3);
  };
  sectionLabel('WEAPON PERKS', 330, 730);
  const colW = 105, rowH = 97, top = 408;
  data.columns.forEach((col, ci) => {
    const cx = left + 47 + ci * colW;
    if (ci > 0) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(left + ci * colW - 3, 362, 2, 290); }
    col.perks.forEach((perk, pi) => drawPerk(ctx, perk, images.perks[ci]?.[pi] ?? null, cx, top + pi * rowH));
  });
  const maxRows = Math.max(1, ...data.columns.map((c) => c.perks.length));
  let y = top + (maxRows - 1) * rowH + 40 + 70;

  // Intrinsic trait
  if (data.intrinsic) {
    sectionLabel('INTRINSIC TRAITS', y, 730);
    y += 44;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(left, y, 96, 96);
    if (images.intrinsic) ctx.drawImage(images.intrinsic, left + 8, y + 8, 80, 80);
    ctx.fillStyle = '#fff';
    ctx.font = font(700, 30);
    ctx.fillText(fit(ctx, data.intrinsic.name.toUpperCase(), 600), left + 120, y + 34);
    ctx.font = font(400, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    wrap(ctx, data.intrinsic.description, 610, 2).forEach((l, i) => ctx.fillText(l, left + 120, y + 70 + i * 32));
  }

  // Stats, bottom right
  const labelX = 1490, barX = 1502, barW = 210, valX = 1780, rowS = 28;
  const statsTop = CARD_H - 60 - (data.bars.length + (data.numbers.length ? 1 : 0) + data.numbers.length) * rowS - 40;
  const shade = ctx.createRadialGradient(1500, statsTop + 150, 40, 1500, statsTop + 150, 420);
  shade.addColorStop(0, 'rgba(10,10,16,0.62)'); shade.addColorStop(1, 'rgba(10,10,16,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(1000, statsTop - 200, 920, 700);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6;
  ctx.textBaseline = 'middle';
  let sy = statsTop;
  ctx.font = font(400, 24);
  for (const s of data.bars) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(s.label, labelX, sy);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(barX, sy - 8, barW, 16);
    ctx.fillStyle = '#fff'; ctx.fillRect(barX, sy - 8, (barW * Math.max(0, Math.min(100, s.value))) / 100, 16);
    ctx.fillText(String(s.value), valX, sy);
    sy += rowS;
  }
  if (data.numbers.length) {
    sy += rowS * 0.6;
    for (const s of data.numbers) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(s.label, labelX, sy);
      ctx.textAlign = 'left';
      ctx.fillText(String(s.value), labelX + 28, sy);
      sy += rowS;
    }
  }
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;

  // Footer (where the game has "Appearance"): what this roll was calculated for, and where it came from
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, CARD_H - 56, CARD_W, 56);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = font(500, 22);
  const tags = [data.mode === 'pve' ? 'PvE' : 'PvP', data.masterwork ? `${data.masterwork} masterwork` : null, data.crafted ? 'Crafted' : null].filter(Boolean).join('  ·  ');
  ctx.fillText(tags, left, CARD_H - 28);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 22);
  ctx.fillText('D2 THEORYCRAFT  ·  d2theorycraft.com', CARD_W - left, CARD_H - 28);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
