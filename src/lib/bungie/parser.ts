import { Weapon, Perk, PerkColumn, StatMap } from '../../types/weapon';

const BUNGIE_ROOT = 'https://www.bungie.net';
import {
  BungieInventoryItem,
  BungieSocketCategoryDefinition,
  BungiePlugSetDefinition,
  BungieSeasonDefinition,
} from './bungieTypes';
import { getCurves } from '../archetypes';
import { getBuffKeyForPerk } from '../buffDatabase';
import { getPerkTier } from '../perkTierDatabase';

const WEAPON_ITEM_TYPE = 3;

// ──────────────────────────────────────────────────
// Variant / family detection
// ──────────────────────────────────────────────────

/** Ordered from highest to lowest priority for default selection */
const VARIANT_SUFFIXES = ['(Adept)', '(Timelost)', '(Harrowed)', '(Brave)'] as const;
type VariantLabel = typeof VARIANT_SUFFIXES[number] extends `(${infer L})` ? L : never;

function extractBaseName(name: string): string {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(' ' + suffix)) return name.slice(0, name.length - suffix.length - 1);
  }
  return name;
}

function extractVariantLabel(name: string): string | null {
  for (const suffix of VARIANT_SUFFIXES) {
    if (name.endsWith(' ' + suffix)) return suffix.slice(1, -1); // strip parens
  }
  return null;
}

function isAdeptVariant(name: string): boolean {
  return VARIANT_SUFFIXES.some((s) => name.endsWith(' ' + s));
}

const STAT_HASH_MAP: Record<number, string> = {
  4043523819: 'Impact',
  1240592695: 'Range',
  155624089:  'Stability',
  943549884:  'Handling',
  4188031367: 'Reload',
  1345609583: 'Aim Assistance',
  3555269338: 'Zoom',
  2715839340: 'Recoil Direction',
  2714457168: 'Airborne Effectiveness',
  4284893193: 'RPM',
  3871231066: 'Magazine',
  2168534779: 'Charge Time',
  1935470627: 'Draw Time',
};

// Stats stored in baseStats (used for display + stat modifier math)
const DISPLAY_STATS = new Set([
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
  'Zoom', 'Recoil Direction', 'Magazine', 'Airborne Effectiveness',
]);

const DAMAGE_TYPE_MAP: Record<number, Weapon['damageType']> = {
  3373582085: 'kinetic',
  1847026933: 'solar',
  2303181850: 'arc',
  3454344768: 'void',
  151347233:  'stasis',
  3949783978: 'strand',
};

// ──────────────────────────────────────────────────
// Socket category classifiers
// ──────────────────────────────────────────────────

const BARREL_PATTERNS = ['barrel', 'bowstring', 'blade', 'battery', 'guard', 'sight'];
const MAG_PATTERNS    = ['magazine', 'arrow', 'projectile'];
const PERK_PATTERNS   = ['perk', 'trait'];

function isBarrelCategory(name: string): boolean {
  const l = name.toLowerCase();
  return BARREL_PATTERNS.some((p) => l.includes(p));
}
function isMagCategory(name: string): boolean {
  const l = name.toLowerCase();
  return MAG_PATTERNS.some((p) => l.includes(p));
}
function isPerkCategory(name: string): boolean {
  const l = name.toLowerCase();
  return isBarrelCategory(name) || isMagCategory(name) || PERK_PATTERNS.some((p) => l.includes(p));
}
function isIntrinsicCategory(name: string): boolean {
  return name.toLowerCase().includes('intrinsic');
}
function isOriginTraitCategory(name: string): boolean {
  const l = name.toLowerCase();
  return l.includes('origin') || l.includes('source');
}
function isTrackerCategory(name: string): boolean {
  const l = name.toLowerCase();
  return l.includes('tracker') || l.includes('tracking');
}

// ──────────────────────────────────────────────────
// Tracker plug-level blocklist — belt-and-suspenders
// ──────────────────────────────────────────────────

