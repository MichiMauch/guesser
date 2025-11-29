"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SwitzerlandMap from "@/components/Map";
import { calculateDistance } from "@/lib/distance";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export default function TrainPage() {
  const routeParams = useParams();
  const locale = routeParams.locale as string;
  const t = useTranslations("train");
  const tCommon = useTranslations("common");
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/train/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
        if (data.length > 0) {
          pickRandomLocation(data);
        }
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const pickRandomLocation = (locs: Location[]) => {
    const randomIndex = Math.floor(Math.random() * locs.length);
    setCurrentLocation(locs[randomIndex]);
    setMarkerPosition(null);
    setShowResult(false);
    setDistance(null);
  };

  const handleGuess = () => {
    if (!markerPosition || !currentLocation) return;

    const dist = calculateDistance(
      markerPosition.lat,
      markerPosition.lng,
      currentLocation.latitude,
      currentLocation.longitude
    );

    setDistance(dist);
    setTotalDistance((prev) => prev + dist);
    setRoundCount((prev) => prev + 1);
    setShowResult(true);
  };

  const handleNextRound = () => {
    pickRandomLocation(locations);
  };

  const handleReset = () => {
    setTotalDistance(0);
    setRoundCount(0);
    pickRandomLocation(locations);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // No locations
  if (locations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-xl mx-auto px-4 py-8">
          <Card variant="elevated" padding="xl" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-3 flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-text-secondary">{t("noLocations")}</p>
          </Card>
        </main>
      </div>
    );
  }

  // Determine button config
  const getButtonConfig = () => {
    if (showResult) {
      return {
        text: t("nextLocation"),
        variant: "accent" as const,
        onClick: handleNextRound,
        disabled: false,
      };
    }
    return {
      text: markerPosition ? t("submit") : t("placeMarker"),
      variant: "primary" as const,
      onClick: handleGuess,
      disabled: !markerPosition,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="h-[calc(100dvh-52px)] max-w-[1440px] mx-auto relative">
      {/* Fullscreen Map */}
      <SwitzerlandMap
        onMarkerPlace={showResult ? undefined : setMarkerPosition}
        markerPosition={markerPosition}
        targetPosition={
          showResult && currentLocation
            ? {
                lat: currentLocation.latitude,
                lng: currentLocation.longitude,
              }
            : null
        }
        showTarget={showResult}
        interactive={!showResult}
        height="100%"
      />

      {/* Combined Badge - centered like PlayPage */}
      {currentLocation && (
        <div className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-10",
          "bg-background/85 backdrop-blur-md rounded-xl",
          "flex items-center gap-3 px-4 py-2",
          "border-2",
          // Border color based on state
          !showResult && "border-accent",
          showResult && distance !== null && distance < 20 && "border-success",
          showResult && distance !== null && distance >= 20 && distance < 100 && "border-accent",
          showResult && distance !== null && distance >= 100 && "border-glass-border"
        )}>
          {/* Location name */}
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              {t("whereIs")}
            </span>
            <span className="text-lg font-bold text-text-primary text-glow-primary">
              {currentLocation.name}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-glass-border" />

          {/* Stats or Result */}
          <span className={cn(
            "font-mono font-bold text-lg tabular-nums min-w-[60px] text-center",
            // Result colors
            !showResult && "text-accent",
            showResult && distance !== null && distance < 20 && "text-success",
            showResult && distance !== null && distance >= 20 && distance < 100 && "text-accent",
            showResult && distance !== null && distance >= 100 && "text-text-primary"
          )}>
            {showResult && distance !== null ? (
              <>{distance.toFixed(1)} km</>
            ) : roundCount > 0 ? (
              <>{roundCount}</>
            ) : (
              "—"
            )}
          </span>

          {/* Divider */}
          <div className="w-px h-6 bg-glass-border" />

          {/* Action Button */}
          <Button
            variant={buttonConfig.variant}
            size="sm"
            onClick={buttonConfig.onClick}
            disabled={buttonConfig.disabled}
            className="whitespace-nowrap"
          >
            {buttonConfig.text}
          </Button>
        </div>
      )}

      {/* Stats Badge - bottom left */}
      {roundCount > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/85 backdrop-blur-md rounded-xl px-4 py-2 border border-glass-border">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-text-muted">{roundCount}</span>
              <span className="text-text-secondary"> | </span>
              <span className="text-accent font-medium tabular-nums">{totalDistance.toFixed(1)} km</span>
            </div>
            <button
              onClick={handleReset}
              className="text-text-muted hover:text-error transition-colors"
              title={t("resetStats")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
