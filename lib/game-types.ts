import { CountryBounds, COUNTRIES } from "./countries";

export interface GameTypeConfig {
  id: string;
  type: "country" | "world" | "image";
  name: { de: string; en: string; sl: string };
  icon: string;
  geoJsonFile: string;
  bounds: CountryBounds | null; // null = world map (no bounds)
  timeoutPenalty: number; // km or pixels for image maps
  scoreScaleFactor: number; // km at which you get ~37% of max points (e^-1), or pixels for image maps
  defaultZoom: number;
  minZoom: number;
  defaultCenter: { lat: number; lng: number };
  // Image-specific fields
  imageUrl?: string; // URL to the image file
  silhouetteUrl?: string; // URL to silhouette version (shown during gameplay)
  imageBounds?: [[number, number], [number, number]]; // [[minY, minX], [maxY, maxX]] in pixels
}

export const GAME_TYPES: Record<string, GameTypeConfig> = {
  // Country-based game types (using existing country configs)
  "country:switzerland": {
    id: "country:switzerland",
    type: "country",
    name: { de: "Schweiz", en: "Switzerland", sl: "Švica" },
    icon: "🇨🇭",
    geoJsonFile: "/switzerland.geojson",
    bounds: COUNTRIES.switzerland.bounds,
    timeoutPenalty: 400,
    scoreScaleFactor: 100, // ~350km country
    defaultZoom: 8,
    minZoom: 7,
    defaultCenter: COUNTRIES.switzerland.bounds.center,
  },
  "country:slovenia": {
    id: "country:slovenia",
    type: "country",
    name: { de: "Slowenien", en: "Slovenia", sl: "Slovenija" },
    icon: "🇸🇮",
    geoJsonFile: "/slovenia.geojson",
    bounds: COUNTRIES.slovenia.bounds,
    timeoutPenalty: 250,
    scoreScaleFactor: 60, // ~200km country
    defaultZoom: 8,
    minZoom: 7,
    defaultCenter: COUNTRIES.slovenia.bounds.center,
  },
  // World-based game types
  "world:highest-mountains": {
    id: "world:highest-mountains",
    type: "world",
    name: { de: "Höchste Berge", en: "Highest Mountains", sl: "Najvišje gore" },
    icon: "🏔️",
    geoJsonFile: "/world.geojson",
    bounds: null,
    timeoutPenalty: 5000,
    scoreScaleFactor: 3000, // World map
    defaultZoom: 2,
    minZoom: 1,
    defaultCenter: { lat: 20, lng: 0 },
  },
  "world:capitals": {
    id: "world:capitals",
    type: "world",
    name: { de: "Hauptstädte", en: "World Capitals", sl: "Prestolnice" },
    icon: "🏛️",
    geoJsonFile: "/world.geojson",
    bounds: null,
    timeoutPenalty: 5000,
    scoreScaleFactor: 3000, // World map
    defaultZoom: 2,
    minZoom: 1,
    defaultCenter: { lat: 20, lng: 0 },
  },
  "world:famous-places": {
    id: "world:famous-places",
    type: "world",
    name: { de: "Berühmte Orte", en: "Famous Places", sl: "Znamenite lokacije" },
    icon: "🗺️",
    geoJsonFile: "/world.geojson",
    bounds: null,
    timeoutPenalty: 5000,
    scoreScaleFactor: 3000, // World map
    defaultZoom: 2,
    minZoom: 1,
    defaultCenter: { lat: 20, lng: 0 },
  },
  "world:unesco": {
    id: "world:unesco",
    type: "world",
    name: { de: "UNESCO Welterbe", en: "UNESCO World Heritage", sl: "UNESCO svetovna dediščina" },
    icon: "🏛️",
    geoJsonFile: "/world.geojson",
    bounds: null,
    timeoutPenalty: 5000,
    scoreScaleFactor: 3000, // World map
    defaultZoom: 2,
    minZoom: 1,
    defaultCenter: { lat: 20, lng: 0 },
  },
  "world:airports": {
    id: "world:airports",
    type: "world",
    name: { de: "Internationale Flughäfen", en: "International Airports", sl: "Mednarodna letališča" },
    icon: "✈️",
    geoJsonFile: "/world.geojson",
    bounds: null,
    timeoutPenalty: 5000,
    scoreScaleFactor: 3000, // World map
    defaultZoom: 2,
    minZoom: 1,
    defaultCenter: { lat: 20, lng: 0 },
  },
  // Image-based game types
  // Scale: 92 pixels = 10 meters, image is 2330x2229 pixels ≈ 253m x 242m
  "image:garten": {
    id: "image:garten",
    type: "image",
    name: { de: "Garten", en: "Garden", sl: "Vrt" },
    icon: "🏡",
    geoJsonFile: "", // Not used for image maps
    bounds: null,
    timeoutPenalty: 0.350, // ~350m diagonal = max distance on image (in km)
    scoreScaleFactor: 0.035, // ~35m gives good scoring curve for ~253m wide image (in km)
    defaultZoom: -1, // Start slightly zoomed out for larger image
    minZoom: -3,
    defaultCenter: { lat: 1114.5, lng: 1165 }, // Center of image (2229/2, 2330/2)
    imageUrl: "/images/maps/garten.jpg",
    silhouetteUrl: "/images/maps/garten-silhouette.jpg",
    imageBounds: [[0, 0], [2229, 2330]], // [[minY, minX], [maxY, maxX]] - image is 2330x2229
  },
};

