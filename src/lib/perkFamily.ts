/**
 * Perk family / category classification.
 *
 * A perk's "family" is more granular than its column type — it describes what
 * KIND of perk it is (Barrel vs Scope within the barrel column; Grip vs Magazine
 * within the mag column; Origin Trait vs Trait within perk columns).
 *
 * Classification order:
 *  1. Column type ('barrel', 'mag', 'origin') → immediate answer for unambiguous columns
 *  2. Name keyword matching → detects Grip/Stock/Barrel/Scope/Magazine sub-types
 *     regardless of which column the perk landed in (some weapons mis-classify slots)
 *  3. Known origin trait name set → identifies origin traits in "perk" columns
 *  4. Fall through → 'Trait'
 */

import { Perk, PerkColumn } from '../types/weapon';

export type PerkFamily =
  | 'Barrel' | 'Bowstring' | 'Blade' | 'Haft' | 'Scope'
  | 'Magazine' | 'Grip' | 'Stock'
  | 'Trait' | 'Origin Trait'
  | 'Frame';

// ── Name-keyword patterns ─────────────────────────────────────────────────────

const GRIP_RE   = /\b(grip|wrap)\b/i;
const STOCK_RE  = /\b(stock|guard)\b/i;
const BARREL_RE = /\b(rifling|bore|barrel|tube|alloy)\b/i;
const SCOPE_RE  = /\b(optics?|sights?|scope|lens)\b/i;
const MAG_RE    = /\b(rounds|magazine)\b/i;

/**
 * Origin traits are perks that appear in the 5th column of a weapon and are
 * tied to the weapon's source (foundry, activity, season). They're stable,
 * named perks — maintaining this as a name set is more readable and
 * future-proof than hashes (enhanced versions share the same name).
 */
const ORIGIN_TRAIT_NAMES = new Set([
  // Foundry
  'accelerated assault',
  'häkke breach armaments',
  'suros synergy',
  'omolon fluid dynamics',
  'tex balanced stock',
  'veist stinger',
  'field-tested',
  // Vanguard / Nightfall
  "vanguard's vindication",
  'vanguard determination',
  'one quiet moment',
  'stunning recovery',
  'gun and run',
  'disaster plan',
  // Gambit
  'classy contender',
  // Trials of Osiris
  'wild card',
  'alacrity',
  // Iron Banner
  'skulking wolf',
  'roar of battle',
  // Dungeon / Raid
  'nadir focus',
  'souldrinker',
  'collective action',
  'bait and switch',
  'recovered armor',
  'unburied treasure',
  'turnabout',
  'dark-forged trigger',
  // Seasonal
  'problem solver',
  'gravity well',
  'willing vessel',
  'indomitability',
  'tenacity',
  'nail, meet hammer',
  "forge's kin",
  'crossing over',
  'fleet footed',
  'dawning surprise',
  'restoration ritual',
  'dream work',
  'runneth over',
  'search party',
  'advanced reflexes',
  'bray legacy',
  'loss',
  'dark ether reaper',
  'featherweight',
  'air-cooled core',
  'elliptical orbit',
  'cast no shadows',
  'rasputin\'s arsenal',
  'subjugation',
  'paracausal fluid',
  'exhaustive research',
  'carrion munitions',
  "veteran's wisdom",
  'imperial allegiance',
  'splicer surge',
  'fail-deadly',
  'eyes up',
  'heretical behavior',
  'ignoble deeds',
  'contending cascade',
  'winterized gear',
  'nanotech tracer missiles',
  'sundering',
  'bitterspite',
  'frame of reference',
  'en garde',
  'reversal of Fortune',
  'desperate measures',
  'reversal of fortune',
  'chaos reshaped',
  'hot swap',
]);

// ── Classification ────────────────────────────────────────────────────────────

function nameFamily(name: string): PerkFamily | null {
  if (GRIP_RE.test(name))   return 'Grip';
  if (STOCK_RE.test(name))  return 'Stock';
  if (BARREL_RE.test(name)) return 'Barrel';
  if (SCOPE_RE.test(name))  return 'Scope';
  if (MAG_RE.test(name))    return 'Magazine';
  return null;
}

/**
 * Classify a perk into its semantic family.
 *
 * @param perk  The perk to classify.
 * @param col   The column the perk lives in (used as primary signal for barrel/mag/origin).
 * @returns     Human-readable family string (e.g. "Grip", "Origin Trait", "Trait").
 */
export function getPerkFamily(perk: Perk, col: PerkColumn): PerkFamily {
  const { columnType, name: colName } = col;

  // Barrel columns: use col label directly so exotic variants get the right name.
  // col.name is already "Barrel", "Bowstring", "Blade", "Haft", etc. from the parser.
  if (columnType === 'barrel') {
    const label = colName as PerkFamily;
    const valid: PerkFamily[] = ['Barrel', 'Bowstring', 'Blade', 'Haft'];
    return valid.includes(label) ? label : 'Barrel';
  }

  // Origin columns: everything in them is an origin trait.
  if (columnType === 'origin') return 'Origin Trait';

  // For perk columns: known origin trait names take priority over keyword detection.
  // This prevents "Tex Balanced Stock" from matching the STOCK_RE keyword.
  if (columnType === 'perk' && ORIGIN_TRAIT_NAMES.has(perk.name.toLowerCase())) {
    return 'Origin Trait';
  }

  // Name-keyword detection: identifies Grip/Stock/Barrel/Scope/Magazine regardless
  // of which column the perk landed in (slots are sometimes mis-classified).
  const fromName = nameFamily(perk.name);
  if (fromName) return fromName;

  // Mag columns: remaining perks are magazine mods.
  if (columnType === 'mag') return 'Magazine';

  return 'Trait';
}

/**
 * Short badge label used in compact UI (≤6 chars).
 */
export function getPerkFamilyBadge(perk: Perk, col: PerkColumn): string {
  const family = getPerkFamily(perk, col);
  switch (family) {
    case 'Origin Trait': return 'Origin';
    case 'Barrel':       return 'Barrel';
    case 'Bowstring':    return 'Bow';
    case 'Blade':        return 'Blade';
    case 'Haft':         return 'Haft';
    case 'Scope':        return 'Scope';
    case 'Magazine':     return 'Mag';
    case 'Grip':         return 'Grip';
    case 'Stock':        return 'Stock';
    case 'Frame':        return 'Frame';
    case 'Trait':        return 'Trait';
  }
}
