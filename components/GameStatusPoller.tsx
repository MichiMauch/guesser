"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import PlayButton from "@/components/PlayButton";
import StartGameButton from "@/components/StartGameButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface GameStatus {
  gameId: string | null;
  currentRound: number;
  userCompletedRounds: number;
  gameName: string | null;
  locationsPerRound: number;
}

interface GameStatusPollerProps {
  groupId: string;
  initialGameStatus: GameStatus | null;
  locationsCount: number;
  isAdmin: boolean;
}

export default function GameStatusPoller({
  groupId,
  initialGameStatus,
  locationsCount,
  isAdmin,
}: GameStatusPollerProps) {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(initialGameStatus);
  const t = useTranslations("group");
  const tCommon = useTranslations("common");

  const fetchGameStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/status?groupId=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGameStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch game status:", error);
    }
  }, [groupId]);

  useEffect(() => {
    // Poll every 3 seconds
    const interval = setInterval(fetchGameStatus, 3000);

    return () => clearInterval(interval);
  }, [fetchGameStatus]);

  // No active game
  if (!gameStatus?.gameId) {
    if (locationsCount < 3) {
      return (
        <Card variant="surface" padding="lg" className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center">
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-h3 text-text-muted">{t("play")}</h3>
              <p className="text-body-small text-text-muted">
                {t("minLocationsRequired", { count: 3 })}
              </p>
            </div>
          </div>
        </Card>
      );
    }

    if (isAdmin) {
      return <StartGameButton groupId={groupId} />;
    }

    return (
      <Card variant="surface" padding="lg" className="opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center">
            <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-h3 text-text-muted">{t("play")}</h3>
            <p className="text-body-small text-text-muted">{t("noActiveGame")}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Active game exists
  if (locationsCount < gameStatus.locationsPerRound) {
    return (
      <Card variant="surface" padding="lg" className="opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center">
            <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-h3 text-text-muted">{t("play")}</h3>
            <p className="text-body-small text-text-muted">
              {t("minLocationsRequired", { count: gameStatus.locationsPerRound })}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <PlayButton
        groupId={groupId}
        currentRound={gameStatus.currentRound}
        userCompletedRounds={gameStatus.userCompletedRounds}
      />
      {/* Game Info */}
      <div className="text-center">
        {gameStatus.gameName && (
          <p className="text-h3 text-primary">{gameStatus.gameName}</p>
        )}
        <p className="text-body-small text-text-secondary">
          {t("roundLocations", { round: gameStatus.currentRound, count: gameStatus.locationsPerRound })}
        </p>
        {isAdmin && (
          <Badge variant="primary" size="sm" className="mt-2">
            {tCommon("admin")}
          </Badge>
        )}
      </div>
    </>
  );
}
