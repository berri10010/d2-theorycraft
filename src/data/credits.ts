/**
 * Every outside source of data, formulas, art and code the site relies on. This is the single list the
 * /credits page, the footer and the in-panel notes are built from, and `credits.test.ts` fails if a data
 * file is added without crediting where it came from (see DATA_FILE_CREDITS).
 */

export type CreditGroup = 'game' | 'analysis' | 'math' | 'built';

export interface CreditLink { label: string; url: string }

export interface Credit {
  id: string;
  name: string;
  /** The name as it appears in the footer. */
  short?: string;
  /** Who made it, as they credit themselves. */
  by?: string;
  /** Main link; omitted when no public link is known. */
  url?: string;
  /** Extra links (Discord, repository, ...). */
  links?: CreditLink[];
  group: CreditGroup;
  /** What the site takes from it. */
  what: string;
  /** Where it shows up. */
  where: string;
}

export const CREDIT_GROUPS: Record<CreditGroup, { title: string; blurb: string }> = {
  game: {
    title: 'Game data and art',
    blurb: 'Where weapons, perks, stats and every icon come from.',
  },
  analysis: {
    title: 'Community analysis',
    blurb: 'Tier lists, god rolls and drop sources written by people who play and test the game. Their work is shown as written and linked wherever it appears.',
  },
  math: {
    title: 'Combat math and formulas',
    blurb: 'The numbers behind time to kill, DPS, damage falloff, reload and handling times, and damage buffs.',
  },
  built: {
    title: 'Built with',
    blurb: 'Open-source libraries, fonts and hosting.',
  },
};

