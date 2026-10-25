/**
 * Catalyst effects that change damage, from Clarity's catalyst text: exotic weapon name -> keys in buffs.json.
 * Only effects with published numbers are here, and only on weapons whose damage the site can calculate. Catalysts
 * that grant a trait the site already models point at that perk's buff (Alethonym and Wish-Ender get One For All).
 * Everything else a catalyst does is shown as Clarity's text on the Catalyst card, not modelled.
 */
export const CATALYST_EFFECTS: Record<string, string[]> = {
  'Vex Mythoclast': ['catalyst_mythoclast_surge'],
  "Ager's Scepter": ['catalyst_will_given_form'],
  'Cerberus+1': ['catalyst_cerberus_kill'],
  'Divinity': ['catalyst_divinity_precision'],
  'Necrochasm': ['catalyst_necrochasm_triple'],
  "Devil's Ruin": ['catalyst_devils_ruin_pickup'],
  'Whisper of the Worm': ['catalyst_whispered_breathing'],
  'Alethonym': ['one_for_all'],
  'Wish-Ender': ['one_for_all'],
};