export const DEFAULT_GAME_TYPE = "country:switzerland";

/**
 * Get game type config by ID
 */
export function getGameTypeConfig(gameTypeId: string): GameTypeConfig {
  return GAME_TYPES[gameTypeId] || GAME_TYPES[DEFAULT_GAME_TYPE];
}

/**
 * Get game type from legacy country field
 * Converts old "switzerland" to new "country:switzerland" format
 */
export function getGameTypeFromCountry(country: string): string {
  return `country:${country}`;
}

/**
 * Get the effective game type ID from a game
 * Uses gameType if set, otherwise falls back to country field
 */
export function getEffectiveGameType(game: { gameType?: string | null; country: string }): string {
  return game.gameType || getGameTypeFromCountry(game.country);
}

/**
 * Get all available game type IDs
 */
export function getGameTypeIds(): string[] {
  return Object.keys(GAME_TYPES);
}

/**
 * Get game types grouped by type
 */
export function getGameTypesByType(): { country: GameTypeConfig[]; world: GameTypeConfig[] } {
  const country: GameTypeConfig[] = [];
  const world: GameTypeConfig[] = [];

  for (const config of Object.values(GAME_TYPES)) {
    if (config.type === "country") {
      country.push(config);
    } else {
      world.push(config);
    }
  }

  return { country, world };
}

/**
 * Get game type name in the specified locale
 */
export function getGameTypeName(gameTypeId: string, locale: string): string {
  const config = getGameTypeConfig(gameTypeId);
  return config.name[locale as keyof typeof config.name] || config.name.en;
}

/**
 * Check if a game type is a world type
 */
export function isWorldGameType(gameTypeId: string | null | undefined): boolean {
  if (!gameTypeId) return false;
  return gameTypeId.startsWith("world:");
}

/**
 * Get the category from a world game type ID
 * e.g., "world:capitals" -> "capitals"
 */
export function getWorldCategory(gameTypeId: string): string | null {
  if (!isWorldGameType(gameTypeId)) return null;
  return gameTypeId.split(":")[1];
}

/**
 * Check if a game type is an image-based type
 */
export function isImageGameType(gameTypeId: string | null | undefined): boolean {
  if (!gameTypeId) return false;
  return gameTypeId.startsWith("image:");
}

/**
 * Get the image map ID from an image game type
 * e.g., "image:garten" -> "garten"
 */
export function getImageMapId(gameTypeId: string): string | null {
  if (!isImageGameType(gameTypeId)) return null;
  return gameTypeId.split(":")[1];
}

/**
 * Get game types grouped by type including image types
 */
export function getGameTypesByTypeExtended(): { country: GameTypeConfig[]; world: GameTypeConfig[]; image: GameTypeConfig[] } {
  const country: GameTypeConfig[] = [];
  const world: GameTypeConfig[] = [];
  const image: GameTypeConfig[] = [];

  for (const config of Object.values(GAME_TYPES)) {
    if (config.type === "country") {
      country.push(config);
    } else if (config.type === "world") {
      world.push(config);
    } else if (config.type === "image") {
      image.push(config);
    }
  }

  return { country, world, image };
}
