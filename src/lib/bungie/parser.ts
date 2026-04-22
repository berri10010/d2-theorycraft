import { Weapon, Perk, PerkColumn, ColumnType, StatMap, PerkActivation } from '../../types/weapon';
import { BUNGIE_URL as BUNGIE_ROOT } from '../bungieUrl';
import {
  BungieInventoryItem,
  BungieSocketCategoryDefinition,
  BungiePlugSetDefinition,
  BungieSeasonDefinition,
} from './bungieTypes';
import { getCurves } from '../archetypes';
import { getBuffKeyForPerk } from '../buffDatabase';
import { getPerkTier } from '../perkTierDatabase';
import PERK_AUDIT from '../../data/perkAudit.json';

// ── perkAudit helpers ────────────────────────────────────────────────────────
type AuditEntry = {
  statModifiers: Array<{ statName: string; value: number; isConditional: boolean }>;
  activation:  { trigger: string; ttaCategory: string; estTtaSeconds: string; duration: string } | null;
  activation2: { trigger: string; ttaCategory: string; estTtaSeconds: string; duration: string } | null;
  clarityVerified: boolean;
  notes: string;
};
const AUDIT = PERK_AUDIT as Record<string, AuditEntry>;

/**
 * Returns audit stat modifiers for a perk, or null if the audit has none.
 * Audit data is preferred over the Bungie manifest when present — it uses
 * Clarity-verified values rather than investmentStats which can be wrong.
 */
function auditStatsFor(perkName: string): AuditEntry['statModifiers'] | null {
  const entry = AUDIT[perkName];
  if (!entry || entry.statModifiers.length === 0) return null;
  return entry.statModifiers;
}

function auditActivationFor(perkName: string): { act: PerkActivation | null; act2: PerkActivation | null } {
  const entry = AUDIT[perkName];
  if (!entry) return { act: null, act2: null };
  return { act: entry.activation ?? null, act2: entry.activation2 ?? null };
}

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
  3614673599: 'Blast Radius',
  2523465841: 'Velocity',
  1591432999: 'Accuracy',
  1931675084: 'Ammo Generation',
  2837207746: 'Swing Speed',
  209426660:  'Guard Resistance',
  3022301683: 'Charge Rate',
  3736848092: 'Guard Endurance',
  1842278586: 'Shield Duration',
  925767036:  'Ammo Capacity',
};