const TRACKER_PLUG_NAMES = new Set([
  'Crucible Tracker', 'Vanguard Tracker', 'Gambit Tracker', 'Trials Tracker',
  'Valor Tracker', 'Glory Tracker', 'Infamy Tracker', 'Competitive Tracker',
  'Kill Tracker', 'Defeat Tracker', 'Invasion Tracker', 'Nightmare Tracker',
  'Season Kill Tracker', 'Legacy Kill Tracker', 'PvE Kill Tracker', 'PvP Kill Tracker',
  'No Tracker',
]);

function isTrackerPlug(name: string): boolean {
  if (TRACKER_PLUG_NAMES.has(name)) return true;
  return name.toLowerCase().includes('tracker');
}

// ──────────────────────────────────────────────────
// Column label helpers
// ──────────────────────────────────────────────────

function formatCategoryName(raw: string): string {
  return raw
    .replace(/^weapon\s+/i, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Human-readable label for a perk socket column.
 *
 * Bungie's manifest often bundles ALL weapon sockets into one catch-all
 * "WEAPON PERKS" category whose name doesn't tell us which slot is which.
 * For those cases we use the standard D2 slot ordering by position:
 *   [0] Barrel  [1] Magazine  [2] Perk 1  [3] Perk 2  ...
 *
 * When the category name IS specific (e.g. "Barrels", "Magazines"), we
 * use the formatted category name instead.
 */
function columnLabel(catName: string, slotIndex: number, totalSlots: number): string {
  if (isBarrelCategory(catName)) return formatCategoryName(catName);
  if (isMagCategory(catName))    return formatCategoryName(catName);

  // Catch-all "WEAPON PERKS" category (4+ sockets = barrel, mag, perk1, perk2, origin)
  if (totalSlots >= 4) {
    const POSITIONAL_LABELS = ['Barrel', 'Magazine', 'Perk 1', 'Perk 2', 'Origin Trait'];
    return POSITIONAL_LABELS[slotIndex] ?? 'Origin Trait';
  }

  // 2–3 pure trait sockets (barrel & mag already in their own categories)
  if (totalSlots === 1) return 'Perk';
  return `Perk ${slotIndex + 1}`;
}

function isEnhancedPerk(name: string): boolean {
  return name.startsWith('Enhanced ');
}

// ──────────────────────────────────────────────────
// Season name helpers
// ──────────────────────────────────────────────────

/**
 * Strip verbose prefixes so season names are compact pill labels.
 *   "Season of the Haunted"  → "Haunted"
 *   "Season of Arrivals"     → "Arrivals"
 *   "Season of Dawn"         → "Dawn"
 *   "Episode: Echoes"        → "Echoes"
 *   "Season Pass"            → "Season Pass" (unchanged)
 */
function shortenSeasonName(name: string): string {
  return name
    .replace(/^Episode:\s*/i, '')
    .replace(/^Season of the\s+/i, '')
    .replace(/^Season of\s+/i, '')
    .trim() || name;
}

/**
 * Build a map from season hash → short season name.
 * Every DestinyInventoryItemDefinition has a seasonHash field that points
 * directly to its DestinySeasonDefinition entry.
 */
function buildSeasonHashMap(
  seasonDefs: Record<string, BungieSeasonDefinition>
): Map<number, string> {
  const map = new Map<number, string>();
  for (const season of Object.values(seasonDefs)) {
    const name = season.displayProperties?.name;
    if (season.hash && name && name.trim()) {
      map.set(season.hash, shortenSeasonName(name));
    }
  }
  return map;
}

// ──────────────────────────────────────────────────
// Column-name deduplication
// Prevents two columns sharing the same Zustand key
// ──────────────────────────────────────────────────

function deduplicateColumnNames(columns: PerkColumn[]): PerkColumn[] {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const count = seen.get(col.name) ?? 0;
    seen.set(col.name, count + 1);
    if (count === 0) return col;
    return { ...col, name: `${col.name} ${count + 1}` };
  });
}

