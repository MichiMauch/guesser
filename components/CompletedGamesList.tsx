"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { MedalBadge } from "@/components/ui/Badge";
import { formatTotalDistance } from "@/lib/distance";
import GameHistoryModal from "./GameHistoryModal";

interface CompletedGame {
  id: string;
  name: string | null;
  status: string;
  currentRound: number;
  createdAt: Date;
  winner?: {
    userName: string | null;
    userImage: string | null;
    totalDistance: number;
  };
}

interface CompletedGamesListProps {
  games: CompletedGame[];
  groupId: string;
}

export default function CompletedGamesList({
  games,
  groupId,
}: CompletedGamesListProps) {
  const [selectedGame, setSelectedGame] = useState<CompletedGame | null>(null);
  const t = useTranslations("group");
  const tLeaderboard = useTranslations("leaderboard");

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <Card variant="surface" padding="lg">
        <h2 className="text-h3 text-text-primary mb-4">
          {t("completedGames")}
        </h2>
        <div className="space-y-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors text-left"
            >
              {/* Trophy icon */}
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🏆</span>
              </div>

              {/* Game info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {game.name || tLeaderboard("game")}
                </p>
                <p className="text-caption text-text-muted">
                  {formatDate(game.createdAt)}
                </p>
              </div>

              {/* Winner info */}
              {game.winner && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Avatar
                    src={game.winner.userImage}
                    name={game.winner.userName}
                    size="sm"
                  />
                  <div className="text-right hidden sm:block">
                    <p className="text-body-small font-medium text-text-primary truncate max-w-[100px]">
                      {game.winner.userName}
                    </p>
                    <p className="text-caption text-accent font-bold">
                      {formatTotalDistance(game.winner.totalDistance)}
                    </p>
                  </div>
                </div>
              )}

              {/* Arrow */}
              <svg
                className="w-5 h-5 text-text-muted flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      </Card>

      {/* Modal */}
      {selectedGame && (
        <GameHistoryModal
          game={selectedGame}
          groupId={groupId}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
}