// Stats stored in baseStats (used for display + stat modifier math)
const DISPLAY_STATS = new Set([
  'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
  'Zoom', 'Recoil Direction', 'Magazine', 'Airborne Effectiveness',
  'RPM', 'Draw Time', 'Charge Time',
  'Blast Radius', 'Velocity', 'Accuracy', 'Ammo Generation',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration', 'Ammo Capacity',
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
function isMasterworkCategory(name: string): boolean {
  return name.toLowerCase().includes('masterwork');
}
function isWeaponModCategory(name: string): boolean {
  const l = name.toLowerCase();
  // Match "WEAPON MODS" style categories; exclude masterwork, intrinsic, cosmetic sockets
  return l.includes('weapon mod') && !l.includes('masterwork') && !l.includes('intrinsic') && !l.includes('cosmetic');
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
// Column type + label helpers
// ──────────────────────────────────────────────────

/**
 * Determine the semantic ColumnType for a socket category.
 * When Bungie uses separate categories per slot type, the category name tells us
 * exactly what it is. When Bungie uses one catch-all "WEAPON PERKS" category we
 * fall back to position within that catch-all.
 */
function columnTypeFromCategory(
  catName: string,
  slotPos: number,
  totalInCat: number,
): ColumnType {
  if (isBarrelCategory(catName)) return 'barrel';
  if (isMagCategory(catName))    return 'mag';
  if (isOriginTraitCategory(catName)) return 'origin';

  // Catch-all "WEAPON PERKS" category: use position to infer type
  // Standard D2 order: 0=Barrel, 1=Magazine, 2+=Perk (last is Origin when totalInCat≥4)
  if (totalInCat >= 4) {
    if (slotPos === 0) return 'barrel';
    if (slotPos === 1) return 'mag';
    if (slotPos === totalInCat - 1) return 'origin';
    return 'perk';
  }

  return 'perk';
}

/**
 * Human-readable label for a perk column.
 * Barrel / mag / origin columns get a fixed label.
 * Trait columns get "Perk N" where N is the 1-based index among all trait columns
 * seen so far (passed in as `traitIndex`).
 */
function columnLabel(
  colType: ColumnType,
  catName: string,
  traitIndex: number, // 1-based count of trait columns already created
): string {
  switch (colType) {
    case 'barrel': {
      // Use the category name to get the weapon-type-appropriate label.
      // e.g. "Weapon Barrels" → "Barrel", "Bowstrings" → "Bowstring", "Blades" → "Blade".
      // When Bungie uses a catch-all "WEAPON PERKS" category the derived label would be
      // "Perk" — treat that as generic and fall back to "Barrel".
      const cleaned = catName
        .replace(/^weapon\s+/i, '')
        .replace(/s$/i, '') // strip trailing 's' (Barrels→Barrel, etc.)
        .trim();
      const label = cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return label && label.toLowerCase() !== 'perk' ? label : 'Barrel';
    }
    case 'mag': {
      const cleaned = catName
        .replace(/^weapon\s+/i, '')
        .replace(/s$/i, '')
        .trim();
      const label = cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return label && label.toLowerCase() !== 'perk' ? label : 'Magazine';
    }
    case 'origin':
      return 'Origin Trait';
    case 'perk':
      return `Perk ${traitIndex}`;
  }
}

/**
 * Determine whether a plug item is an enhanced perk.
 *
 * In modern D2 manifests (post-Witch Queen crafting), enhanced perks share the
 * EXACT SAME displayProperties.name as their base counterpart (e.g. both are
 * named "Kill Clip").  The only reliable distinguisher is itemTypeDisplayName,
 * which is "Enhanced Weapon Perk" / "Enhanced Weapon Trait" for the enhanced
 * variant.  We also keep the legacy name-prefix check ("Enhanced X") as a
 * fallback for any older content that still uses that convention.
 */
function isEnhancedPerkItem(item: BungieInventoryItem): boolean {
  return (
    item.displayProperties.name.startsWith('Enhanced ') ||
    (item.itemTypeDisplayName ?? '').toLowerCase().includes('enhanced')
  );
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

interface SeasonInfo { name: string; number: number; }

/** Build a map from season number → season name from DestinySeasonDefinition. */
function buildSeasonNumberToName(
  seasonDefs: Record<string, BungieSeasonDefinition>,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const season of Object.values(seasonDefs)) {
    const name = season.displayProperties?.name?.trim();
    if (name && season.seasonNumber) {
      map.set(season.seasonNumber, shortenSeasonName(name));
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
    // Append a numeric suffix to avoid key collisions in the Zustand store
    return { ...col, name: `${col.name} ${count + 1}` };
  });
}

// ──────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────

function getCanonicalName(name: string): string {
  return name.replace(/^Enhanced\s+/i, '').toLowerCase();
}

export function parseWeapons(
  items: Record<string, BungieInventoryItem>,
  socketCategoryDefs: Record<string, BungieSocketCategoryDefinition>,
  plugSetDefs: Record<string, BungiePlugSetDefinition>,
  seasonDefs: Record<string, BungieSeasonDefinition> = {},
  // Community-maintained map from DIM: iconWatermark path → season number.
  // Bungie does not populate seasonHash on weapons, so this is the only
  // reliable source covering all seasons, raids, dungeons, and events.
  dimWatermarkToSeason: Record<string, number> = {},
  // collectibleHash (string) → sourceString from DestinyCollectibleDefinition.
  // Used to populate the weapon's acquisition source string.
  collectibleMap: Record<string, string> = {},
): Weapon[] {
  const seasonNumberToName = buildSeasonNumberToName(seasonDefs);

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
        // Capture the first rate-of-fire stat encountered (RPM for most weapons,
        // Draw Time for bows, Charge Time for fusion/linear fusion/rocket launchers).
        if (!rpm && (statName === 'RPM' || statName === 'Draw Time' || statName === 'Charge Time')) {
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

    // All stats that can carry a perk stat-modifier delta.
    // Expanded from the original narrow set so that barrel mods (Recoil Direction),
    // magazine mods (Magazine size), and utility mods (Airborne Effectiveness, Zoom)
    // correctly propagate into getCalculatedStats and the stat display panels.
    const BAR_STATS = new Set([
      'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance',
      'Zoom', 'Recoil Direction', 'Magazine', 'Airborne Effectiveness',
      'Blast Radius', 'Velocity', 'Accuracy', 'Ammo Generation',
      'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Shield Duration',
    ]);

     let rawColumns: PerkColumn[] = [];
    const masterworkOptions: string[] = [];
    const weaponMods: Weapon['weaponMods'] = [];

    let intrinsicTrait: Perk | null = null;
    // Running count of 'perk' (trait) columns emitted for this weapon — used for "Perk N" labels
    let traitColumnCount = 0;

    if (item.sockets?.socketCategories && item.sockets?.socketEntries) {
      for (const category of item.sockets.socketCategories) {
        const catDef = socketCategoryDefs[category.socketCategoryHash.toString()];
        if (!catDef) continue;
        const catName = catDef.displayProperties.name;

        // ── Hard-skip tracker socket categories ────────
        if (isTrackerCategory(catName)) continue;

        // ── Masterwork socket: extract available stat options ──
        if (isMasterworkCategory(catName)) {
          for (const socketIndex of category.socketIndexes) {
            const socket = item.sockets!.socketEntries[socketIndex];
            if (!socket) continue;
            // Masterwork options live in reusablePlugSetHash
            const ps = socket.reusablePlugSetHash
              ? plugSetDefs[socket.reusablePlugSetHash.toString()]
              : null;
            const plugHashes = ps
              ? ps.reusablePlugItems.map((p) => p.plugItemHash)
              : socket.singleInitialItemHash
                ? [socket.singleInitialItemHash]
                : [];
            for (const plugHash of plugHashes) {
              const plugItem = items[plugHash.toString()];
              if (!plugItem?.investmentStats?.length) continue;
              const mwPlugName = plugItem.displayProperties?.name ?? '';
              if (isTrackerPlug(mwPlugName)) continue;
              // Skip tier-progression plugs (e.g. "Masterwork Tier 1" through "Tier 9").
              // Only stat-choice plugs (e.g. "Handling Masterwork") are relevant.
              if (/\btier\b/i.test(mwPlugName)) continue;
              for (const s of plugItem.investmentStats) {
                if (s.value === 0) continue;
                const statName = STAT_HASH_MAP[s.statTypeHash];
                if (!statName || !DISPLAY_STATS.has(statName)) continue;
                if (!masterworkOptions.includes(statName)) {
                  masterworkOptions.push(statName);
                }
              }
            }
          }
          continue; // masterwork sockets don't produce perk columns
        }

        // ── Weapon mod socket: extract available mod options ──
        if (isWeaponModCategory(catName)) {
          for (const socketIndex of category.socketIndexes) {
            const modSocket = item.sockets!.socketEntries[socketIndex];
            if (!modSocket) continue;
            // Mod options live in reusablePlugSetHash (choosable by player)
            const modPs = modSocket.reusablePlugSetHash
              ? plugSetDefs[modSocket.reusablePlugSetHash.toString()]
              : null;
            const modPlugHashes: number[] = modPs
              ? modPs.reusablePlugItems.map((p: { plugItemHash: number }) => p.plugItemHash)
              : modSocket.singleInitialItemHash
                ? [modSocket.singleInitialItemHash]
                : [];
            for (const modPlugHash of modPlugHashes) {
              const modPlug = items[modPlugHash.toString()];
              if (!modPlug) continue;
              const modName = modPlug.displayProperties?.name?.trim();
              if (!modName) continue;
              // Skip empty socket placeholders and trackers
              if (modName.toLowerCase().includes('empty')) continue;
              if (isTrackerPlug(modName)) continue;
              // Skip masterwork tier-progression plugs ("Tier 1: Stability", etc.)
              // and masterwork completion plugs ("Masterworked: Stability", etc.).
              // These leak into the weapon mod plug set on some weapons because
              // Bungie shares plug sets across socket types.
              if (/\btier\b/i.test(modName)) continue;
              if (/\bmasterwork/i.test(modName)) continue;
              // Skip crafting-related plugs. "Extract Pattern" is labeled "Weapon Mod"
              // in the manifest but is a crafting action, not an equippable mod.
              if (/extract\s+pattern/i.test(modName)) continue;
              if (/\bpattern\b/i.test(modName)) continue;
              // Strictly require the plug to identify itself as a weapon mod.
              // This filters out barrel perks, sight options, and other non-mod
              // plugs that happen to have stat investments in their investmentStats.
              const looksLikeMod = (modPlug.itemTypeDisplayName ?? '').toLowerCase().includes('mod');
              if (!looksLikeMod) continue;
              // Extract stat changes from investmentStats
              const modStatChanges: Partial<Record<string, number>> = {};
              for (const s of (modPlug.investmentStats ?? [])) {
                const inv = s as { statTypeHash: number; value: number };
                if (inv.value === 0) continue;
                const statName = STAT_HASH_MAP[inv.statTypeHash];
                if (!statName || !BAR_STATS.has(statName)) continue;
                modStatChanges[statName] = (modStatChanges[statName] ?? 0) + inv.value;
              }
              weaponMods.push({
                hash: modPlugHash.toString(),
                name: modName,
                description: modPlug.displayProperties.description?.trim() ?? '',
                statChanges: modStatChanges,
              });
            }
          }
          continue; // weapon mod sockets don't produce perk columns
        }

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

          // Collect plug hashes from BOTH plug sets and merge by hash uniqueness.
          // Craftable weapons store base perks in randomizedPlugSetHash and enhanced
          // perks in reusablePlugSetHash; Adept weapons do the same but with
          // currentlyCanRoll:false on the enhanced entries.  By collecting from both
          // sets up-front we ensure base+enhanced land in the same rawPerks array so
          // the within-socket dedup can pair them — preventing duplicate icon rows.
          //
          // Key distinction:
          //   reusablePlugSetHash  — fixed / choosable options (e.g. barrel mods, exotic
          //     Tang/Grip choices).  ALL items are valid choices regardless of
          //     currentlyCanRoll, which Bungie sometimes sets false on non-default
          //     alternatives (see e.g. Praxic Blade Tang/Grip sockets).
          //   randomizedPlugSetHash — random-roll perk pool.  Only currentlyCanRoll:true
          //     items are in the current pool; false = deprecated / removed from rotation.
          const plugHashSet = new Set<number>();
          const plugHashes: number[] = [];

          // reusablePlugSetHash: include ALL items (choosable, not random-rolled)
          if (socket.reusablePlugSetHash) {
            const ps = plugSetDefs[socket.reusablePlugSetHash.toString()];
            if (ps) {
              for (const p of ps.reusablePlugItems) {
                if (!plugHashSet.has(p.plugItemHash)) {
                  plugHashSet.add(p.plugItemHash);
                  plugHashes.push(p.plugItemHash);
                }
              }
            }
          }

          // randomizedPlugSetHash: only include currently-rollable items
          if (socket.randomizedPlugSetHash) {
            const ps = plugSetDefs[socket.randomizedPlugSetHash.toString()];
            if (ps) {
              const rollable = ps.reusablePlugItems
                .filter((p) => p.currentlyCanRoll)
                .map((p) => p.plugItemHash);
              const hashes = rollable.length > 0
                ? rollable
                : ps.reusablePlugItems.map((p) => p.plugItemHash);
              for (const h of hashes) {
                if (!plugHashSet.has(h)) { plugHashSet.add(h); plugHashes.push(h); }
              }
            }
          }
          if (plugHashes.length === 0 && socket.reusablePlugItems?.length) {
            plugHashes.push(...socket.reusablePlugItems.map((p) => p.plugItemHash));
          }
          if (plugHashes.length === 0 && socket.singleInitialItemHash) {
            plugHashes.push(socket.singleInitialItemHash);
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

            // Build stat modifiers: prefer perkAudit (Clarity-verified) over
            // the Bungie manifest investmentStats, which can have wrong values.
            const manifestStats = (plugItem.investmentStats ?? [])
              // Keep non-zero entries regardless of isConditionallyActive —
              // we preserve the flag on the modifier so the engine can gate
              // conditionally-active bonuses (e.g. Eye of the Storm) on the
              // perk's Effects Tab toggle rather than silently discarding them.
              .filter((s) => s.value !== 0)
              .map((s) => {
                const statName = STAT_HASH_MAP[s.statTypeHash];
                if (!statName || !BAR_STATS.has(statName)) return null;
                return {
                  statName,
                  value: s.value,
                  isConditional: s.isConditionallyActive ?? false,
                };
              })
              .filter((s): s is { statName: string; value: number; isConditional: boolean } => s !== null);

            // Use Clarity-verified audit stats when available; fall back to manifest.
            const auditStats = auditStatsFor(perkName);
            const statModifiers = auditStats ?? manifestStats;

            const enhanced = isEnhancedPerkItem(plugItem);
            const derivedBuffKey = enhanced ? null : getBuffKeyForPerk(perkName);
            const tierEntry = getPerkTier(perkName);
            const { act, act2 } = auditActivationFor(perkName);
            rawPerks.push({
              hash: hashStr,
              name: perkName,
              icon: plugItem.displayProperties.icon,
              description: plugItem.displayProperties.description ?? '',
              statModifiers,
              isEnhanced: enhanced,
              // A perk is conditional when it has a damage-buff activation requirement
              // OR when any of its stat modifiers are only active in specific game states
              // (isConditionallyActive = true in the manifest, e.g. Eye of the Storm).
              // Passive perks (barrels, mags, always-on traits) have neither.
              isConditional: derivedBuffKey !== null || statModifiers.some((m) => m.isConditional),
              buffKey: derivedBuffKey,
              tier: enhanced ? null : (tierEntry?.tier ?? null),
              activation:  act,
              activation2: act2,
              enhancedVersion: null, // filled in below
            });
          }

          if (rawPerks.length === 0) return;

          // ── Pair enhanced perks with their base versions ──
          // Key on the canonical perk name (strip legacy "Enhanced " prefix if present;
          // for modern identical-name perks this is a no-op).  Both old-style
          // "Enhanced Kill Clip" and new-style "Kill Clip" (enhanced) map to "kill clip".
          const enhancedMap = new Map<string, Perk>();
          for (const p of rawPerks) {
            if (p.isEnhanced) {
               const key = getCanonicalName(p.name);
               enhancedMap.set(key, p);

            }
          }

          // Attach enhancedVersion to base perks, then drop enhanced perks that have a base
          // partner. Orphaned enhanced perks (no base version) are kept as-is so columns
          // don't end up empty on craftable weapons that only surface enhanced variants.
          const perks: Perk[] = [];
          for (const p of rawPerks) {
            if (p.isEnhanced) {
              // Drop if a base perk with the same canonical name exists in this socket.
               const key = getCanonicalName(p.name);
               const hasBase = rawPerks.some(
                 (b) => !b.isEnhanced && getCanonicalName(b.name) === key
               );

              if (!hasBase) perks.push({ ...p, enhancedVersion: null });
              continue;
            }
             const key = getCanonicalName(p.name);
             const enhanced = enhancedMap.get(key) ?? null;

            perks.push({ ...p, enhancedVersion: enhanced });
          }

          if (perks.length === 0) return;

          if (isIntrinsic) {
            // Only store the first-seen intrinsic (frame perk)
            if (!intrinsicTrait) intrinsicTrait = perks[0];
          } else {
            const colType = isOriginTrait
              ? 'origin' as const
              : columnTypeFromCategory(catName, slotPos, socketIndexes.length);

            if (colType === 'perk') traitColumnCount += 1;

            rawColumns.push({
              columnType: colType,
              name: columnLabel(colType, catName, traitColumnCount),
              perks,
            });
          }
        });
      }
    }

    // ── Cross-socket enhanced perk pairing ────────────────────────────────
    // Some weapons (e.g. Adept) store enhanced perks in SEPARATE socket slots
    // from their base-perk counterparts.  After per-socket pairing, any perk
    // column whose perks are ALL enhanced is an "enhanced-only" column that
    // should be merged into a sibling base column instead of shown separately.
    {
      const enhancedOnlyIdxs: number[] = [];
      rawColumns.forEach((col, idx) => {
        if (
          col.columnType === 'perk' &&
          col.perks.length > 0 &&
          col.perks.every((p) => p.isEnhanced)
        ) {
          enhancedOnlyIdxs.push(idx);
        }
      });

      if (enhancedOnlyIdxs.length > 0) {
        // Build a map: canonical perk name (lowercase) → enhanced Perk
        const crossEnhancedMap = new Map<string, Perk>();
        for (const idx of enhancedOnlyIdxs) {
           for (const enhPerk of rawColumns[idx].perks) {
             const key = getCanonicalName(enhPerk.name);
             if (!crossEnhancedMap.has(key)) {

              crossEnhancedMap.set(key, enhPerk);
            }
          }
        }

        // Attach enhanced versions to base perks in non-enhanced columns
        const enhancedOnlySet = new Set(enhancedOnlyIdxs);
        for (let i = 0; i < rawColumns.length; i++) {
          if (enhancedOnlySet.has(i)) continue;
          const col = rawColumns[i];
          if (col.columnType !== 'perk') continue;

           const updatedPerks = col.perks.map((p): Perk => {
             if (p.isEnhanced || p.enhancedVersion) return p;
             const key = getCanonicalName(p.name);
             const enh = crossEnhancedMap.get(key) ?? null;

            return enh ? { ...p, enhancedVersion: enh } : p;
          });
          rawColumns[i] = { ...col, perks: updatedPerks };
        }

        // Remove the now-merged enhanced-only columns
        rawColumns = rawColumns.filter((_, idx) => !enhancedOnlySet.has(idx));
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
      seasonNumber: item.iconWatermark ? (dimWatermarkToSeason[item.iconWatermark] ?? null) : null,
      seasonName:   item.iconWatermark ? (seasonNumberToName.get(dimWatermarkToSeason[item.iconWatermark]) ?? null) : null,
      screenshot: item.screenshot ? BUNGIE_ROOT + item.screenshot : null,
      flavorText: item.flavorText?.trim() || null,
      rarity: item.inventory?.tierTypeName || null,
      itemTypeDisplayName: item.itemTypeDisplayName || 'Weapon',
      itemSubType,
      ammoType: item.equippingBlock?.ammoType ?? 1,
      damageType,
      rpm,
      baseStats,
      intrinsicTrait,
      perkSockets,
      statCurves,
      source: item.collectibleHash
        ? (collectibleMap[item.collectibleHash.toString()] ?? null)
        : null,
      // Only keep masterwork options for stats this weapon actually has (e.g. no
      // Draw Time on Auto Rifles, no Impact on Bows). The plug sets in the manifest
      // are often shared across weapon types, so this filters down to applicable stats.
      masterworkOptions: masterworkOptions.filter((s) => baseStats[s] !== undefined),
      weaponMods,
    });
  }

  return weapons.sort((a, b) => a.name.localeCompare(b.name));
}
