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
}

export interface BungieDisplayProperties {
  name: string;
  description: string;
  icon: string;
  hasIcon: boolean;
}

export interface BungieInventoryItem {
  hash: number;
  displayProperties: BungieDisplayProperties;
  itemType: number;
  itemSubType: number;
  itemTypeDisplayName: string;
  defaultDamageTypeHash: number;
  flavorText?: string;
  screenshot?: string;
  iconWatermark?: string;
  seasonHash?: number;
  tierTypeName?: string;
  equippingBlock?: { uniqueLabel?: string; ammoType?: number };
  inventory?: { recipeItemHash?: number };
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