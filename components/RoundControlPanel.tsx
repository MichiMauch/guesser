"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";
import { getCountryKeys, getCountryName } from "@/lib/countries";
import WinnerCelebration from "@/components/WinnerCelebration";

interface Winner {
  userName: string;
  userImage: string | null;
  totalDistance: number;
}

interface RoundControlPanelProps {
  gameId: string;
  groupId: string;
  currentRound: number;
  locationsPerRound?: number;
  isAdmin: boolean;
  userCompletedRounds?: number;
  gameStatus: "active" | "completed";
  gameCountry: string;
  gameName?: string;
}

export default function RoundControlPanel({
  gameId,
  groupId,
  currentRound,
  isAdmin,
  gameStatus,
  gameCountry,
  gameName,
}: RoundControlPanelProps) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(gameCountry);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winner, setWinner] = useState<Winner | null>(null);
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const countryOptions = getCountryKeys();

  const handleReleaseRound = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/games/release-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, country: selectedCountry }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errorReleasing"));
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchWinner = async () => {
    try {
      const res = await fetch(`/api/leaderboard?groupId=${groupId}&gameId=${gameId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard && data.leaderboard.length > 0) {
          const firstPlace = data.leaderboard[0];
          return {
            userName: firstPlace.userName,
            userImage: firstPlace.userImage,
            totalDistance: firstPlace.totalDistance,
          };
        }
      }
    } catch (error) {
      console.error("Failed to fetch winner:", error);
    }
    return null;
  };

  const completeGame = async () => {
    setCompleting(true);
    setError("");

    try {
      const response = await fetch("/api/games/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errorCompleting"));
      }

      // Fetch winner and show celebration
      const winnerData = await fetchWinner();
      if (winnerData) {
        setWinner(winnerData);
        setShowCelebration(true);
      } else {
        // No winner data, just show success and refresh
        toast.success(t("gameCompleted"));
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteGame = () => {
    toast(
      (toastObj) => (
        <div className="text-center">
          <p className="font-medium text-text-primary mb-2">
            {t("confirmComplete")}
          </p>
          <p className="text-sm text-text-secondary mb-4">{t("completeInfo")}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                toast.dismiss(toastObj.id);
                completeGame();
              }}
              className="bg-error text-white px-4 py-2 rounded-lg hover:bg-error/90 transition-colors"
            >
              {tCommon("ok")}
            </button>
            <button
              onClick={() => toast.dismiss(toastObj.id)}
              className="bg-surface-3 text-text-secondary px-4 py-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  // Show celebration overlay
  if (showCelebration && winner) {
    return (
      <WinnerCelebration
        winner={winner}
        groupId={groupId}
        gameName={gameName}
        onClose={() => {
          setShowCelebration(false);
          router.refresh();
        }}
      />
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Admin controls */}
      {gameStatus === "active" && (
        <div className="space-y-3">
          {error && (
            <p className="text-error text-body-small text-center">{error}</p>
          )}
          {/* Country selector */}
          <div className="flex items-center justify-center gap-2">
            <label htmlFor="country-select" className="text-body-small text-text-secondary">
              {t("selectRoundCountry")}:
            </label>
            <select
              id="country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-surface-2 border border-glass-border rounded-lg px-3 py-1.5 text-body-small text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {countryOptions.map((countryKey) => (
                <option key={countryKey} value={countryKey}>
                  {getCountryName(countryKey, locale)}
                </option>
              ))}
            </select>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="success"
              size="sm"
              onClick={handleReleaseRound}
              disabled={loading || completing}
              isLoading={loading}
            >
              {loading ? t("releasing") : t("releaseRound", { number: currentRound + 1 })}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCompleteGame}
              disabled={loading || completing}
              isLoading={completing}
            >
              {completing ? t("completing") : t("completeGame")}
            </Button>
          </div>
        </div>
      )}

      {/* Game completed message */}
      {gameStatus === "completed" && (
        <p className="text-center text-success font-medium text-body-small">
          {t("gameCompleted")}
        </p>
      )}
    </div>
  );
}
