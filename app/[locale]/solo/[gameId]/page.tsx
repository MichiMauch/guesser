"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CountryMap, SummaryMap } from "@/components/Map";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { getEffectiveGameType } from "@/lib/game-types";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface GameRound {
  id: string;
  roundNumber: number;
  locationIndex: number;
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  country: string;
  gameType?: string | null;
}

interface Guess {
  gameRoundId: string;
  distanceKm: number;
  score: number;
  roundNumber: number;
  latitude?: number | null;
  longitude?: number | null;
}

interface Game {
  id: string;
  status: string;
  currentRound: number;
  country: string;
  gameType?: string | null;
  timeLimitSeconds?: number | null;
}

export default function SoloPlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const router = useRouter();
  const routeParams = useParams();
  const locale = routeParams.locale as string;
  const t = useTranslations("play");
  const tCommon = useTranslations("common");
  const tSolo = useTranslations("solo");

  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [userGuesses, setUserGuesses] = useState<Guess[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    distanceKm: number;
    score: number;
    targetLat: number;
    targetLng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);
  const [gameStats, setGameStats] = useState<{
    totalDistance: number;
    totalScore: number;
    roundsPlayed: number;
  } | null>(null);

  const fetchGameData = useCallback(async () => {
    try {
      const [gamesRes, guessesRes] = await Promise.all([
        fetch(`/api/solo/games?locale=${locale}`),
        fetch(`/api/guesses?gameId=${gameId}`),
      ]);

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();

        // Find the specific game
        if (gamesData.activeGame && gamesData.activeGame.id === gameId) {
          setGame(gamesData.activeGame);
          setRounds(gamesData.rounds);
        } else {
          // Game not found or not active
          router.push(`/${locale}/solo`);
          return;
        }
      }

      if (guessesRes.ok) {
        const guessesResponse = await guessesRes.json();
        const guessesData = guessesResponse.guesses || [];
        setUserGuesses(guessesData);

        // Calculate starting index
        const playedGameRoundIds = new Set(guessesData.map((g: Guess) => g.gameRoundId));
        const nextUnplayed = rounds.findIndex((r) => !playedGameRoundIds.has(r.id));

        if (nextUnplayed < 0 && rounds.length > 0) {
          // All rounds played - show completion
          setShowGameComplete(true);
        } else {
          setCurrentRoundIndex(nextUnplayed >= 0 ? nextUnplayed : 0);
        }
      }
    } catch (err) {
      console.error("Error fetching game:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId, locale, router, rounds.length]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  // Recalculate currentRoundIndex when rounds or guesses change
  useEffect(() => {
    if (rounds.length > 0 && userGuesses.length > 0) {
      const playedGameRoundIds = new Set(userGuesses.map((g) => g.gameRoundId));
      const nextUnplayed = rounds.findIndex((r) => !playedGameRoundIds.has(r.id));

      if (nextUnplayed < 0) {
        setShowGameComplete(true);
      }
    }
  }, [rounds, userGuesses]);

  const currentRound = rounds[currentRoundIndex];
  const isLocationPlayed = userGuesses.some((g) => g.gameRoundId === currentRound?.id);
  const allRoundsPlayed = rounds.length > 0 && rounds.every((r) => userGuesses.some((g) => g.gameRoundId === r.id));
  const totalDistance = userGuesses.reduce((sum, g) => sum + g.distanceKm, 0);
  const totalScore = userGuesses.reduce((sum, g) => sum + g.score, 0);

  const handleGuess = async () => {
    if (!markerPosition || !currentRound || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/guesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameRoundId: currentRound.id,
          latitude: markerPosition.lat,
          longitude: markerPosition.lng,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastResult({
          distanceKm: data.distanceKm,
          score: data.score,
          targetLat: data.targetLatitude,
          targetLng: data.targetLongitude,
        });
        setUserGuesses([
          ...userGuesses,
          {
            gameRoundId: currentRound.id,
            distanceKm: data.distanceKm,
            score: data.score,
            roundNumber: currentRound.roundNumber,
            latitude: markerPosition.lat,
            longitude: markerPosition.lng,
          },
        ]);
        setShowResult(true);
      }
    } catch (err) {
      console.error("Error submitting guess:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextRound = () => {
    const nextRoundIndex = currentRoundIndex + 1;
    if (nextRoundIndex >= rounds.length) {
      // All rounds complete - complete the game
      handleCompleteGame();
      return;
    }
    setMarkerPosition(null);
    setShowResult(false);
    setLastResult(null);
    setCurrentRoundIndex(nextRoundIndex);
  };

  const handleCompleteGame = async () => {
    try {
      const response = await fetch("/api/solo/games/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        const data = await response.json();
        setGameStats(data.stats);
        setShowGameComplete(true);
      }
    } catch (err) {
      console.error("Error completing game:", err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (showGameComplete || allRoundsPlayed) {
    const summaryMarkers = userGuesses.map((guess) => {
      const location = rounds.find((r) => r.id === guess.gameRoundId);
      return {
        guess: guess.latitude != null && guess.longitude != null
          ? { lat: guess.latitude, lng: guess.longitude }
          : null,
        target: {
          lat: location?.latitude ?? 0,
          lng: location?.longitude ?? 0,
          name: location?.locationName ?? "",
        },
        distanceKm: guess.distanceKm,
      };
    });

    return (
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Map */}
        <Card variant="elevated" padding="md">
          <SummaryMap
            markers={summaryMarkers}
            height="300px"
            gameType={game?.gameType ?? undefined}
            country={game?.country ?? DEFAULT_COUNTRY}
          />
        </Card>

        {/* Results Card */}
        <Card variant="elevated" padding="lg" className="text-center space-y-4">
          <div className="space-y-1">
            <span className="text-3xl">🎉</span>
            <h2 className="text-h2 text-text-primary">{tSolo("gameComplete")}</h2>
          </div>

          <div className="py-3 rounded-xl bg-surface-2">
            <p className="text-xs text-text-muted mb-1">{tSolo("totalScore")}</p>
            <p className="text-3xl font-bold text-accent tabular-nums">
              {gameStats?.totalScore ?? totalScore} Pkt
            </p>
            <p className="text-body text-text-muted mt-1 tabular-nums">
              {(gameStats?.totalDistance ?? totalDistance).toFixed(1)} km {tSolo("totalDistance")}
            </p>
          </div>

          <div className="space-y-1">
            {userGuesses.map((guess) => {
              const location = rounds.find((r) => r.id === guess.gameRoundId);
              return (
                <div
                  key={guess.gameRoundId}
                  className="flex justify-between items-center p-2 rounded-lg bg-surface-2"
                >
                  <span className="text-text-secondary">{location?.locationName}</span>
                  <div className="text-right">
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        guess.score >= 80 ? "text-success" : guess.score >= 50 ? "text-accent" : "text-error"
                      )}
                    >
                      {guess.score} Pkt
                    </span>
                    <span className="text-caption text-text-muted ml-2 tabular-nums">
                      ({guess.distanceKm.toFixed(1)} km)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Link href={`/${locale}/solo`}>
            <Button variant="primary" size="md" fullWidth>
              {tSolo("backToDashboard")}
            </Button>
          </Link>
        </Card>
      </main>
    );
  }

  // No game or no current round
  if (!game || !currentRound) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-xl mx-auto px-4 py-8">
          <Card variant="elevated" padding="xl" className="text-center">
            <p className="text-text-secondary mb-4">{tSolo("noActiveGame")}</p>
            <Link href={`/${locale}/solo`}>
              <Button variant="primary">{tCommon("back")}</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // Determine button config
  const getButtonConfig = () => {
    if (showResult) {
      const isLastRound = currentRoundIndex >= rounds.length - 1;
      const resultVariant = lastResult && lastResult.distanceKm < 20 ? "success" : "primary";
      return {
        text: isLastRound ? tSolo("finishGame") : t("next"),
        variant: resultVariant as "success" | "primary",
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
      <CountryMap
        gameType={currentRound?.gameType || (game ? getEffectiveGameType(game) : undefined)}
        country={currentRound?.country ?? game?.country ?? DEFAULT_COUNTRY}
        onMarkerPlace={showResult ? undefined : setMarkerPosition}
        markerPosition={markerPosition}
        targetPosition={
          showResult && lastResult
            ? { lat: lastResult.targetLat, lng: lastResult.targetLng }
            : null
        }
        showTarget={showResult}
        interactive={!showResult && !isLocationPlayed}
        height="100%"
      />

      {/* Combined Badge - centered */}
      {currentRound && (
        <div className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 z-[500]",
          "bg-background/85 backdrop-blur-md rounded-xl",
          "flex items-center gap-3 px-4 py-2",
          "border-2",
          !showResult && "border-primary",
          showResult && lastResult && lastResult.distanceKm < 20 && "border-success",
          showResult && lastResult && lastResult.distanceKm >= 20 && lastResult.distanceKm < 100 && "border-accent",
          showResult && lastResult && lastResult.distanceKm >= 100 && "border-glass-border"
        )}>
          {/* Location */}
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              {t("whereIs")}
            </span>
            <span className="text-lg font-bold text-text-primary text-glow-primary">
              {currentRound.locationName}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-glass-border" />

          {/* Progress / Result */}
          <span className={cn(
            "font-mono font-bold text-lg tabular-nums min-w-[50px] text-center",
            !showResult && "text-primary",
            showResult && lastResult && lastResult.distanceKm < 20 && "text-success",
            showResult && lastResult && lastResult.distanceKm >= 20 && lastResult.distanceKm < 100 && "text-accent",
            showResult && lastResult && lastResult.distanceKm >= 100 && "text-text-primary"
          )}>
            {showResult && lastResult ? (
              <>{lastResult.distanceKm.toFixed(1)} km</>
            ) : (
              <>{currentRoundIndex + 1}/{rounds.length}</>
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
            isLoading={submitting}
            className="whitespace-nowrap"
          >
            {submitting ? "..." : buttonConfig.text}
          </Button>
        </div>
      )}

      {/* Back Link */}
      <Link
        href={`/${locale}/solo`}
        className="absolute top-4 left-4 z-[500] bg-background/85 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors border border-glass-border"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm">{tCommon("back")}</span>
      </Link>
    </div>
  );
}
