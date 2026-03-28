/**
 * Subclass verb definitions and damage math.
 *
 * All values are community-sourced and reflect base Season 23 numbers.
 * Tier multipliers are approximate — Bungie has never published exact enemy
 * health / damage-received tables, so these are derived from in-game testing.
 */

export type EnemyTier = 'minor' | 'major' | 'champion' | 'boss' | 'vehicle';
export type SubclassElement = 'arc' | 'solar' | 'void' | 'strand' | 'stasis';

export const ENEMY_TIERS: { key: EnemyTier; label: string; hp: number }[] = [
  { key: 'minor',    label: 'Minor (Dreg, Thrall)',      hp: 1_800   },
  { key: 'major',    label: 'Major (Knight, Captain)',   hp: 12_000  },
  { key: 'champion', label: 'Champion / Mini-boss',      hp: 45_000  },
  { key: 'boss',     label: 'Boss (Strike / Raid)',      hp: 250_000 },
  { key: 'vehicle',  label: 'Vehicle / Brig',            hp: 95_000  },
];

export interface VerbCalcResult {
  /** Short headline number / label */
  headline: string;
  /** Supporting breakdown rows */
  rows: { label: string; value: string }[];
  /** Element color class for accent */
  element: SubclassElement;
}

export interface VerbDef {
  key: string;
  name: string;          // verb name: "Jolt", "Ignition", etc.
  perkName: string;      // enabling perk: "Voltshot", "Incandescent", etc.
  element: SubclassElement;
  tagline: string;       // one-line description
  /**
   * Estimate bonus damage contribution.
   * @param baseImpact  weapon's effective impact (0–100)
   * @param rps         rounds per second from weapon RPM
   * @param tier        enemy tier selection
   */
  calcBonus: (baseImpact: number, rps: number, tier: EnemyTier) => VerbCalcResult;
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Very rough "damage per bullet" estimate from Impact stat.
 * Real numbers depend on archetype scaling; this gives a ballpark figure
 * useful for relative comparisons.
 */
function impactToDamage(impact: number): number {
  // Linear approximation: Impact 0=200 dmg, 100=6000 dmg
  return 200 + impact * 58;
}

// Ignition damage by enemy tier (from community spreadsheets)
const IGNITION_BASE = 880;
const IGNITION_TIER_MULT: Record<EnemyTier, number> = {
  minor:    1.00,
  major:    0.85,
  champion: 0.72,
  boss:     0.45,
  vehicle:  0.60,
};

// Volatile explosion multiplier (fraction of weapon bullet damage)
const VOLATILE_MULT = 0.35;

// Unravel threadling detonation damage (fixed per threadling)
const THREADLING_DAMAGE = 4_250;

// Freeze + shatter multiplier bonus
const SHATTER_MULT = 1.65;

// ─── Verb definitions ─────────────────────────────────────────────────────────

export const SUBCLASS_VERBS: VerbDef[] = [
  // ── Arc ──────────────────────────────────────────────────────────────────
  {
    key: 'jolt',
    name: 'Jolt',
    perkName: 'Voltshot',
    element: 'arc',
    tagline: 'On reload after kill: Jolt the target. Jolt chains lightning to nearby enemies.',
    calcBonus(baseImpact, rps, tier) {
      const bulletDmg = impactToDamage(baseImpact);
      // Jolt: 6 procs over 5s, each ~15% of bullet damage
      const joltProcs = 6;
      const joltProcDmg = bulletDmg * 0.15;
      const joltTotal = joltProcs * joltProcDmg;

      // Chain: each arc jumps to adjacent enemies at diminishing damage.
      // Target 1 (original): 100% of proc dmg
      // Target 2: ~80%, Target 3: ~65%, Target 4: ~52%
      // chainTotalOnSecondary = sum of what chains to up to 3 OTHER targets from one proc
      const chainProcDmg = joltProcDmg * (0.80 + 0.65 + 0.52); // total chain from one proc
      const chainTotal   = joltProcs * chainProcDmg;            // total chain over full Jolt

      const dps = joltTotal / 5; // primary target DPS over 5s window

      const tierHp = ENEMY_TIERS.find((t) => t.key === tier)!.hp;
      const pct = ((joltTotal / tierHp) * 100).toFixed(1);

      return {
        headline: `${Math.round(joltTotal).toLocaleString()} Jolt damage (primary target)`,
        element: 'arc',
        rows: [
          { label: 'Procs per application', value: `${joltProcs}` },
          { label: 'Damage per proc',        value: `~${Math.round(joltProcDmg).toLocaleString()}` },
          { label: 'Total Jolt (primary)',   value: Math.round(joltTotal).toLocaleString() },
          { label: 'Chain to 3 nearby (total)', value: `~${Math.round(chainTotal).toLocaleString()}` },
          { label: 'Jolt DPS (5 s)',         value: `${Math.round(dps).toLocaleString()}/s` },
          { label: '% of enemy HP',          value: `${pct}%` },
        ],
      };
    },
  },

  // ── Solar ─────────────────────────────────────────────────────────────────
  {
    key: 'ignition',
    name: 'Ignition',
    perkName: 'Incandescent',
    element: 'solar',
    tagline: 'On kill: spreads 30 Scorch to nearby enemies. At 100 Scorch → Ignition.',
    calcBonus(baseImpact, rps, tier) {
      const ignDmg = Math.round(IGNITION_BASE * IGNITION_TIER_MULT[tier]);
      // Incandescent spreads 30 stacks → 4 kills of anything with 25 stacks already to chain
      // Scorch DoT: each tick = (stacks / 100) * ~40 dmg
      const scorchTicks = 6;    // ticks before Ignition at 100 stacks
      const scorchDmg = Math.round(scorchTicks * (30 / 100) * 40);
      const totalDmg = ignDmg + scorchDmg;
      const tierHp = ENEMY_TIERS.find((t) => t.key === tier)!.hp;
      const pct = ((totalDmg / tierHp) * 100).toFixed(1);

      return {
        headline: `${ignDmg.toLocaleString()} Ignition + ${scorchDmg} Scorch`,
        element: 'solar',
        rows: [
          { label: 'Scorch spread per kill', value: '30 stacks' },
          { label: 'Scorch DoT (30 stacks)', value: `~${scorchDmg.toLocaleString()}` },
          { label: 'Ignition at 100 stacks', value: ignDmg.toLocaleString() },
          { label: 'Total burst + DoT',       value: totalDmg.toLocaleString() },
          { label: 'Ignition radius',         value: '~9m' },
          { label: '% of enemy HP',           value: `${pct}%` },
        ],
      };
    },
  },

  // ── Void ─────────────────────────────────────────────────────────────────
  {
    key: 'volatile',
    name: 'Volatile',
    perkName: 'Destabilizing Rounds',
    element: 'void',
    tagline: 'On hit: applies Volatile. Volatile explodes for area damage around the target.',
    calcBonus(baseImpact, rps, tier) {
      const bulletDmg = impactToDamage(baseImpact);
      const volatileDmg = Math.round(bulletDmg * VOLATILE_MULT);
      // Suppression / Volatile triggers on next hit after debuff applies
      const bulletsToProc = Math.ceil(rps * 0.5); // ~0.5s to proc
      const dpsBonus = volatileDmg * rps; // roughly one volatile per bullet at high rate
      const tierHp = ENEMY_TIERS.find((t) => t.key === tier)!.hp;
      const pct = ((volatileDmg / tierHp) * 100).toFixed(1);

      return {
        headline: `${volatileDmg.toLocaleString()} Volatile explosion`,
        element: 'void',
        rows: [
          { label: 'Explosion damage',     value: volatileDmg.toLocaleString() },
          { label: '% of bullet damage',   value: '~35%' },
          { label: 'Explosion radius',      value: '~5m' },
          { label: 'Approximate DPS bonus',value: `+${Math.round(dpsBonus).toLocaleString()}/s` },
          { label: '% of enemy HP',        value: `${pct}%` },
        ],
      };
    },
  },

  // ── Strand ───────────────────────────────────────────────────────────────
  {
    key: 'unravel',
    name: 'Unravel',
    perkName: 'Hatchling / Weaver\'s Call',
    element: 'strand',
    tagline: 'Spread Unravel on hits. Threadlings detonate on targets for additional damage.',
    calcBonus(baseImpact, rps, tier) {
      // Threadlings spawn ~every 5 bullets in Unravel state
      const bulletsPerThreadling = 5;
      const threadlingsPerMag = Math.floor(30 / bulletsPerThreadling); // assume 30-round mag
      const totalThreadlingDmg = threadlingsPerMag * THREADLING_DAMAGE;
      const tierHp = ENEMY_TIERS.find((t) => t.key === tier)!.hp;
      const pct = ((totalThreadlingDmg / tierHp) * 100).toFixed(1);

      return {
        headline: `${totalThreadlingDmg.toLocaleString()} Threadling damage/mag`,
        element: 'strand',
        rows: [
          { label: 'Threadling detonation', value: THREADLING_DAMAGE.toLocaleString() },
          { label: 'Bullets per spawn',     value: `${bulletsPerThreadling}` },
          { label: 'Threadlings per mag',   value: `~${threadlingsPerMag}` },
          { label: 'Total per mag',         value: totalThreadlingDmg.toLocaleString() },
          { label: '% of enemy HP',         value: `${pct}%` },
        ],
      };
    },
  },

  // ── Stasis ───────────────────────────────────────────────────────────────
  {
    key: 'shatter',
    name: 'Shatter',
    perkName: 'Cold Steel / Headstone',
    element: 'stasis',
    tagline: 'Freeze targets. Shattering a frozen enemy multiplies all incoming damage.',
    calcBonus(baseImpact, rps, tier) {
      const bulletDmg = impactToDamage(baseImpact);
      const shatterDmg = Math.round(bulletDmg * SHATTER_MULT);
      const bonusDmg = shatterDmg - bulletDmg;
      // Freeze requires 1 Slow stack (100 stacks) or direct freeze
      // Shatter kills immediately on Frozen targets if they're below the shatter threshold
      const tierHp = ENEMY_TIERS.find((t) => t.key === tier)!.hp;
      const pct = ((bonusDmg / tierHp) * 100).toFixed(2);

      return {
        headline: `×${SHATTER_MULT} dmg on frozen — +${Math.round(bonusDmg).toLocaleString()} bonus`,
        element: 'stasis',
        rows: [
          { label: 'Shatter multiplier',    value: `×${SHATTER_MULT}` },
          { label: 'Base bullet damage',    value: bulletDmg.toLocaleString() },
          { label: 'Shatter bullet damage', value: shatterDmg.toLocaleString() },
          { label: 'Bonus per bullet',      value: `+${Math.round(bonusDmg).toLocaleString()}` },
          { label: '% bonus of enemy HP',   value: `${pct}%` },
        ],
      };
    },
  },
];
