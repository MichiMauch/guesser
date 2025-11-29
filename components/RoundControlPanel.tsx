"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface RoundControlPanelProps {
  gameId: string;
  groupId: string;
  currentRound: number;
  locationsPerRound?: number;
  isAdmin: boolean;
  userCompletedRounds?: number;
  gameStatus: "active" | "completed";
}

export default function RoundControlPanel({
  gameId,
  groupId,
  currentRound,
  isAdmin,
  gameStatus,
}: RoundControlPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations("game");
  const tCommon = useTranslations("common");

  const handleReleaseRound = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/games/release-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
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

      toast.success(t("gameCompleted"));
      router.refresh();
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

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Admin controls - compact horizontal layout */}
      {gameStatus === "active" && (
        <div className="flex gap-2 justify-center">
          {error && (
            <p className="text-error text-body-small mb-2 w-full text-center">{error}</p>
          )}
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
