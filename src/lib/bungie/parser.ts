import { Weapon, Perk, PerkColumn, StatMap } from '../../types/weapon';

const BUNGIE_ROOT = 'https://www.bungie.net';
import {
  BungieInventoryItem,
  BungieSocketCategoryDefinition,
  BungiePlugSetDefinition,
} from './bungieTypes';
import { getCurves } from '../archetypes';
import { getBuffKeyForPerk } from '../buffDatabase';
import { getPerkTier } from '../perkTierDatabase';

const WEAPON_ITEM_TYPE = 3;

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

// Socket category name patterns for selectable perk columns (barrels, magazines, traits)
const PERK_CATEGORY_PATTERNS = [
  'barrel', 'bowstring', 'blade', 'battery', 'guard',
  'magazine', 'arrow', 'projectile', 'perk', 'trait',
];

function isPerkCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return PERK_CATEGORY_PATTERNS.some((p) => lower.includes(p));
}

function isIntrinsicCategory(name: string): boolean {
  return name.toLowerCase().includes('intrinsic');
}

function isOriginTraitCategory(name: string): boolean {
  return name.toLowerCase().includes('origin');
}

function isTrackerCategory(name: string): boolean {
  return name.toLowerCase().includes('tracker');
}

// Known tracker plug names — belt-and-suspenders filter if the category name slips through
const TRACKER_PLUG_NAMES = new Set([
  'Crucible Tracker', 'Vanguard Tracker', 'Gambit Tracker', 'Trials Tracker',
  'Valor Tracker', 'Glory Tracker', 'Infamy Tracker', 'Competitive Tracker',
  'Kill Tracker', 'Defeat Tracker', 'Invasion Tracker', 'Nightmare Tracker',
]);

/** Map a socket category name to a human-readable column label */
function columnLabel(catName: string, slotIndex: number, totalSlots: number): string {
  const lower = catName.toLowerCase();
  if (lower.includes('barrel') || lower.includes('sight') || lower.includes('bowstring') ||
      lower.includes('blade') || lower.includes('guard') || lower.includes('battery')) {
    return formatCategoryName(catName.replace(/^weapon\s+/i, ''));
  }
  if (lower.includes('magazine') || lower.includes('arrow') || lower.includes('projectile')) {
    return formatCategoryName(catName.replace(/^weapon\s+/i, ''));
  }
  // Weapon perk slots (the two trait columns) → "Trait 1", "Trait 2"
  if (totalSlots > 1) return `Trait ${slotIndex + 1}`;
  return formatCategoryName(catName);
}

function formatCategoryName(raw: string): string {
  return raw.split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function isEnhancedPerk(name: string): boolean {
  return name.startsWith('Enhanced ');
}

export function parseWeapons(
  items: Record<string, BungieInventoryItem>,
  socketCategoryDefs: Record<string, BungieSocketCategoryDefinition>,
  plugSetDefs: Record<string, BungiePlugSetDefinition>
): Weapon[] {
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

    const itemSubType = item.itemSubType ?? 0;
    const damageType = DAMAGE_TYPE_MAP[item.defaultDamageTypeHash] ?? 'kinetic';

    // Inject stat curves from archetypes.json at parse time
    const curves = getCurves(itemSubType);
    const statCurves: Record<string, { stat: number; value: number }[]> = {};
    if (curves.Range)    statCurves['Range']    = curves.Range;
    if (curves.Handling) statCurves['Handling'] = curves.Handling;
    if (curves.Reload)   statCurves['Reload']   = curves.Reload;

    const perkSockets: PerkColumn[] = [];
    let intrinsicTrait: Perk | null = null;

    // Bar stats that support perk stat-modifier deltas
    const BAR_STATS = new Set(['Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance']);

    if (item.sockets?.socketCategories && item.sockets?.socketEntries) {
      for (const category of item.sockets.socketCategories) {
        const catDef = socketCategoryDefs[category.socketCategoryHash.toString()];
        if (!catDef) continue;
        const catName = catDef.displayProperties.name;

        // Skip origin traits and tracker sockets
        if (isOriginTraitCategory(catName)) continue;
        if (isTrackerCategory(catName)) continue;

        const isIntrinsic = isIntrinsicCategory(catName);
        if (!isIntrinsic && !isPerkCategory(catName)) continue;

        const { socketIndexes } = category;

        // One PerkColumn per socket index — each index is one physical slot on the weapon.
        // "WEAPON PERKS" has two indexes (Trait 1, Trait 2); barrel/magazine categories
        // typically have one. Putting both traits in the same list was the original bug.
        socketIndexes.forEach((socketIndex, slotPos) => {
          const socket = item.sockets!.socketEntries[socketIndex];
          if (!socket) return;

          let plugHashes: number[] = [];

          if (socket.reusablePlugSetHash) {
            const ps = plugSetDefs[socket.reusablePlugSetHash.toString()];
            if (ps) plugHashes = ps.reusablePlugItems.filter((p) => p.currentlyCanRoll).map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.randomizedPlugSetHash) {
            const ps = plugSetDefs[socket.randomizedPlugSetHash.toString()];
            if (ps) plugHashes = ps.reusablePlugItems.filter((p) => p.currentlyCanRoll).map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.reusablePlugItems?.length) {
            plugHashes = socket.reusablePlugItems.map((p) => p.plugItemHash);
          }
          if (plugHashes.length === 0 && socket.singleInitialItemHash) {
            plugHashes = [socket.singleInitialItemHash];
          }

          const perks: Perk[] = [];
          const seenPlugs = new Set<string>();

          for (const plugHash of plugHashes) {
            const hashStr = plugHash.toString();
            if (seenPlugs.has(hashStr)) continue;
            seenPlugs.add(hashStr);

            const plugItem = items[hashStr];
            if (!plugItem?.displayProperties?.name?.trim()) continue;
            if (!plugItem.displayProperties.icon) continue;

            const perkName = plugItem.displayProperties.name;

            // Belt-and-suspenders: skip any tracker plugs that slipped through
            if (TRACKER_PLUG_NAMES.has(perkName)) continue;
            if (perkName.toLowerCase().includes('tracker')) continue;

            const statModifiers = (plugItem.investmentStats ?? [])
              .filter((s) => !s.isConditionallyActive && s.value !== 0)
              .map((s) => {
                const statName = STAT_HASH_MAP[s.statTypeHash];
                if (!statName || !BAR_STATS.has(statName)) return null;
                return { statName, value: s.value };
              })
              .filter((s): s is { statName: string; value: number } => s !== null);

            const tierEntry = getPerkTier(perkName);
            perks.push({
              hash: hashStr,
              name: perkName,
              icon: plugItem.displayProperties.icon,
              description: plugItem.displayProperties.description ?? '',
              statModifiers,
              isEnhanced: isEnhancedPerk(perkName),
              buffKey: getBuffKeyForPerk(perkName),
              tier: tierEntry?.tier ?? null,
            });
          }

          if (perks.length === 0) return;

          if (isIntrinsic) {
            // Grab the first perk as the intrinsic frame trait
            intrinsicTrait = perks[0];
          } else {
            perkSockets.push({
              name: columnLabel(catName, slotPos, socketIndexes.length),
              perks,
            });
          }
        });
      }
    }

    weapons.push({
      hash: item.hash.toString(),
      name: item.displayProperties.name,
      icon: item.displayProperties.icon,
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
