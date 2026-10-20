/**
 * Bungie's DestinyItemSubType numbers (what `weapon.itemSubType` holds) differ from the
 * numbering used by the community stat spreadsheets behind weaponStats.json and
 * combatantScalars.json for a few weapon types. Convert before indexing those tables.
 *
 *   Bungie  →  sheet
 *   18 Sword            34
 *   23 Grenade Launcher 25
 *   25 Trace Rifle      29
 *
 * Everything else (auto 6, shotgun 7, MG 8, HC 9, rocket 10, fusion 11, sniper 12, pulse 13,
 * scout 14, sidearm 17, LFR 22, SMG 24, bow 31, glaive 33) is numbered the same in both.
 */
const BUNGIE_TO_SHEET: Record<number, number> = { 18: 34, 23: 25, 25: 29 };

export function sheetSubType(bungieSubType: number): number {
  return BUNGIE_TO_SHEET[bungieSubType] ?? bungieSubType;
}
