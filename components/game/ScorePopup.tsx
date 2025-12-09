"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { formatDistance } from "@/lib/distance";

interface ScorePopupProps {
  /** Is the popup open */
  isOpen: boolean;
  /** Distance in km */
  distance: number;
  /** Score (0-100) */
  score: number;
  /** Whether it's a timeout result */
  isTimeout?: boolean;
  /** Penalty text (optional) */
  penaltyText?: string;
  /** Button text */
  buttonText: string;
  /** Click handler for button */
  onContinue: () => void;
  /** Game type for distance formatting */
  gameType?: string | null;
  /** Additional className */
  className?: string;
}

export function ScorePopup({
  isOpen,
  distance,
  score,
  isTimeout = false,
  penaltyText,
  buttonText,
  onContinue,
  gameType,
  className,
}: ScorePopupProps) {
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay score animation
      const timer = setTimeout(() => setShowScore(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowScore(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getScoreColor = () => {
    if (isTimeout) return "text-error";
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-accent";
    return "text-text-primary";
  };

  const getScoreEmoji = () => {
    if (isTimeout) return "⏱️";
    if (score >= 95) return "🎯";
    if (score >= 80) return "🔥";
    if (score >= 60) return "👍";
    if (score >= 30) return "😅";
    return "🗺️";
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center justify-center",
        "bg-background/80 backdrop-blur-sm animate-fade-in",
        className
      )}
    >
      <Card
        variant="elevated"
        padding="xl"
        className="w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up space-y-6"
      >
        {/* Score Display */}
        <div className="text-center">
          {isTimeout && (
            <p className="text-body text-error mb-2 animate-shake">
              Zeit abgelaufen!
            </p>
          )}

          <div
            className={cn(
              "inline-flex items-center gap-3",
              showScore && "animate-score-pop"
            )}
          >
            <span className="text-4xl">{getScoreEmoji()}</span>
            <span
              className={cn(
                "text-display font-bold tabular-nums",
                getScoreColor()
              )}
            >
              {score}
            </span>
            <span className="text-h2 text-text-secondary">Pkt</span>
          </div>

          {/* Distance as secondary info */}
          <p className="text-body text-text-muted mt-2 tabular-nums">
            {formatDistance(distance, gameType)} Distanz
          </p>

          {penaltyText && (
            <p className="text-body-small text-error mt-2">{penaltyText}</p>
          )}
        </div>

        {/* Score Rating */}
        <div className="flex justify-center">
          <ScoreRating score={score} isTimeout={isTimeout} />
        </div>

        {/* Continue Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onContinue}
          className="mt-4"
        >
          {buttonText}
        </Button>
      </Card>
    </div>
  );
}

// Score Rating Component
function ScoreRating({
  score,
  isTimeout,
}: {
  score: number;
  isTimeout: boolean;
}) {
  if (isTimeout) {
    return (
      <span className="text-body-small text-text-muted">
        0 Punkte (Timeout)
      </span>
    );
  }

  const getRating = () => {
    if (score >= 95) return { text: "Perfekt!", color: "text-success" };
    if (score >= 80) return { text: "Ausgezeichnet!", color: "text-success" };
    if (score >= 60) return { text: "Sehr gut!", color: "text-accent" };
    if (score >= 40) return { text: "Gut!", color: "text-accent" };
    if (score >= 20) return { text: "Nicht schlecht", color: "text-text-secondary" };
    return { text: "Weit daneben", color: "text-text-muted" };
  };

  const rating = getRating();

  return <span className={cn("text-body-small", rating.color)}>{rating.text}</span>;
}

// Round Complete Popup (shown after all locations in a round)
interface RoundCompletePopupProps {
  isOpen: boolean;
  roundNumber: number;
  totalDistance: number;
  totalScore: number;
  onToLeaderboard: () => void;
  onToGroup: () => void;
  leaderboardText?: string;
  groupText?: string;
  gameType?: string | null;
}

export function RoundCompletePopup({
  isOpen,
  roundNumber,
  totalDistance,
  totalScore,
  onToLeaderboard,
  onToGroup,
  leaderboardText = "Zur Rangliste",
  groupText = "Zurück zur Gruppe",
  gameType,
}: RoundCompletePopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card
        variant="elevated"
        padding="xl"
        className="w-full max-w-md mx-4 animate-slide-up space-y-6 text-center"
      >
        {/* Celebration */}
        <div className="space-y-2">
          <span className="text-5xl">🎉</span>
          <h2 className="text-h1 text-text-primary">
            Runde {roundNumber} beendet!
          </h2>
        </div>

        {/* Total Score */}
        <div className="py-4 rounded-xl bg-surface-2">
          <p className="text-caption text-text-muted mb-1">Gesamtpunktzahl</p>
          <p className="text-display font-bold text-accent tabular-nums">
            {totalScore} Pkt
          </p>
          <p className="text-body text-text-muted mt-1 tabular-nums">
            {formatDistance(totalDistance, gameType)} Distanz
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={onToLeaderboard}>
            {leaderboardText}
          </Button>
          <Button variant="ghost" size="md" onClick={onToGroup}>
            {groupText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
