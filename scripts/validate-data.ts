/**
 * Build-time data validation script.
 *
 * Checks that all hand-maintained JSON files in src/data/ are internally
 * consistent and reference only stat names / weapon subtypes that the rest
 * of the codebase knows about.
 *
 * Exits with code 1 if any hard errors are found (would cause silent runtime
 * failures).  Warnings are printed but do not block the build.
 *
 * Usage:
 *   npx tsx scripts/validate-data.ts
 *
 * This is run automatically via the "validate" npm script.
 * Add it to CI after the build step to catch regressions.
 */

import fs from 'fs';
import path from 'path';

// ── Load data files ──────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;
}

const perkAudit       = loadJson<Record<string, { statModifiers: Array<{ statName: string; value: number }> }>>('perkAudit.json');
const combatantScalars = loadJson<Record<string, Record<string, number>>>('combatantScalars.json');

const archetypesRaw   = loadJson<{ subtypes: Record<string, { name: string }>; archetypes: Record<string, unknown> }>('archetypes.json');

// ── Canonical stat names ─────────────────────────────────────────────────────
// Must stay in sync with STAT_HASH_MAP in src/lib/bungie/parser.ts.

const CANONICAL_STATS = new Set([
  'Impact', 'Range', 'Stability', 'Handling', 'Reload',
  'Aim Assistance', 'Zoom', 'Recoil Direction', 'Airborne Effectiveness',
  'RPM', 'Magazine', 'Charge Time', 'Draw Time',
  'Blast Radius', 'Velocity', 'Accuracy', 'Ammo Generation',
  'Swing Speed', 'Guard Resistance', 'Charge Rate', 'Guard Endurance',
  'Shield Duration', 'Ammo Capacity',
  'Cooling Efficiency', 'Heat Generated', 'Vent Speed', 'Persistence',
]);

// Aliases accepted in perkAudit (normalised by parser.ts at parse time).
const STAT_NAME_ALIASES: Record<string, string> = {
  'Reload Speed':  'Reload',
  'Airborne Eff.': 'Airborne Effectiveness',
  'Aim Assist':    'Aim Assistance',
  'Recoil':        'Recoil Direction',
  'Fire Rate':     'RPM',
};

// Weapon subtypes with combatant scalars — must stay in sync with SUBTYPE_TO_TYPE.
const KNOWN_SUBTYPES = new Set([6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 22, 24, 25, 29, 31, 33, 34, 35, 36, 37]);
const EXPECTED_TIERS = new Set(['Minor', 'Major / Elite', 'Miniboss', 'Boss', 'Champion']);

// ── Helpers ──────────────────────────────────────────────────────────────────

let errors   = 0;
let warnings = 0;

function error(msg: string) {
  console.error(`  ✗ ERROR: ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠ WARN:  ${msg}`);
  warnings++;
}

// ── Check 1: perkAudit stat names ────────────────────────────────────────────

console.log('\n[1] perkAudit.json — stat name validation');

const unknownStatNames = new Set<string>();

for (const [perkName, entry] of Object.entries(perkAudit)) {
  for (const mod of entry.statModifiers) {
    const resolved = STAT_NAME_ALIASES[mod.statName] ?? mod.statName;
    if (!CANONICAL_STATS.has(resolved)) {
      unknownStatNames.add(mod.statName);
    }
    // Detect if the alias map is still needed (aliases present in the data)
    if (STAT_NAME_ALIASES[mod.statName]) {
      // alias applied — all good
    }
  }
  void perkName; // suppress unused warning
}

if (unknownStatNames.size === 0) {
  console.log('  ✓ All stat names resolve to canonical names.');
} else {
  for (const name of unknownStatNames) {
    warn(`perkAudit uses unrecognised stat name "${name}" — no alias maps it to a canonical stat (modifier will be silently ignored at runtime)`);
  }
}

// ── Check 2: combatantScalars.json completeness ──────────────────────────────

console.log('\n[2] combatantScalars.json — subtype + tier coverage');

for (const subtype of KNOWN_SUBTYPES) {
  const entry = combatantScalars[String(subtype)];
  if (!entry) {
    error(`No combatant scalar entry for subtype ${subtype}`);
    continue;
  }
  for (const tier of EXPECTED_TIERS) {
    if (entry[tier] == null) {
      error(`combatantScalars[${subtype}] missing tier "${tier}"`);
    }
  }
}

// Check for unknown subtypes in scalars file
for (const key of Object.keys(combatantScalars)) {
  if (!KNOWN_SUBTYPES.has(Number(key))) {
    warn(`combatantScalars.json has entry for subtype ${key} which is not in KNOWN_SUBTYPES`);
  }
}

if (errors === 0) {
  console.log('  ✓ All known subtypes have full tier coverage.');
}

// ── Check 3: archetypes.json internal consistency ────────────────────────────
// Each subtype listed under "subtypes" should have at least one archetype entry.

console.log('\n[3] archetypes.json — subtype ↔ archetype entry coverage');

const arcSubtypes   = Object.keys(archetypesRaw.subtypes);
const archetypeKeys = new Set(Object.keys(archetypesRaw.archetypes));

let missingArcEntries = 0;
for (const subtype of arcSubtypes) {
  const hasEntry = [...archetypeKeys].some((k) => k.startsWith(`${subtype}_`));
  if (!hasEntry) {
    warn(`archetypes.json subtype ${subtype} (${archetypesRaw.subtypes[subtype].name}) has no archetype entries (keys like "${subtype}_<rpm>")`);
    missingArcEntries++;
  }
}

if (missingArcEntries === 0) {
  console.log('  ✓ All archetypes.json subtypes have at least one archetype entry.');
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────');
if (errors > 0) {
  console.error(`validate-data: ${errors} error(s), ${warnings} warning(s) — FAIL`);
  process.exit(1);
} else {
  console.log(`validate-data: 0 errors, ${warnings} warning(s) — OK`);
}
