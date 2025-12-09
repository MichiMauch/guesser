"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/Avatar";
import { getScoreRating } from "@/lib/score";
import { formatDistance, formatTotalDistance } from "@/lib/distance";
import { cn } from "@/lib/utils";

// Dynamic import for SummaryMap (client-side only)
const SummaryMap = dynamic(() => import("@/components/Map/SummaryMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-surface-1 rounded-lg flex items-center justify-center h-[300px]">
      <span className="text-text-muted">Karte wird geladen...</span>
    </div>
  ),
});

interface PlayerGuess {
  id: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  score: number;
  roundNumber: number;
  locationIndex: number;
  targetLatitude: number;
  targetLongitude: number;
  locationName: string;
  gameType: string | null;
}

interface PlayerResultsModalProps {
  gameId: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
  roundNumber?: number | null;
  onClose: () => void;
}

export default function PlayerResultsModal({
  gameId,
  userId,
  userName,
  userImage,
  roundNumber,
  onClose,
}: PlayerResultsModalProps) {
  const [guesses, setGuesses] = useState<PlayerGuess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("leaderboard");
  const tModal = useTranslations("modal");

  useEffect(() => {
    async function fetchGuesses() {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/guesses?gameId=${gameId}&userId=${userId}`;
        if (roundNumber !== null && roundNumber !== undefined) {
          url += `&roundNumber=${roundNumber}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch guesses");
        }
        const data = await response.json();
        setGuesses(data.guesses);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch guesses");
      } finally {
        setLoading(false);
      }
    }

    fetchGuesses();
  }, [gameId, userId, roundNumber]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Calculate totals
  const totalScore = guesses.reduce((sum, g) => sum + g.score, 0);
  const totalDistance = guesses.reduce((sum, g) => sum + g.distanceKm, 0);

  // Get gameType from first guess (all guesses in a round have same gameType)
  const gameType = guesses.length > 0 ? guesses[0].gameType : undefined;

  // Prepare markers for SummaryMap
  const markers = guesses.map((g) => ({
    guess: g.latitude !== null && g.longitude !== null
      ? { lat: g.latitude, lng: g.longitude }
      : null,
    target: {
      lat: g.targetLatitude,
      lng: g.targetLongitude,
      name: g.locationName
    },
    distanceKm: g.distanceKm,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <Avatar src={userImage} name={userName} size="lg" />
            <div>
              <h2 className="text-h3 text-text-primary">{userName}</h2>
              <p className="text-caption text-text-muted">
                {roundNumber !== null && roundNumber !== undefined
                  ? `${t("round")} ${roundNumber}`
                  : t("total")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label={tModal("close")}
          >
            <svg
              className="w-5 h-5 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-error text-center py-8">{error}</p>
          ) : guesses.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              {t("noResultsWeek")}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-2 rounded-xl p-4 text-center">
                  <p className="text-caption text-text-muted mb-1">{t("points")}</p>
                  <p className="text-h2 font-bold text-accent">{totalScore}</p>
                </div>
                <div className="bg-surface-2 rounded-xl p-4 text-center">
                  <p className="text-caption text-text-muted mb-1">Distanz</p>
                  <p className="text-h2 font-bold text-text-primary">{formatTotalDistance(totalDistance)}</p>
                </div>
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden">
                <SummaryMap markers={markers} gameType={gameType || undefined} height="300px" />
              </div>

              {/* Location List */}
              <div className="space-y-2">
                {guesses.map((guess, index) => {
                  const rating = getScoreRating(guess.score);
                  return (
                    <div
                      key={guess.id}
                      className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
                        <span className="text-body-small font-bold text-text-secondary">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {guess.locationName}
                        </p>
                        <p className="text-caption text-text-muted">
                          {formatDistance(guess.distanceKm, guess.gameType)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold tabular-nums",
                          rating.color
                        )}>
                          {guess.score} {t("points")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
