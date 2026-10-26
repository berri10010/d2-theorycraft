/**
 * Exotic weapon numbers from the Destiny Data Compendium (Exotic Weapons tab,
 * docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4), October 2026.
 *
 * The compendium states a weapon's damage as "PvE [PvP]", for example "deals 175 [43] Damage". The site's stat rows
 * hold the PvP figure and scale it to PvE with a per-weapon-type factor (combatantScalars.json), which is right for
 * legendaries but misses each exotic's own PvE bonus. For the weapons below the compendium's PvP figure matches the
 * stat row exactly, so its PvE figure is trusted too: `factor` is how much more (or less) PvE damage the weapon does
 * than a legendary of its type, i.e. PvE / (PvP x the type's Minor scalar).
 *
 * Every entry carries the compendium text it came from; compendium.test.ts re-derives the numbers from that text, so a
 * typo cannot slip in. Weapons whose compendium figures did not fit the pattern (a factor outside 1.0 to 1.8, or a
 * PvP figure that does not match the sheet) are deliberately left out rather than guessed.
 */
import type { WeaponStatEntry } from '../lib/weaponStats';

export interface PveBonus {
  /** Multiplier on the type's PvE scalar at every enemy tier. */
  factor: number;
  /** The compendium wording the factor comes from. */
  evidence: string;
  /** Extra multiplier at particular tiers (Wardcliff Coil deals 80% less to Minibosses and Bosses). */
  tierMult?: Partial<Record<string, number>>;
  /** For factors derived from a "PvE [PvP]" damage figure: those two numbers (compendium.test.ts checks them). */
  pve?: number;
  pvp?: number;
}

/** Keyed by weapon name. */
export const EXOTIC_PVE: Record<string, PveBonus> = {
  'Arbalest':           { factor: 1.39, pve: 582, pvp: 132,  evidence: 'deals 582 [132] damage' },
  'Bastion':            { factor: 1.36, pve: 136, pvp: 31.2, evidence: 'each pellet deals 136 [31.2] damage' },
  'Buried Bloodline':   { factor: 1.75, pve: 249, pvp: 42.3, evidence: 'deals 249 [42.3] damage' },
  'Crimson':            { factor: 1.21, pve: 67,  pvp: 18,   evidence: 'deals 67 [18] damage' },
  'Euphony':            { factor: 1.41, pve: 174, pvp: 39,   evidence: 'deals 174 [39] damage' },
  'Final Warning':      { factor: 1.40, pve: 118, pvp: 25,   evidence: 'deals 118 [25] damage' },
  'Ice Breaker':        { factor: 1.27, pve: 789, pvp: 142,  evidence: 'deals 789 [142] damage' },
  'Lorentz Driver':     { factor: 1.21, pve: 506, pvp: 132,  evidence: 'deals 506 [132] damage' },
  'Malfeasance':        { factor: 1.56, pve: 216, pvp: 45,   evidence: 'deals 216 [45] damage' },
  'New Land Beyond':    { factor: 1.43, pve: 970, pvp: 155,  evidence: 'deals 970 [155] Kinetic Damage' },
  'The Last Word':      { factor: 1.33, pve: 175, pvp: 43,   evidence: 'each shot dealing 175 [43] Damage' },
  "Ager's Scepter":     { factor: 1.3,  evidence: 'Intrinsically has a 1.3x PVE Bonus over Legendary Trace Rifles.' },
  'Ruinous Effigy':     { factor: 1.4,  evidence: 'Intrinsically has a 1.4x PVE Bonus over Legendary Trace Rifles.' },
};

type RowFields = Pick<WeaponStatEntry, 'type' | 'ammo' | 'bodyDamage' | 'critDamage' | 'shotDelay' | 'pellets' | 'rpm'>;

export interface CompendiumRow extends RowFields {
  pveFactor: number;
  pveTierMult?: Partial<Record<string, number>>;
  /** The compendium wording the damage comes from. */
  evidence: string;
  /** PvE and PvP damage per projectile, as stated; the row holds the PvP one. */
  pve: number;
  pvp: number;
}

/**
 * Rocket launchers have no rows in the stat sheet, so these two come straight from the compendium: damage per rocket
 * is impact plus explosive, taken at the centre of the blast, and every rocket of a volley is assumed to hit. Fire
 * delay is 30fps frames from Bungie's rpm (60 / rpm * 30).
 */
export const COMPENDIUM_ROWS: Record<string, CompendiumRow> = {
  'The Wardcliff Coil': {
    type: 'Rocket Launcher', ammo: 'h', bodyDamage: 322, critDamage: 322, shotDelay: 30, pellets: 8, rpm: 60,
    // 1607 PvE / (322 PvP x rocket Minor scalar 3.6)
    pveFactor: 1.39, pveTierMult: { Miniboss: 0.2, Boss: 0.2 },
    pve: 1607, pvp: 322,
    evidence: 'Shoots a volley of 8 wildly imprecise rockets, each dealing 107 [22] impact and up to 1500 [300] explosive damage. Deals 80% decreased damage to Minibosses, Bosses, and Vehicles.',
  },
  'Eyes of Tomorrow': {
    type: 'Rocket Launcher', ammo: 'h', bodyDamage: 215, critDamage: 215, shotDelay: 90, pellets: 6, rpm: 20,
    // 1015 PvE / (215 PvP x rocket Minor scalar 3.6)
    pveFactor: 1.31,
    pve: 1015, pvp: 215,
    evidence: 'Fires 6 Rockets per Volley, with each Rocket exploding on proximity to an enemy, individually dealing up to 1,015 [215] Splash Damage.',
  },
  // A Lightweight scout (Bungie's 200 rpm) that fires 4 projectiles a shot. Its PvE damage per projectile is a lot
  // lower than its PvP damage scaled up (29 against 14 x the scout Minor scalar 4.33), hence a factor under 1.
  // Amalgamation Rounds (+290% PvE, +18% PvP) are not modelled.
  'Third Iteration': {
    type: 'Scout', ammo: 'p', bodyDamage: 14, critDamage: 23.66, shotDelay: 9, pellets: 4, rpm: 200,
    // 29 PvE / (14 PvP x scout Minor scalar 4.33)
    pveFactor: 0.48,
    pve: 29, pvp: 14,
    evidence: 'Fires a narrow Spread Shot of 4 Void Projectiles, each dealing 29 [14] Damage with a 1.69x Precision Multiplier.',
  },
};

/**
 * Exotics whose sheet row exists under another name. Revision Zero's rows sit under their own type in the sheet; its
 * Bungie rpm of 450 is the sheet's Light Burst row (Heavy Burst is 327 rpm).
 */
export const EXOTIC_ROW_ALIASES: Record<string, string> = {
  'Revision Zero': 'Revision Zero_p_Light Burst',
};