export const CREDITS: Credit[] = [
  // ── Game data and art ──
  {
    id: 'bungie', short: 'Bungie', name: 'Bungie API and manifest', by: 'Bungie, Inc.', url: 'https://www.bungie.net',
    links: [{ label: 'API documentation', url: 'https://bungie-net.github.io/' }],
    group: 'game',
    what: 'Weapons, perks, mods, stats, stat curves, descriptions, season data, plus every weapon, perk, mod and ability icon and screenshot (loaded from bungie.net).',
    where: 'Everywhere. The data is refreshed daily from the manifest.',
  },
  {
    id: 'dim', short: 'DIM', name: 'Destiny Item Manager (DIM)', by: 'The DIM team', url: 'https://destinyitemmanager.com',
    links: [{ label: 'd2-additional-info', url: 'https://github.com/DestinyItemManager/d2-additional-info' }],
    group: 'game',
    what: "The watermark-to-season map that tells us which season a weapon is from, and the wishlist file format used by Share and Import.",
    where: 'Season labels and filters, DIM wishlist export and import.',
  },
  {
    id: 'clarity', short: 'Clarity', name: 'Clarity', by: 'Clarity team (Hawkmoona, Stardust and contributors)', url: 'https://d2clarity.com',
    links: [{ label: 'Clarity Discord', url: 'https://d2clarity.com/discord' }],
    group: 'game',
    what: 'Plain-language perk descriptions with exact numbers (and PvE / PvP splits), used for the Effects panel, the perk activation notes and to verify damage buff values.',
    where: 'Effects panel, perk tooltips, External Buffs values.',
  },

  // ── Community analysis ──
  {
    id: 'aegis', short: 'TheAegisRelic', name: 'Destiny 2 Endgame Analysis', by: 'TheAegisRelic', url: 'https://docs.google.com/spreadsheets/d/1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY',
    links: [{ label: '@theaegisrelic', url: 'https://twitter.com/theaegisrelic' }],
    group: 'analysis',
    what: 'PvE weapon tiers, god rolls, analyst notes, and the perk tier ratings.',
    where: 'PvE tier badges and sort, God Roll panel (PvE), perk tier badges, Featured God Rolls.',
  },
  {
    id: 'pride', short: 'Pride Eternal', name: "Pride Eternal's PvP spreadsheet", by: 'Pride Eternal (Finnald)', url: 'https://docs.google.com/spreadsheets/d/1TVgtTRWNGEPi6OMlTLxXFSKUTi_ycwykhwuw8EW_jJ0',
    links: [
      { label: 'Reddit', url: 'https://www.reddit.com/user/PrideEternalFinnald/' },
      { label: 'Twitch', url: 'https://www.twitch.tv/pride_eternal' },
      { label: 'Ko-fi', url: 'https://ko-fi.com/prideeternal' },
    ],
    group: 'analysis',
    what: 'PvP weapon tiers, preferred perks per column, origin traits, role notes, and how each exotic does in Trials, Comp, Quickplay and duels.',
    where: 'PvP tier badges and sort, God Roll panel (PvP), perk highlights, roll score in PvP.',
  },
  {
    id: 'crucibleguidebook', short: 'r/CrucibleGuidebook', name: 'r/CrucibleGuidebook community PvP wishlist', by: 'u/SirTurnUp and the r/CrucibleGuidebook community; DIM wishlist by Wunderkammern',
    url: 'https://github.com/Wunderkammern/CrucibleGuidebook-PVP-DIM-Wishlist/wiki/CrucibleGuidebook-DIM-Wishlist',
    links: [{ label: 'r/CrucibleGuidebook', url: 'https://www.reddit.com/r/CrucibleGuidebook/' }],
    group: 'analysis',
    what: 'Recommended PvP perks per weapon, used where Pride Eternal has no entry or leaves a column empty.',
    where: 'God Roll panel (PvP), perk highlights, roll score in PvP.',
  },
  {
    id: 'sax', short: 'Sax', name: 'Monument of Triumph Legendary Loot Sources', by: 'Sax', url: 'https://docs.google.com/spreadsheets/d/1WDj-vExf9c982PVc1nRRfjadhkcZFqa7nv14cCMI8C8',
    group: 'analysis',
    what: 'Where each legendary weapon drops: vendors, destinations, dungeons, raids and craftable sources.',
    where: 'The source line under the weapon header.',
  },

  // ── Combat math and formulas ──
  {
    id: 'huwugo', short: 'huwugo_', name: 'Destiny WeaponStat Chart', by: 'huwugo_', url: 'https://docs.google.com/spreadsheets/d/1FWMC-Vd_bGEoRkkrn3drWIORCFYyWQVMNlMasa4OE6I',
    group: 'math',
    what: 'Per-frame damage, shot and burst timing, charge times and pellet counts (the WeaponData tab), refreshed daily.',
    where: 'TTK, DPS, damage falloff, compare cards.',
  },
  {
    id: 'rockstarmatt', short: 'rockstarmatt', name: 'TTK Breakpoints', by: 'rockstarmatt',
    group: 'math',
    what: 'Damage and range data per archetype behind the falloff chart and the breakpoint table. (No public link on file.)',
    where: 'Damage falloff chart, TTK vs distance.',
  },
  {
    id: 'mossymax', short: 'MossyMax', name: 'Outgoing Damage Scaling and ammo data', by: 'MossyMax',
    group: 'math',
    what: 'PvE damage scalars per enemy type, the power-level delta curve, and magazine and reserve data. (No public link on file.)',
    where: 'PvE TTK and DPS, power delta slider, Ammo panel.',
  },
  {
    id: 'oracle', short: 'd2foundry', name: 'oracle_engine', by: 'd2foundry', url: 'https://github.com/d2foundry/oracle_engine',
    group: 'math',
    what: 'The formulas that turn Reload, Handling and Draw Time stats into seconds, and the perfect-draw window for bows.',
    where: 'Stat tooltips, reload time, ready / stow / ADS times, bow draw window.',
  },
  {
    id: 'blueberries', short: 'Blueberries.gg', name: 'Destiny 2 Buffs and Debuffs guide', by: 'Blueberries.gg', url: 'https://www.blueberries.gg/leveling/destiny-2-buffs-debuffs/',
    group: 'math',
    what: 'PvE and PvP values for general buffs, debuffs and weapon surges, used with Clarity to audit the External Buffs.',
    where: 'External Buffs panel, Armor Mods weapon surge.',
  },
  {
    id: 'compendium', short: 'Data Compendium', name: 'Destiny Data Compendium', url: 'https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4',
    group: 'math',
    what: "In-game values written up per exotic, perk and mechanic; Clarity's descriptions are built from it. The site takes each exotic's PvE damage (its own PvE bonus over a legendary of its type), the rocket launcher damage the stat sheet lacks, and precise perk numbers.",
    where: 'DPS and TTK for exotics, exotic perk effects, External Buffs.',
  },
  {
    id: 'destinypedia', name: 'Destinypedia', url: 'https://www.destinypedia.com/Ward_of_Dawn',
    group: 'math',
    what: "Ward of Dawn's Weapons of Light (+25% weapon damage for 10 seconds). Bungie publishes no number for it.",
    where: 'External Buffs panel.',
  },
  {
    id: 'thegamer', name: 'Arc 3.0 Keywords, Aspects, And Fragments Explained', by: 'TheGamer', url: 'https://www.thegamer.com/destiny-2-arc-rework-aspects-fragments-keywords/',
    group: 'math',
    what: "Amplified's +40 Handling and Flow State's reload bonus, which Bungie does not publish as numbers.",
    where: 'External Buffs panel.',
  },
  {
    id: 'community-testing', name: 'Community testing and spreadsheets',
    group: 'math',
    what: 'Subclass verb and ignition damage estimates, which come from in-game testing by the community rather than any published table.',
    where: 'Subclass panel (labelled as estimates).',
  },

  // ── Built with ──
  { id: 'nextjs', name: 'Next.js', by: 'Vercel', url: 'https://nextjs.org', group: 'built', what: 'The framework; the site is a static export.', where: 'The whole site.' },
  { id: 'react', name: 'React', by: 'Meta', url: 'https://react.dev', group: 'built', what: 'The UI library.', where: 'The whole site.' },
  { id: 'zustand', name: 'Zustand', by: 'Poimandres', url: 'https://github.com/pmndrs/zustand', group: 'built', what: 'State management.', where: 'The editor, compare and settings.' },
  { id: 'framer-motion', name: 'Motion (Framer Motion)', by: 'Matt Perry', url: 'https://motion.dev', group: 'built', what: 'Animations and bottom sheets.', where: 'Mobile navigation, panels.' },
  { id: 'tanstack-virtual', name: 'TanStack Virtual', by: 'Tanner Linsley', url: 'https://tanstack.com/virtual', group: 'built', what: 'Fast scrolling through the long weapon list.', where: 'Weapon list.' },
  { id: 'tailwind', name: 'Tailwind CSS', by: 'Tailwind Labs', url: 'https://tailwindcss.com', group: 'built', what: 'Styling.', where: 'The whole site.' },
  { id: 'inter', name: 'Inter', by: 'Rasmus Andersson', url: 'https://rsms.me/inter/', group: 'built', what: 'The typeface (SIL Open Font License), served by Google Fonts.', where: 'The whole site.' },
  { id: 'cloudflare', name: 'Cloudflare Workers', by: 'Cloudflare', url: 'https://workers.cloudflare.com', group: 'built', what: 'Hosting.', where: 'The whole site.' },
];

