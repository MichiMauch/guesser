"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import confetti from "canvas-confetti";
import Image from "next/image";

interface Winner {
  userName: string;
  userImage: string | null;
  totalDistance: number;
}

interface WinnerCelebrationProps {
  winner: Winner;
  groupId: string;
  gameName?: string;
  onClose?: () => void;
}

export default function WinnerCelebration({
  winner,
  groupId,
  gameName,
  onClose,
}: WinnerCelebrationProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("celebration");
  const hasTriggeredConfetti = useRef(false);

  const handleClose = () => {
    if (onClose) onClose();
    router.push(`/${locale}/groups/${groupId}`);
  };

  useEffect(() => {
    // Fire confetti only once
    if (hasTriggeredConfetti.current) return;
    hasTriggeredConfetti.current = true;

    // Fire multiple bursts of confetti
    const duration = 4000;
    const animationEnd = Date.now() + duration;

    const colors = ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

    const fireConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: Math.random(), y: Math.random() * 0.5 },
        colors: colors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
      });
    };

    // Initial burst
    fireConfetti();

    // Additional bursts
    const interval = setInterval(() => {
      if (Date.now() < animationEnd) {
        fireConfetti();
      } else {
        clearInterval(interval);
      }
    }, 500);

    // Auto-close after 5 seconds
    const timeout = setTimeout(() => {
      if (onClose) onClose();
      router.push(`/${locale}/groups/${groupId}`);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [groupId, locale, router, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={handleClose}
    >
      {/* Winner Card */}
      <div className="winner-entrance text-center px-8 py-12 max-w-lg">
        {/* Trophy Emoji */}
        <div className="text-8xl mb-6 animate-bounce">🏆</div>

        {/* Winner Title */}
        <h1 className="text-2xl font-bold text-yellow-400 mb-4 uppercase tracking-wider">
          {t("winner")}
        </h1>

        {/* Game Name */}
        {gameName && (
          <p className="text-text-secondary text-lg mb-6">{gameName}</p>
        )}

        {/* Winner Info */}
        <div className="winner-card bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl p-8 shadow-2xl">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            {winner.userImage ? (
              <Image
                src={winner.userImage}
                alt={winner.userName}
                width={100}
                height={100}
                className="rounded-full border-4 border-yellow-400 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center text-4xl font-bold text-white border-4 border-yellow-400">
                {winner.userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Winner Name */}
          <h2 className="text-4xl font-bold text-white mb-2">
            {winner.userName}
          </h2>

          {/* Distance */}
          <p className="text-2xl text-yellow-400 font-semibold">
            {winner.totalDistance.toFixed(1)} km
          </p>
        </div>

        {/* Countdown hint */}
        <p className="text-text-muted mt-8 text-sm animate-pulse">
          {t("redirecting")}
        </p>
      </div>
    </div>
  );
}
