export interface CountryBounds {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
  center: { lat: number; lng: number };
}

export interface CountryConfig {
  code: string;
  name: { de: string; en: string; sl: string };
  bounds: CountryBounds;
  geoJsonFile: string;
  timeoutPenalty: number; // km - penalty when timeout occurs
}

export const COUNTRIES: Record<string, CountryConfig> = {
  switzerland: {
    code: "CH",
    name: { de: "Schweiz", en: "Switzerland", sl: "Švica" },
    bounds: {
      southWest: { lat: 45.8, lng: 5.9 },
      northEast: { lat: 47.8, lng: 10.5 },
      center: { lat: 46.8, lng: 8.2 },
    },
    geoJsonFile: "/switzerland.geojson",
    timeoutPenalty: 400, // km
  },
  slovenia: {
    code: "SI",
    name: { de: "Slowenien", en: "Slovenia", sl: "Slovenija" },
    bounds: {
      southWest: { lat: 45.4, lng: 13.4 },
      northEast: { lat: 46.9, lng: 16.6 },
      center: { lat: 46.1, lng: 15.0 },
    },
    geoJsonFile: "/slovenia.geojson",
    timeoutPenalty: 250, // km (Slovenia is smaller)
  },
};

export const DEFAULT_COUNTRY = "switzerland";

export function getCountryConfig(countryKey: string): CountryConfig {
  return COUNTRIES[countryKey] || COUNTRIES[DEFAULT_COUNTRY];
}

export function getCountryBounds(countryKey: string): CountryBounds {
  return getCountryConfig(countryKey).bounds;
}

export function getCountryName(countryKey: string, locale: string): string {
  const config = getCountryConfig(countryKey);
  return config.name[locale as keyof typeof config.name] || config.name.en;
}

export function getTimeoutPenalty(countryKey: string): number {
  return getCountryConfig(countryKey).timeoutPenalty;
}

export function getCountryKeys(): string[] {
  return Object.keys(COUNTRIES);
}

export function getLocationCountryName(countryKey: string): string {
  return getCountryConfig(countryKey).name.en;
}
