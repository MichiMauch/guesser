"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, useMapEvents, GeoJSON, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getBoundsForCountry } from "@/lib/distance";
import { getCountryConfig, DEFAULT_COUNTRY } from "@/lib/countries";

// Fix for default markers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const targetIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MarkerPosition {
  lat: number;
  lng: number;
}

interface HintCircle {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface CountryMapProps {
  country?: string;
  onMarkerPlace?: (position: MarkerPosition) => void;
  markerPosition?: MarkerPosition | null;
  targetPosition?: MarkerPosition | null;
  showTarget?: boolean;
  interactive?: boolean;
  height?: string;
  hintCircle?: HintCircle | null;
}

function MapClickHandler({ onMarkerPlace }: { onMarkerPlace?: (position: MarkerPosition) => void }) {
  useMapEvents({
    click(e) {
      if (onMarkerPlace) {
        onMarkerPlace({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function CountryMap({
  country = DEFAULT_COUNTRY,
  onMarkerPlace,
  markerPosition,
  targetPosition,
  showTarget = false,
  interactive = true,
  height = "400px",
  hintCircle = null,
}: CountryMapProps) {
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  const countryConfig = getCountryConfig(country);
  const countryBounds = getBoundsForCountry(country);

  useEffect(() => {
    setMounted(true);
    // Load GeoJSON data for the selected country
    fetch(countryConfig.geoJsonFile)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, [countryConfig.geoJsonFile]);

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

  const bounds = L.latLngBounds(
    [countryBounds.southWest.lat, countryBounds.southWest.lng],
    [countryBounds.northEast.lat, countryBounds.northEast.lng]
  );

  // Style for country GeoJSON - Dark Gaming Theme
  const geoStyle = {
    color: "#00D9FF",      // Cyan border with glow effect
    weight: 2,
    fillColor: "#2E3744",  // Dark surface fill
    fillOpacity: 1,
  };

  return (
    <MapContainer
      center={[countryBounds.center.lat, countryBounds.center.lng]}
      zoom={8}
      style={{ height, width: "100%", backgroundColor: "#1A1F26" }}
      className="rounded-lg"
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
      minZoom={7}
    >
      {/* Country border - no TileLayer for clean look */}
      {geoData && (
        <GeoJSON data={geoData} style={geoStyle} />
      )}

      {/* Hint circle for players with hint enabled */}
      {hintCircle && (
        <Circle
          center={[hintCircle.lat, hintCircle.lng]}
          radius={hintCircle.radiusKm * 1000}
          pathOptions={{
            color: "#00D9FF",
            fillColor: "#00D9FF",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "8, 12",
            interactive: false,
          }}
        />
      )}

      {interactive && <MapClickHandler onMarkerPlace={onMarkerPlace} />}

      {markerPosition && (
        <Marker position={[markerPosition.lat, markerPosition.lng]} icon={defaultIcon}>
          <Popup>Dein Tipp</Popup>
        </Marker>
      )}

      {showTarget && targetPosition && (
        <Marker position={[targetPosition.lat, targetPosition.lng]} icon={targetIcon}>
          <Popup>Korrekter Ort</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
