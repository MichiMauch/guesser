"use client";

import { useEffect, useState, Fragment } from "react";
import { MapContainer, Marker, Popup, GeoJSON, Polyline, Pane, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getGameTypeConfig, DEFAULT_GAME_TYPE, isImageGameType } from "@/lib/game-types";

// Blue marker for user guesses
const guessIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Green marker for targets
const targetIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MarkerPair {
  guess: { lat: number; lng: number } | null;
  target: { lat: number; lng: number; name: string };
  distanceKm: number;
}

interface SummaryMapProps {
  gameType?: string;
  country?: string; // Legacy support
  markers: MarkerPair[];
  height?: string;
}

// Get line color based on distance
function getLineColor(distanceKm: number): string {
  if (distanceKm < 10) return "#22C55E"; // green (success)
  if (distanceKm < 30) return "#F59E0B"; // amber (accent)
  return "#EF4444"; // red (error)
}

export default function SummaryMap({ gameType, country, markers, height = "300px" }: SummaryMapProps) {
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  // Determine the effective game type (like CountryMap)
  const effectiveGameType = gameType || (country ? `country:${country}` : DEFAULT_GAME_TYPE);
  const gameTypeConfig = getGameTypeConfig(effectiveGameType);
  const isWorldMap = gameTypeConfig.bounds === null;
  const isImageMap = isImageGameType(effectiveGameType);

  useEffect(() => {
    setMounted(true);
    // Only load GeoJSON for non-image maps
    if (!isImageMap && gameTypeConfig.geoJsonFile) {
      setGeoData(null); // Reset on change
      fetch(gameTypeConfig.geoJsonFile)
        .then((res) => res.json())
        .then((data) => setGeoData(data))
        .catch((err) => console.error("Error loading GeoJSON:", err));
    }
  }, [gameTypeConfig.geoJsonFile, isImageMap]);

  if (!mounted) {
    return (
      <div
        className="bg-surface-1 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-text-muted">Karte wird geladen...</span>
      </div>
    );
  }

  // Build bounds based on map type
  let bounds: L.LatLngBounds | undefined;
  if (isImageMap && gameTypeConfig.imageBounds) {
    // For image maps, use pixel bounds
    bounds = L.latLngBounds(
      [gameTypeConfig.imageBounds[0][0], gameTypeConfig.imageBounds[0][1]],
      [gameTypeConfig.imageBounds[1][0], gameTypeConfig.imageBounds[1][1]]
    );
  } else if (!isWorldMap && gameTypeConfig.bounds) {
    // For country maps, use geo bounds
    bounds = L.latLngBounds(
      [gameTypeConfig.bounds.southWest.lat, gameTypeConfig.bounds.southWest.lng],
      [gameTypeConfig.bounds.northEast.lat, gameTypeConfig.bounds.northEast.lng]
    );
  }

  const geoStyle = {
    color: "#00D9FF",
    weight: isWorldMap ? 1 : 2,
    fillColor: "#2E3744",
    fillOpacity: isWorldMap ? 0.8 : 1,
  };

  // Map container props differ for world vs country vs image maps
  const mapContainerProps: Record<string, unknown> = {
    center: [gameTypeConfig.defaultCenter.lat, gameTypeConfig.defaultCenter.lng],
    zoom: isImageMap ? gameTypeConfig.defaultZoom : (isWorldMap ? 2 : 7),
    style: { height, width: "100%", backgroundColor: "#1A1F26" },
    className: "rounded-lg",
    minZoom: gameTypeConfig.minZoom,
  };

  // Add CRS.Simple for image maps
  if (isImageMap) {
    mapContainerProps.crs = L.CRS.Simple;
    mapContainerProps.maxZoom = 3;
  }

  // Add maxBounds for country and image maps
  if (bounds) {
    mapContainerProps.maxBounds = bounds;
    mapContainerProps.maxBoundsViscosity = 1.0;
  }

  // For image maps, always use silhouette if available
  const imageUrl = isImageMap
    ? (gameTypeConfig.silhouetteUrl || gameTypeConfig.imageUrl)
    : null;

  return (
    <MapContainer {...mapContainerProps} key={effectiveGameType}>
      {/* Image background for image maps */}
      {isImageMap && imageUrl && bounds && (
        <ImageOverlay key="image-overlay" url={imageUrl} bounds={bounds} />
      )}

      {/* GeoJSON for country/world maps */}
      {!isImageMap && geoData && <GeoJSON key="geo-json" data={geoData} style={geoStyle} />}

      {/* Polylines in custom pane to appear above GeoJSON */}
      <Pane key="polylines-pane" name="polylines" style={{ zIndex: 450 }}>
        {markers.map((pair, index) =>
          pair.guess ? (
            <Polyline
              key={`line-${index}`}
              positions={[
                [pair.guess.lat, pair.guess.lng],
                [pair.target.lat, pair.target.lng],
              ]}
              pathOptions={{
                color: getLineColor(pair.distanceKm),
                weight: 3,
                opacity: 1,
                dashArray: "5, 10",
              }}
            />
          ) : null
        )}
      </Pane>

      {/* Then render all markers */}
      {markers.map((pair, index) => (
        <Fragment key={`markers-${index}`}>
          {/* Target marker (always shown) */}
          <Marker position={[pair.target.lat, pair.target.lng]} icon={targetIcon}>
            <Popup>
              <strong>{pair.target.name}</strong>
              <br />
              Distanz: {pair.distanceKm.toFixed(1)} km
            </Popup>
          </Marker>

          {/* Guess marker (only if not timeout) */}
          {pair.guess && (
            <Marker position={[pair.guess.lat, pair.guess.lng]} icon={guessIcon}>
              <Popup>Dein Tipp für {pair.target.name}</Popup>
            </Marker>
          )}
        </Fragment>
      ))}
    </MapContainer>
  );
}
