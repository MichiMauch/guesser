"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, MedalBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatDistance, formatTotalDistance } from "@/lib/distance";
import PlayerResultsModal from "./PlayerResultsModal";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  totalDistance: number;
  totalScore: number;
  roundsPlayed: number;
  completed?: boolean;
  gamesPlayed?: number;
  isMember?: boolean;
}

interface LeaderboardProps {
  groupId: string;
  gameId?: string;
  blurred?: boolean;
}

export default function Leaderboard({ groupId, gameId, blurred = false }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<"weekly" | "alltime">("weekly");
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [maxRoundNumber, setMaxRoundNumber] = useState(0);
  const [selectedRound, setSelectedRound] = useState<number | null>(null); // null = total
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  const [currentGameType, setCurrentGameType] = useState<string | null>(null);
  const { data: session } = useSession();
  const t = useTranslations("leaderboard");

  const fetchLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = `/api/leaderboard?groupId=${groupId}&type=${type}`;
      if (gameId) {
        url += `&gameId=${gameId}`;
      }
      if (selectedRound !== null && type === "weekly") {
        url += `&roundNumber=${selectedRound}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        if (data.revealed !== undefined) {
          setRevealed(data.revealed);
        }
        if (data.game?.maxRoundNumber !== undefined) {
          setMaxRoundNumber(data.game.maxRoundNumber);
        }
        if (data.game?.id) {
          setCurrentGameId(data.game.id);
        }
        if (data.game?.gameType) {
          setCurrentGameType(data.game.gameType);
        }
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId, gameId, type, selectedRound]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Poll for revealed state when blurred
  useEffect(() => {
    if (!blurred || revealed) return;

    const interval = setInterval(() => {
      fetchLeaderboard(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [blurred, revealed, fetchLeaderboard]);

  const showBlur = blurred && !revealed;

  // Can click on a player if revealed OR if it's the current user
  const canClickPlayer = (userId: string) => {
    if (type !== "weekly") return false; // Only in weekly mode
    if (!currentGameId) return false; // Need a game ID
    return revealed || userId === session?.user?.id;
  };

  const handlePlayerClick = (entry: LeaderboardEntry) => {
    if (!canClickPlayer(entry.userId)) return;
    setSelectedPlayer(entry);
  };

  return (
    <Card variant="surface" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h3 text-text-primary">{t("title")}</h2>
        <div className="flex gap-1 p-1 rounded-lg bg-surface-2 border border-glass-border">
          <button
            onClick={() => setType("weekly")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              type === "weekly"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            {t("thisWeek")}
          </button>
          <button
            onClick={() => {
              setType("alltime");
              setSelectedRound(null); // Reset round selection when switching to alltime
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              type === "alltime"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            {t("allTime")}
          </button>
        </div>
      </div>

      {/* Round Tabs - only show when in weekly mode and rounds exist */}
      {type === "weekly" && maxRoundNumber > 0 && (
        <div className="mb-4 overflow-x-auto -mx-2 px-2">
          <div className="flex gap-1 min-w-max">
            <button
              onClick={() => setSelectedRound(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                selectedRound === null
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              {t("total")}
            </button>
            {Array.from({ length: maxRoundNumber }, (_, i) => i + 1).map((round) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  selectedRound === round
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                )}
              >
                {t("round")} {round}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn(showBlur && "blur-md select-none pointer-events-none transition-all")}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            {type === "weekly" ? t("noResultsWeek") : t("noGamesPlayed")}
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const isClickable = canClickPlayer(entry.userId);
              return (
              <div
                key={entry.userId}
                onClick={() => handlePlayerClick(entry)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  entry.rank === 1 && "bg-accent/10 border border-accent/30",
                  entry.rank === 2 && "bg-surface-2 border border-glass-border",
                  entry.rank === 3 && "bg-warning/10 border border-warning/30",
                  entry.rank > 3 && "hover:bg-surface-2",
                  isClickable && "cursor-pointer hover:ring-2 hover:ring-primary/30"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Rank */}
                {entry.rank <= 3 ? (
                  <MedalBadge position={entry.rank as 1 | 2 | 3} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center">
                    <span className="text-body font-bold text-text-secondary">
                      {entry.rank}
                    </span>
                  </div>
                )}

                {/* Avatar */}
                <Avatar
                  src={entry.userImage}
                  name={entry.userName}
                  size="md"
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {entry.userName}
                    {entry.isMember === false && (
                      <span className="ml-2 text-caption text-text-muted italic">
                        {t("notMember")}
                      </span>
                    )}
                  </p>
                  {type === "weekly" && selectedRound === null && !entry.completed && entry.isMember !== false && (
                    <p className="text-caption text-text-muted">
                      {entry.roundsPlayed} {t("days", { count: entry.roundsPlayed })}
                    </p>
                  )}
                </div>

                {/* Score & Distance */}
                <div className="text-right">
                  <p className={cn(
                    "font-bold tabular-nums",
                    entry.rank === 1 ? "text-accent" : "text-text-primary"
                  )}>
                    {entry.totalScore} {t("points")}
                  </p>
                  <p className="text-caption text-text-muted tabular-nums">
                    {type === "weekly" && selectedRound !== null
                      ? formatDistance(entry.totalDistance, currentGameType)
                      : formatTotalDistance(entry.totalDistance)}
                  </p>
                  {type === "alltime" && entry.gamesPlayed && (
                    <p className="text-caption text-text-muted">
                      {entry.gamesPlayed} {entry.gamesPlayed === 1 ? t("game") : t("games")}
                    </p>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {showBlur && (
        <div className="text-center mt-4 py-4 border-t border-glass-border">
          <div className="inline-flex items-center gap-2 text-text-secondary">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-body-small">{t("revealedByAdmin")}</span>
          </div>
        </div>
      )}

      {/* Player Results Modal */}
      {selectedPlayer && currentGameId && (
        <PlayerResultsModal
          gameId={currentGameId}
          userId={selectedPlayer.userId}
          userName={selectedPlayer.userName}
          userImage={selectedPlayer.userImage}
          roundNumber={selectedRound}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </Card>
  );
}
