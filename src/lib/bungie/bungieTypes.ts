export interface BungieManifestResponse {
  Response: {
    version: string;
    jsonWorldComponentContentPaths: {
      en: {
        DestinyInventoryItemDefinition: string;
        DestinyStatDefinition: string;
        DestinySocketCategoryDefinition: string;
        DestinyPlugSetDefinition: string;
        DestinySeasonDefinition: string;
        DestinyCollectibleDefinition: string;
      };
    };
  };
}

export interface BungieSeasonDefinition {
  hash: number;
  seasonNumber: number;
  displayProperties: {
    name: string;
    icon: string;
  };
  artifactItemHash?: number;
  startDate?: string;
}

export interface BungieDisplayProperties {
  name: string;
  description: string;
  icon: string;
  hasIcon: boolean;
}

export interface BungieCollectibleDefinition {
  hash: number;
  sourceString?: string;
  displayProperties: { name: string; description: string };
}

export interface BungieInventoryItem {
  hash: number;
  /** Points to a DestinyCollectibleDefinition whose sourceString says how to obtain this item */
  collectibleHash?: number;
  displayProperties: BungieDisplayProperties;
  itemType: number;
  itemSubType: number;
  itemTypeDisplayName: string;
  defaultDamageTypeHash: number;
  flavorText?: string;
  screenshot?: string;
  iconWatermark?: string;
  seasonHash?: number;
  equippingBlock?: { uniqueLabel?: string; ammoType?: number };
  inventory?: { recipeItemHash?: number; tierTypeName?: string };
  stats?: {
    stats: Record<string, { statHash: number; value: number }>;
  };
  sockets?: {
    socketCategories: Array<{
      socketCategoryHash: number;
      socketIndexes: number[];
    }>;
    socketEntries: Array<{
      socketTypeHash: number;
      singleInitialItemHash: number;
      reusablePlugSetHash?: number;
      randomizedPlugSetHash?: number;
      reusablePlugItems?: Array<{ plugItemHash: number }>;
    }>;
  };
  investmentStats?: Array<{
    statTypeHash: number;
    value: number;
    isConditionallyActive: boolean;
  }>;
}

export interface BungieSocketCategoryDefinition {
  hash: number;
  displayProperties: { name: string };
  categoryStyle: number;
}

export interface BungiePlugSetDefinition {
  hash: number;
  reusablePlugItems: Array<{
    plugItemHash: number;
    currentlyCanRoll: boolean;
  }>;
}

export interface BungieStatDefinition {
  hash: number;
  displayProperties: { name: string; description: string };
}