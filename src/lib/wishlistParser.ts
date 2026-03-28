/**
 * DIM "voltron.txt" Wishlist Parser
 *
 * Format (one per line):
 *   dimwishlist:item=<weaponHash>&perks=<perkHash1>,<perkHash2>[&tags=tag1,tag2]
 *
 * Lines starting with '//' are comments.
 * Lines starting with 'title:' or 'description:' are metadata.
 *
 * A wishlist entry matches a roll when EVERY perk in its perk list is present
 * among the currently selected perk hashes.
 */

export interface WishlistEntry {
  weaponHash: string;
  /** Each inner array is a set of perk hashes that must ALL be selected */
  perkSets: string[][];
  tags: string[];
}

/** Map from weaponHash → all wishlist entries for that weapon */
export type WishlistDb = Map<string, WishlistEntry[]>;

export function parseWishlist(text: string): WishlistDb {
  const db: WishlistDb = new Map();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('title:') || line.startsWith('description:')) {
      continue;
    }
    if (!line.startsWith('dimwishlist:')) continue;

    // Strip prefix
    const payload = line.slice('dimwishlist:'.length);
    const params = new URLSearchParams(payload);

    const itemStr = params.get('item');
    const perksStr = params.get('perks');
    if (!itemStr || !perksStr) continue;

    // Negative item IDs are used by DIM for exclusion lists — skip them
    if (itemStr.startsWith('-')) continue;

    const perkHashes = perksStr
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (perkHashes.length === 0) continue;

    const tags = (params.get('tags') ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const existing = db.get(itemStr);
    if (existing) {
      // Check if identical perk set already present
      const isDupe = existing.some(
        (e) => e.perkSets.some((set) => set.join(',') === perkHashes.join(','))
      );
      if (!isDupe) existing.push({ weaponHash: itemStr, perkSets: [perkHashes], tags });
    } else {
      db.set(itemStr, [{ weaponHash: itemStr, perkSets: [perkHashes], tags }]);
    }
  }

  return db;
}

/**
 * Returns true if the selected perk hashes satisfy at least one wishlist entry
 * for the given weapon hash.
 */
export function isWishlistMatch(
  wishlistDb: WishlistDb,
  weaponHash: string,
  selectedPerkHashes: string[],
): boolean {
  const entries = wishlistDb.get(weaponHash);
  if (!entries || entries.length === 0) return false;

  const selectedSet = new Set(selectedPerkHashes);
  return entries.some((entry) =>
    entry.perkSets.some((perkSet) =>
      perkSet.every((hash) => selectedSet.has(hash))
    )
  );
}

/**
 * Export personal god rolls as a DIM-compatible wishlist file.
 * personalRolls: { weaponHash, weaponName, perkHashes }[]
 */
export function exportPersonalWishlist(
  personalRolls: { weaponHash: string; weaponName: string; perkHashes: string[] }[]
): string {
  const lines = [
    `title:Personal God Rolls`,
    `description:Exported from D2 Theorycraft — ${new Date().toLocaleDateString()}`,
    '',
  ];
  for (const roll of personalRolls) {
    lines.push(`// ${roll.weaponName}`);
    lines.push(`dimwishlist:item=${roll.weaponHash}&perks=${roll.perkHashes.join(',')}&tags=personal`);
  }
  return lines.join('\n');
}