// ──────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────

export function parseWeapons(
  items: Record<string, BungieInventoryItem>,
  socketCategoryDefs: Record<string, BungieSocketCategoryDefinition>,
  plugSetDefs: Record<string, BungiePlugSetDefinition>,
  seasonDefs: Record<string, BungieSeasonDefinition> = {}
): Weapon[] {
  const seasonHashToName = buildSeasonHashMap(seasonDefs);
  const weapons: Weapon[] = [];

  for (const item of Object.values(items)) {
    if (item.itemType !== WEAPON_ITEM_TYPE) continue;
    if (!item.displayProperties?.name?.trim()) continue;
    if (!item.displayProperties?.icon) continue;
    if (!item.equippingBlock) continue;

    const baseStats: StatMap = {};
    let rpm = 0;

    if (item.stats?.stats) {
      for (const stat of Object.values(item.stats.stats)) {
        const statName = STAT_HASH_MAP[stat.statHash];
        if (!statName) continue;
        if (statName === 'RPM' || statName === 'Draw Time' || statName === 'Charge Time') {
          rpm = stat.value;
        }
        if (DISPLAY_STATS.has(statName)) {
          baseStats[statName] = stat.value;
        }
      }
    }

    if (Object.keys(baseStats).length === 0) continue;

    const itemSubType  = item.itemSubType ?? 0;
    const damageType   = DAMAGE_TYPE_MAP[item.defaultDamageTypeHash] ?? 'kinetic';
    const curves       = getCurves(itemSubType);
    const statCurves: Record<string, { stat: number; value: number }[]> = {};
    if (curves.Range)    statCurves['Range']    = curves.Range;
    if (curves.Handling) statCurves['Handling'] = curves.Handling;
    if (curves.Reload)   statCurves['Reload']   = curves.Reload;

    // Stats that support perk stat-modifier deltas
    const BAR_STATS = new Set([
      'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
    ]);

    const rawColumns: PerkColumn[] = [];
    let intrinsicTrait: Perk | null = null;

    if (item.sockets?.socketCategories && item.sockets?.socketEntries) {
      for (const category of item.sockets.socketCategories) {
        const catDef = socketCategoryDefs[category.socketCategoryHash.toString()];
        if (!catDef) continue;
        const catName = catDef.displayProperties.name;

        // ── Hard-skip tracker socket categories ────────
        if (isTrackerCategory(catName)) continue;

        const isIntrinsic   = isIntrinsicCategory(catName);
        const isOriginTrait = isOriginTraitCategory(catName);

        // Accept: intrinsic, origin-trait, and regular perk categories only
        if (!isIntrinsic && !isOriginTrait && !isPerkCategory(catName)) continue;

        const { socketIndexes } = category;

        // One PerkColumn per physical socket slot in this category.
        // "WEAPON PERKS" has 2 indexes → Trait 1 / Trait 2 each become their own column.
        socketIndexes.forEach((socketIndex, slotPos) => {
          const socket = item.sockets!.socketEntries[socketIndex];
          if (!socket) return;

          // Collect plug hashes, preferring randomised rolls over fixed
          let plugHashes: number[] = [];
          if (socket.reusablePlugSetHash) {
            const ps = plugSetDefs[socket.reusablePlugSetHash.toString()];
            if (ps) plugHashes = ps.reusablePlugItems
              .filter((p) => p.currentlyCanRoll)
              .map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.randomizedPlugSetHash) {
            const ps = plugSetDefs[socket.randomizedPlugSetHash.toString()];
            if (ps) plugHashes = ps.reusablePlugItems
              .filter((p) => p.currentlyCanRoll)
              .map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.reusablePlugItems?.length) {
            plugHashes = socket.reusablePlugItems.map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.singleInitialItemHash) {
            plugHashes = [socket.singleInitialItemHash];
          }

          const rawPerks: Perk[] = [];
          const seenPlugs = new Set<string>();

          for (const plugHash of plugHashes) {
            const hashStr = plugHash.toString();
            if (seenPlugs.has(hashStr)) continue;
            seenPlugs.add(hashStr);

            const plugItem = items[hashStr];
            if (!plugItem?.displayProperties?.name?.trim()) continue;
            if (!plugItem.displayProperties.icon) continue;

            const perkName = plugItem.displayProperties.name;

            // ── Tracker plug guard ──────────────────────
            if (isTrackerPlug(perkName)) continue;

            const statModifiers = (plugItem.investmentStats ?? [])
              .filter((s) => !s.isConditionallyActive && s.value !== 0)
              .map((s) => {
                const statName = STAT_HASH_MAP[s.statTypeHash];
                if (!statName || !BAR_STATS.has(statName)) return null;
                return { statName, value: s.value };
              })
              .filter((s): s is { statName: string; value: number } => s !== null);

            const tierEntry = getPerkTier(perkName);
            rawPerks.push({
              hash: hashStr,
              name: perkName,
              icon: plugItem.displayProperties.icon,
              description: plugItem.displayProperties.description ?? '',
              statModifiers,
              isEnhanced: isEnhancedPerk(perkName),
              buffKey: getBuffKeyForPerk(perkName),
              tier: tierEntry?.tier ?? null,
              enhancedVersion: null, // filled in below
            });
          }

          if (rawPerks.length === 0) return;

          // ── Pair enhanced perks with their base versions ──
          // Build a map: baseName → enhanced perk
          const enhancedMap = new Map<string, Perk>();
          for (const p of rawPerks) {
            if (p.isEnhanced) {
              const baseName = p.name.replace(/^Enhanced\s+/i, '');
              enhancedMap.set(baseName.toLowerCase(), p);
            }
          }

          // Attach enhancedVersion to base perks, then drop standalone enhanced perks
          // (they remain accessible via enhancedVersion for the "upgrade" button in the UI)
          const perks: Perk[] = [];
          for (const p of rawPerks) {
            if (p.isEnhanced) continue; // deduplicated into base perk
            const enhanced = enhancedMap.get(p.name.toLowerCase()) ?? null;
            perks.push({ ...p, enhancedVersion: enhanced });
          }

          if (perks.length === 0) return;

          if (isIntrinsic) {
            // Only store the first-seen intrinsic (frame perk)
            if (!intrinsicTrait) intrinsicTrait = perks[0];
          } else if (isOriginTrait) {
            // Origin trait always appears as its own clearly-labelled column
            rawColumns.push({ name: 'Origin Trait', perks });
          } else {
            rawColumns.push({
              name: columnLabel(catName, slotPos, socketIndexes.length),
              perks,
            });
          }
        });
      }
    }

    // Guard: deduplicate column names so selectedPerks keys never collide
    const perkSockets = deduplicateColumnNames(rawColumns);

    const weaponName = item.displayProperties.name;
    weapons.push({
      hash: item.hash.toString(),
      name: weaponName,
      baseName: extractBaseName(weaponName),
      variantLabel: extractVariantLabel(weaponName),
      isAdept: isAdeptVariant(weaponName),
      hasCraftedPattern: !!item.inventory?.recipeItemHash,
      icon: item.displayProperties.icon,
      iconWatermark: item.iconWatermark ? BUNGIE_ROOT + item.iconWatermark : null,
      seasonName: item.seasonHash ? (seasonHashToName.get(item.seasonHash) ?? null) : null,
      screenshot: item.screenshot ? BUNGIE_ROOT + item.screenshot : null,
      flavorText: item.flavorText?.trim() || null,
      rarity: item.tierTypeName || null,
      itemTypeDisplayName: item.itemTypeDisplayName || 'Weapon',
      itemSubType,
      damageType,
      rpm,
      baseStats,
      intrinsicTrait,
      perkSockets,
      statCurves,
    });
  }

  return weapons.sort((a, b) => a.name.localeCompare(b.name));
}
