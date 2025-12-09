import { getCountryBounds, DEFAULT_COUNTRY, type CountryBounds } from "./countries";

// Haversine formula to calculate distance between two coordinates
// Returns distance in kilometers (rounded to 1 decimal place)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

// Legacy export for backwards compatibility
export const SWITZERLAND_BOUNDS = getCountryBounds(DEFAULT_COUNTRY);

// Get bounds for any country
export function getBoundsForCountry(country: string): CountryBounds {
  return getCountryBounds(country);
}

/**
 * Calculate pixel distance between two points on an image map
 * Returns distance in kilometers
 * Scale: 92 pixels = 10 meters (1 pixel = 10/92 meters ≈ 0.1087 meters)
 */
export function calculatePixelDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  // 92 pixels = 10 meters, so 1 pixel = 10/92 meters
  const metersPerPixel = 10 / 92;
  const distanceMeters = pixelDistance * metersPerPixel;
  // Convert to km and round to 3 decimal places
  return Math.round(distanceMeters) / 1000;
}

/**
 * Format distance for display based on game type
 * For image-based games: shows meters (e.g., "23 m")
 * For geo-based games: shows kilometers (e.g., "5.2 km")
 */
export function formatDistance(distanceKm: number, gameType?: string | null): string {
  // Check if it's an image-based game type
  if (gameType && gameType.startsWith("image:")) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format total distance for leaderboards (always 3 decimal places)
 * Used for overall/total distances where precision matters
 */
export function formatTotalDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(3)} km`;
}
