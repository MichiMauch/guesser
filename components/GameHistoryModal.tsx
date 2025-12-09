"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { MedalBadge } from "@/components/ui/Badge";
import { formatTotalDistance } from "@/lib/distance";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  totalDistance: number;
  roundsPlayed: number;
  completed?: boolean;
  isMember?: boolean;
}

interface Game {
  id: string;
  name: string | null;
  status: string;
  currentRound: number;
  createdAt: Date;
}

interface GameHistoryModalProps {
  game: Game;
  groupId: string;
  onClose: () => void;
}

export default function GameHistoryModal({
  game,
  groupId,
  onClose,
}: GameHistoryModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [maxRoundNumber, setMaxRoundNumber] = useState(0);
  const [selectedRound, setSelectedRound] = useState<number | null>(null); // null = total
  const [loading, setLoading] = useState(true);
  const t = useTranslations("leaderboard");
  const tModal = useTranslations("modal");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/leaderboard?groupId=${groupId}&type=weekly&gameId=${game.id}`;
      if (selectedRound !== null) {
        url += `&roundNumber=${selectedRound}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        if (data.game?.maxRoundNumber) {
          setMaxRoundNumber(data.game.maxRoundNumber);
        }
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId, game.id, selectedRound]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Generate round tabs
  const roundTabs = [];
  for (let i = 1; i <= maxRoundNumber; i++) {
    roundTabs.push(i);
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div>
            <h2 className="text-h3 text-text-primary">
              {game.name || t("game")}
            </h2>
            <p className="text-caption text-text-muted">
              {formatDate(game.createdAt)}
            </p>
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

        {/* Round Tabs */}
        {maxRoundNumber > 0 && (
          <div className="p-3 border-b border-glass-border overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {/* Total Tab */}
              <button
                onClick={() => setSelectedRound(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  selectedRound === null
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                )}
              >
                {t("total")}
              </button>
              {/* Round Tabs */}
              {roundTabs.map((round) => (
                <button
                  key={round}
                  onClick={() => setSelectedRound(round)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    selectedRound === round
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  {t("round")} {round}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-text-muted text-center py-8">
              {t("noResultsWeek")}
            </p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all",
                    entry.rank === 1 && "bg-accent/10 border border-accent/30",
                    entry.rank === 2 && "bg-surface-2 border border-glass-border",
                    entry.rank === 3 && "bg-warning/10 border border-warning/30",
                    entry.rank > 3 && "hover:bg-surface-2"
                  )}
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
                  </div>

                  {/* Distance */}
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-bold tabular-nums",
                        entry.rank === 1 ? "text-accent" : "text-text-primary"
                      )}
                    >
                      {formatTotalDistance(entry.totalDistance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
