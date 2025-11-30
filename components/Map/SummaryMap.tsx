"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, GeoJSON, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SWITZERLAND_BOUNDS } from "@/lib/distance";

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
  markers: MarkerPair[];
  height?: string;
}

// Get line color based on distance
function getLineColor(distanceKm: number): string {
  if (distanceKm < 10) return "#22C55E"; // green (success)
  if (distanceKm < 30) return "#F59E0B"; // amber (accent)
  return "#EF4444"; // red (error)
}

export default function SummaryMap({ markers, height = "300px" }: SummaryMapProps) {
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/switzerland.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

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
    [SWITZERLAND_BOUNDS.southWest.lat, SWITZERLAND_BOUNDS.southWest.lng],
    [SWITZERLAND_BOUNDS.northEast.lat, SWITZERLAND_BOUNDS.northEast.lng]
  );

  const geoStyle = {
    color: "#00D9FF",
    weight: 2,
    fillColor: "#2E3744",
    fillOpacity: 1,
  };

  return (
    <MapContainer
      center={[SWITZERLAND_BOUNDS.center.lat, SWITZERLAND_BOUNDS.center.lng]}
      zoom={8}
      style={{ height, width: "100%", backgroundColor: "#1A1F26" }}
      className="rounded-lg"
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
      minZoom={7}
    >
      {geoData && <GeoJSON data={geoData} style={geoStyle} />}

      {markers.map((pair, index) => (
        <div key={index}>
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
            <>
              <Marker position={[pair.guess.lat, pair.guess.lng]} icon={guessIcon}>
                <Popup>Dein Tipp für {pair.target.name}</Popup>
              </Marker>

              {/* Line between guess and target */}
              <Polyline
                positions={[
                  [pair.guess.lat, pair.guess.lng],
                  [pair.target.lat, pair.target.lng],
                ]}
                pathOptions={{
                  color: getLineColor(pair.distanceKm),
                  weight: 2,
                  opacity: 0.8,
                  dashArray: "5, 10",
                }}
              />
            </>
          )}
        </div>
      ))}
    </MapContainer>
  );
}
