export type ExoticClassType = 'hunter' | 'warlock' | 'titan';

export interface ExoticArmorPiece {
  id: string;
  name: string;
  description: string;
  /** Flat stat bonuses applied to all weapon types when this exotic is equipped. */
  statBonuses?: Record<string, number>;
  /** Flat stat bonuses applied only when the active weapon matches one of the listed types. */
  weaponTypeStatBonuses?: {
    types: string[];  // itemTypeDisplayName values, e.g. "Hand Cannon", "Submachine Gun"
    bonuses: Record<string, number>;
  };
  /** Description of any effects that cannot be modeled as flat stat bonuses. */
  effectNote?: string;
}

export const EXOTIC_ARMOR: Record<ExoticClassType, ExoticArmorPiece[]> = {
  hunter: [
    {
      id: 'foetracer',
      name: 'Foetracer',
      description: "Increases damage against enemies marked by Hunter's Mark, scaling with how low their health is.",
      effectNote: 'Damage bonus not modeled (conditional enemy-health mechanic).',
    },
    {
      id: 'knucklehead_radar',
      name: 'Knucklehead Radar',
      description: 'Precision kills temporarily increase weapon handling for the active weapon slot.',
      effectNote: 'Handling boost is conditional on precision kill (temporary, not modeled).',
    },
    {
      id: 'mask_of_bakris',
      name: 'Mask of Bakris',
      description: 'Replaces Dodge with a longer-range Arc-powered dash (Light Shift).',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'mechaneers_tricksleeves',
      name: "Mechaneer's Tricksleeves",
      description: 'Sidearms ready and reload faster. Bonus damage when surrounded.',
      weaponTypeStatBonuses: {
        types: ['Sidearm'],
        bonuses: { Handling: 50, Reload: 50 },
      },
    },
    {
      id: 'oathkeeper',
      name: 'Oathkeeper',
      description: "Bows can be held at full draw indefinitely. Archer's Tempo triggers faster.",
      effectNote: 'Allows infinite bow hold — no flat stat bonus.',
    },
    {
      id: 'sealed_ahamkara_grasps',
      name: 'Sealed Ahamkara Grasps',
      description: 'Melee hits reload your currently equipped weapon.',
      effectNote: 'Functional reload on melee — no flat stat bonus.',
    },
    {
      id: 'triton_vice',
      name: 'Triton Vice',
      description: 'Glaive combos grant bonus perks to stowed weapons.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'the_dragons_shadow',
      name: "The Dragon's Shadow",
      description: 'Dodging greatly increases all weapon handling and reload speed for a brief period.',
      effectNote: 'Handling/Reload boost is conditional on dodge (~5 s duration, not modeled as passive).',
    },
    {
      id: 'lucky_pants',
      name: 'Lucky Pants',
      description: 'Hand Cannons in Kinetic and Energy slots load a powerful round when drawn, with increased ready speed.',
      weaponTypeStatBonuses: {
        types: ['Hand Cannon'],
        bonuses: { Handling: 100 },
      },
    },
    {
      id: 'speedloader_slacks',
      name: 'Speedloader Slacks',
      description: 'Shotguns, Sidearms, and Submachine Guns have greatly increased reload speed.',
      weaponTypeStatBonuses: {
        types: ['Shotgun', 'Sidearm', 'Submachine Gun'],
        bonuses: { Reload: 50 },
      },
    },
  ],

  warlock: [
    {
      id: 'astrocyte_verse',
      name: 'Astrocyte Verse',
      description: 'Blink travels farther and weapons swap faster for a period after Blinking.',
      effectNote: 'Handling boost is conditional on Blink (not modeled as passive).',
    },
    {
      id: 'eye_of_another_world',
      name: 'Eye of Another World',
      description: 'Highlights priority targets. Precision hits slow enemies briefly.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'felwinters_helm',
      name: "Felwinter's Helm",
      description: 'Arc, Solar, and Void melee attacks weaken targets.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'ballidorse_wrathweavers',
      name: 'Ballidorse Wrathweavers',
      description: 'Improved Shiver Strike range; icy aura granted to nearby allies on activation.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'necrotic_grips',
      name: 'Necrotic Grips',
      description: 'Melee attacks poison enemies. Kills spread the corruption to nearby targets.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'ophidian_aspect',
      name: 'Ophidian Aspect',
      description: 'Weapons ready and reload faster. Melee range and speed increased.',
      statBonuses: { Handling: 50, Reload: 50 },
    },
    {
      id: 'mantle_of_battle_harmony',
      name: 'Mantle of Battle Harmony',
      description: "Kills with weapons matching your Super's element restore Super energy faster.",
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'sanguine_alchemy',
      name: 'Sanguine Alchemy',
      description: 'Using your Rift lets you see enemies through walls.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'wings_of_sacred_dawn',
      name: 'Wings of Sacred Dawn',
      description: 'Aiming weapons while airborne briefly suspends you in place.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'boots_of_the_assembler',
      name: 'Boots of the Assembler',
      description: 'Standing in a healing Rift creates Noble Seekers that heal allies.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'lunafaction_boots',
      name: 'Lunafaction Boots',
      description: 'Empowering Rifts automatically reload weapons for you and nearby allies.',
      effectNote: 'Auto-reload applies inside Rift only (conditional, not modeled as passive).',
    },
    {
      id: 'rain_of_fire',
      name: 'Rain of Fire',
      description: 'Evasive Maneuver reloads Fusion Rifles, Linear Fusion Rifles, and Shotguns.',
      effectNote: 'Reload is conditional on dodge — no flat passive stat bonus.',
    },
  ],

  titan: [
    {
      id: 'eternal_warrior',
      name: 'Eternal Warrior',
      description: 'Arc melee activates Unstoppable. Unstoppable duration is extended.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'icefall_mantle',
      name: 'Icefall Mantle',
      description: 'Replaces Barricade with an Overshield ability.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'no_backup_plans',
      name: 'No Backup Plans',
      description: 'Rapid Shotgun kills with close-range weapons grant Separation Shield energy.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'actium_war_rig',
      name: 'Actium War Rig',
      description: 'Steadily reloads a portion of your Auto Rifle and Machine Gun magazines from reserves.',
      effectNote: 'Functional auto-reload mechanic — no flat stat bonus.',
    },
    {
      id: 'doom_fang_pauldron',
      name: 'Doom Fang Pauldron',
      description: 'Void melee kills charge your Super and extend active Void buffs.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'hallowfire_heart',
      name: 'Hallowfire Heart',
      description: 'Greatly improves Solar ability recharge while Hammer of Sol is charged.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'lion_rampant',
      name: 'Lion Rampant',
      description: 'Additional aerial maneuverability. Improves weapon effectiveness while in the air.',
      statBonuses: { 'Airborne Effectiveness': 50 },
    },
    {
      id: 'path_of_burning_steps',
      name: 'The Path of Burning Steps',
      description: 'Solar kills grant Radiant. Radiant kills against Overload Champions stagger them.',
      effectNote: 'No direct weapon stat bonus.',
    },
    {
      id: 'peacekeepers',
      name: 'Peacekeepers',
      description: 'Submachine Guns reload from reserves automatically and can be readied instantly.',
      weaponTypeStatBonuses: {
        types: ['Submachine Gun'],
        bonuses: { Handling: 100 },
      },
    },
    {
      id: 'peregrine_greaves',
      name: 'Peregrine Greaves',
      description: 'Melee abilities deal bonus damage when activated while airborne.',
      effectNote: 'No direct weapon stat bonus.',
    },
  ],
};