export const creditById = (id: string): Credit | undefined => CREDITS.find((c) => c.id === id);

/**
 * Which credits each shipped data file comes from. `credits.test.ts` checks that every file in
 * public/data and src/data is listed here and that every id exists, so a new data file can't ship
 * without saying where it came from.
 */
export const DATA_FILE_CREDITS: Record<string, string[]> = {
  'public/data/weapons.json': ['bungie', 'dim'],
  'public/data/perks.json': ['bungie', 'clarity'],
  'src/data/catalystEffects.ts': ['clarity'],
  'public/data/mods.json': ['bungie'],
  'public/data/statgroups.json': ['bungie'],
  'public/data/clarity.json': ['clarity'],
  'public/data/god-rolls.json': ['aegis'],
  'public/data/pride.json': ['pride'],
  'public/data/pvp-wishlist.json': ['crucibleguidebook'],
  'public/data/sources.json': ['sax'],
  'src/data/ammoData.json': ['mossymax', 'bungie'],
  'src/data/archetypes.json': ['huwugo', 'rockstarmatt'],
  'src/data/buffs.json': ['clarity', 'blueberries', 'bungie', 'destinypedia', 'thegamer', 'compendium'],
  'src/data/compendium.ts': ['compendium'],
  'src/data/combatantScalars.json': ['mossymax'],
  'src/data/credits.ts': [],
  'src/data/exoticArmor.ts': ['bungie'],
  'src/data/localIcons.json': ['bungie'],
  'src/data/perkAudit.json': ['clarity'],
  'src/data/perkTiers.json': ['aegis'],
  'src/data/plDeltaCurve.json': ['mossymax'],
  'src/data/subclassVerbs.ts': ['community-testing'],
  'src/data/weaponStats.json': ['huwugo'],
  'src/data/weaponStatsMeta.json': ['huwugo'],
};

/** The short list shown in the footer: the people whose data the site is built on. */
export const FOOTER_CREDIT_IDS = ['bungie', 'clarity', 'aegis', 'pride', 'crucibleguidebook', 'sax', 'huwugo', 'rockstarmatt', 'mossymax', 'oracle', 'blueberries', 'dim'];
