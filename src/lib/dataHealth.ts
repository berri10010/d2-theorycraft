import type { WeaponStatEntry } from './weaponStats';

/** What the daily refresh produces, reduced to what a human wants to review. */
export interface DataSnapshot {
  weapons: Array<{ hash: string; name: string }>;
  perkCount: number;
  sourceCount: number;
  pvpCount: number;
  stats: WeaponStatEntry[];
}

export interface HealthReport {
  markdown: string;
  /** Problems bad enough to stop the refresh from being committed. */
  errors: string[];
  warnings: string[];
  /** False when nothing the site uses changed. */
  changed: boolean;
}

const STAT_FIELDS = ['bodyDamage', 'critDamage', 'shotDelay', 'burstDelay', 'chargeMs', 'shotsPerBurst', 'pellets'] as const;

/** A refresh that shrinks a data set by more than this is treated as a broken download. */
const MAX_WEAPON_DROP = 0.05;
const MAX_PERK_DROP = 0.1;
const MAX_STAT_ROWS_LOST = 10;
const LIST_LIMIT = 15;

const fmt = (v: number | null | undefined) => (v == null ? '–' : String(Math.round(v * 1000) / 1000));

function list(items: string[]): string {
  const shown = items.slice(0, LIST_LIMIT).join(', ');
  return items.length > LIST_LIMIT ? `${shown}, … (+${items.length - LIST_LIMIT} more)` : shown;
}

function statDiffs(before: WeaponStatEntry[], after: WeaponStatEntry[]) {
  const old = new Map(before.map((e) => [e.lookup, e]));
  const now = new Map(after.map((e) => [e.lookup, e]));
  const added = after.filter((e) => !old.has(e.lookup)).map((e) => e.lookup);
  const removed = before.filter((e) => !now.has(e.lookup)).map((e) => e.lookup);
  const changed: string[] = [];
  for (const e of after) {
    const o = old.get(e.lookup);
    if (!o) continue;
    const parts = STAT_FIELDS.filter((f) => (o[f] ?? null) !== (e[f] ?? null)).map((f) => `${f} ${fmt(o[f])}→${fmt(e[f])}`);
    if (parts.length) changed.push(`${e.lookup} (${parts.join(', ')})`);
  }
  return { added, removed, changed };
}

export function compareSnapshots(before: DataSnapshot | null, after: DataSnapshot): HealthReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = ['## Data refresh report', ''];

  // Sanity checks on the new data, independent of what it replaced.
  for (const e of after.stats) {
    const nums = [e.bodyDamage, e.critDamage, e.shotDelay ?? 0, e.burstDelay ?? 0, e.chargeMs ?? 0];
    if (nums.some((n) => !Number.isFinite(n))) errors.push(`Weapon stats row "${e.lookup}" has a non-numeric value.`);
    else if (e.critDamage < e.bodyDamage) warnings.push(`"${e.lookup}": crit damage is below body damage.`);
  }
  if (after.weapons.length === 0) errors.push('The refreshed weapon list is empty.');

  if (!before) {
    lines.push('No previous data to compare against.', '');
  } else {
    const oldW = new Map(before.weapons.map((w) => [w.hash, w.name]));
    const newW = new Map(after.weapons.map((w) => [w.hash, w.name]));
    const addedW = after.weapons.filter((w) => !oldW.has(w.hash)).map((w) => w.name);
    const removedW = before.weapons.filter((w) => !newW.has(w.hash)).map((w) => w.name);
    const stats = statDiffs(before.stats, after.stats);

    lines.push('| Data | Before | After |', '|---|---|---|');
    lines.push(`| Weapons | ${before.weapons.length} | ${after.weapons.length} |`);
    lines.push(`| Perks | ${before.perkCount} | ${after.perkCount} |`);
    lines.push(`| Weapon sources | ${before.sourceCount} | ${after.sourceCount} |`);
    lines.push(`| PvP wishlist weapons | ${before.pvpCount} | ${after.pvpCount} |`);
    lines.push(`| Weapon stat rows | ${before.stats.length} | ${after.stats.length} |`, '');

    if (addedW.length) lines.push(`**New weapons (${addedW.length}):** ${list(addedW)}`, '');
    if (removedW.length) lines.push(`**Removed weapons (${removedW.length}):** ${list(removedW)}`, '');
    if (stats.added.length) lines.push(`**New stat rows (${stats.added.length}):** ${list(stats.added)}`, '');
    if (stats.removed.length) lines.push(`**Stat rows dropped (${stats.removed.length}):** ${list(stats.removed)}`, '');
    if (stats.changed.length) lines.push(`**Stat rows changed (${stats.changed.length}):**`, ...stats.changed.slice(0, LIST_LIMIT).map((c) => `- ${c}`), stats.changed.length > LIST_LIMIT ? `- … (+${stats.changed.length - LIST_LIMIT} more)` : '', '');

    if (before.weapons.length && removedW.length / before.weapons.length > MAX_WEAPON_DROP) {
      errors.push(`${removedW.length} of ${before.weapons.length} weapons disappeared (more than ${MAX_WEAPON_DROP * 100}%).`);
    }
    if (before.perkCount && (before.perkCount - after.perkCount) / before.perkCount > MAX_PERK_DROP) {
      errors.push(`Perk count fell from ${before.perkCount} to ${after.perkCount}.`);
    }
    if (stats.removed.length > MAX_STAT_ROWS_LOST) errors.push(`${stats.removed.length} weapon stat rows disappeared.`);
    if (stats.removed.length) warnings.push(`${stats.removed.length} weapon stat row(s) disappeared: ${list(stats.removed)}.`);
    if (after.sourceCount < before.sourceCount * 0.8) warnings.push(`Weapon sources fell from ${before.sourceCount} to ${after.sourceCount}.`);
    if (after.pvpCount < before.pvpCount * 0.8) warnings.push(`PvP wishlist fell from ${before.pvpCount} to ${after.pvpCount} weapons.`);

    const changed =
      addedW.length + removedW.length + stats.added.length + stats.removed.length + stats.changed.length > 0 ||
      before.perkCount !== after.perkCount || before.sourceCount !== after.sourceCount || before.pvpCount !== after.pvpCount;
    if (!changed) lines.push('No changes to weapons, perks, sources, PvP wishlist or weapon stats.', '');
    return finish(lines, errors, warnings, changed);
  }
  return finish(lines, errors, warnings, true);
}

function finish(lines: string[], errors: string[], warnings: string[], changed: boolean): HealthReport {
  if (errors.length) lines.push('### Errors', ...errors.map((e) => `- ${e}`), '');
  if (warnings.length) lines.push('### Warnings', ...warnings.map((w) => `- ${w}`), '');
  return { markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', errors, warnings, changed };
}
