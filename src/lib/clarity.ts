/**
 * Types for perk descriptions from the Database-Clarity community database.
 * Keyed by perk hash (number stored as string key).
 * https://github.com/Database-Clarity/Live-Clarity-Database
 *
 * Each entry's description is a list of "line groups", each containing
 * "linesContent" segments — either plain text or element/icon class names
 * (e.g. { classNames: ["strand"] }).  The classNames reference DIM's custom
 * icon font; we render them as small coloured inline badges instead.
 */

export interface ClarityLineContent {
  text?: string;
  /** Element/ammo/mode class names (e.g. "solar", "primary", "pve", "link") */
  classNames?: string[];
  /** Present on link-class segments */
  link?: string;
}

export interface ClarityDescriptionGroup {
  /** Inline content segments for this line */
  linesContent?: ClarityLineContent[];
  /**
   * Some groups have no linesContent and only a top-level classNames array.
   * e.g. {"classNames":["spacer"]} inserts a blank line between sections.
   */
  classNames?: string[];
}

export interface ClarityEntry {
  hash: number;
  name: string;
  /** e.g. "Weapon Trait Exotic", "Weapon Trait Legendary", "Origin Trait", "Armor Mod General" */
  type: string;
  lastUpload?: number;
  uploadedBy?: string;
  /** Optional: for exotic perks, the weapon/armor this perk belongs to */
  itemHash?: number;
  itemName?: string;
  descriptions: {
    en: ClarityDescriptionGroup[];
  };
}

export type ClarityDatabase = Record<string, ClarityEntry>;
