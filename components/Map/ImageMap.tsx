"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, useMapEvents, ImageOverlay, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getGameTypeConfig } from "@/lib/game-types";

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

interface MarkerPosition {
  lat: number; // Y coordinate (pixel)
  lng: number; // X coordinate (pixel)
}

interface ImageMapProps {
  gameType: string;
  onMarkerPlace?: (position: MarkerPosition) => void;
  markerPosition?: MarkerPosition | null;
  targetPosition?: MarkerPosition | null;
  showTarget?: boolean;
  interactive?: boolean;
  height?: string;
}

function MapClickHandler({ onMarkerPlace }: { onMarkerPlace?: (position: MarkerPosition) => void }) {
  useMapEvents({
    click(e) {
      if (onMarkerPlace) {
        // For CRS.Simple, latlng is in pixel coordinates (y, x)
        onMarkerPlace({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function ImageMap({
  gameType,
  onMarkerPlace,
  markerPosition,
  targetPosition,
  showTarget = false,
  interactive = true,
  height = "400px",
}: ImageMapProps) {
  const [mounted, setMounted] = useState(false);
  const gameTypeConfig = getGameTypeConfig(gameType);

  useEffect(() => {
    setMounted(true);
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

  // Get image bounds from config
  const imageBounds = gameTypeConfig.imageBounds || [[0, 0], [559, 1014]];
  const bounds = L.latLngBounds(
    [imageBounds[0][0], imageBounds[0][1]], // [minY, minX]
    [imageBounds[1][0], imageBounds[1][1]]  // [maxY, maxX]
  );

  // Always use silhouette if available
  const imageUrl = gameTypeConfig.silhouetteUrl || gameTypeConfig.imageUrl;

  // Calculate appropriate zoom level to fit the image
  // CRS.Simple uses 1:1 pixel mapping at zoom 0

  return (
    <MapContainer
      key={gameType}
      center={[gameTypeConfig.defaultCenter.lat, gameTypeConfig.defaultCenter.lng]}
      zoom={gameTypeConfig.defaultZoom}
      minZoom={gameTypeConfig.minZoom}
      maxZoom={3}
      crs={L.CRS.Simple}
      maxBounds={bounds}
      maxBoundsViscosity={1.0}
      style={{ height, width: "100%", backgroundColor: "#1A1F26" }}
      className="rounded-lg"
    >
      {/* Image as background */}
      {imageUrl && (
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
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

      {/* Connection line between guess and target */}
      {showTarget && markerPosition && targetPosition && (
        <Polyline
          positions={[
            [markerPosition.lat, markerPosition.lng],
            [targetPosition.lat, targetPosition.lng],
          ]}
          pathOptions={{
            color: "#F59E0B",
            weight: 2,
            opacity: 0.8,
            dashArray: "5, 10",
          }}
        />
      )}
    </MapContainer>
  );
}
