import { Weapon, WeaponGroup } from '../types/weapon';

/** Variant sort order within a group — base loads first so the header toggle starts on base. */
const VARIANT_PRIORITY = ['Adept', 'Timelost', 'Harrowed', 'Brave'];

function variantPriority(w: Weapon): number {
  // Base (no variantLabel) always loads first — user can toggle to Adept in the header.
  if (!w.variantLabel) return -1;
  const idx = VARIANT_PRIORITY.indexOf(w.variantLabel);
  return idx === -1 ? VARIANT_PRIORITY.length : idx;
}

/**
 * Select the single Default Variant for a weapon group using a strict hierarchy:
 *  1. Highest seasonNumber (null treated as 0) — never pick a lower season if a higher exists.
 *  2. Base version (variantLabel === null) over specialised variants within that season.
 *  3. Presence of an icon asset as a tie-breaker between otherwise identical candidates.
 */
function selectDefault(variants: Weapon[]): Weapon {
  const maxSeason = Math.max(...variants.map(v => v.seasonNumber ?? 0));
  let candidates = variants.filter(v => (v.seasonNumber ?? 0) === maxSeason);

  const baseOnly = candidates.filter(v => v.variantLabel === null);
  if (baseOnly.length > 0) candidates = baseOnly;

  const withIcon = candidates.filter(v => !!v.icon);
  return withIcon.length > 0 ? withIcon[0] : candidates[0];
}

/**
 * Group a flat weapon array into families sharing the same baseName.
 * Within each group, variants are sorted base-first for the header variant toggle.
 * The `default` field is chosen by selectDefault (highest season → base → has icon).
 * Only groups with ≥1 member are returned.
 */
export function groupWeapons(weapons: Weapon[]): WeaponGroup[] {
  const map = new Map<string, Weapon[]>();

  for (const w of weapons) {
    const existing = map.get(w.baseName);
    if (existing) {
      existing.push(w);
    } else {
      map.set(w.baseName, [w]);
    }
  }

  const groups: WeaponGroup[] = [];
  map.forEach((variants, baseName) => {
    variants.sort((a: Weapon, b: Weapon) => variantPriority(a) - variantPriority(b));
    groups.push({
      baseName,
      variants,
      default: selectDefault(variants),
    });
  });

  // Sort groups alphabetically by baseName
  groups.sort((a, b) => a.baseName.localeCompare(b.baseName));
  return groups;
}

/** Given a weapon, determine if it is a "legacy" variant (not the best in its group) */
export function isLegacyVariant(weapon: Weapon, group: WeaponGroup): boolean {
  // Legacy if it's the base version but there exist Adept/Timelost variants
  if (weapon.isAdept) return false;
  return group.variants.some((v) => v.isAdept);
}
