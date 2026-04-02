import { Weapon, WeaponGroup } from '../types/weapon';

/** Variant priority for default selection (index 0 = highest priority = loaded first) */
const VARIANT_PRIORITY = ['Adept', 'Timelost', 'Harrowed', 'Brave'];

function variantPriority(w: Weapon): number {
  // Base (no variantLabel) always loads first — user can toggle to Adept in the header.
  if (!w.variantLabel) return -1;
  const idx = VARIANT_PRIORITY.indexOf(w.variantLabel);
  return idx === -1 ? VARIANT_PRIORITY.length : idx;
}

/**
 * Group a flat weapon array into families sharing the same baseName.
 * Within each group, variants are sorted best-first (Adept > Timelost > Harrowed > base).
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
    // Sort best variant first
    variants.sort((a: Weapon, b: Weapon) => variantPriority(a) - variantPriority(b));
    groups.push({
      baseName,
      variants,
      default: variants[0],
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
