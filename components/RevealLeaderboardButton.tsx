"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface RevealLeaderboardButtonProps {
  groupId: string;
}

export default function RevealLeaderboardButton({
  groupId,
}: RevealLeaderboardButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const router = useRouter();
  const t = useTranslations("group");
  const tCommon = useTranslations("common");

  const handleReveal = async () => {
    setIsRevealing(true);
    try {
      const response = await fetch(`/api/leaderboard/reveal?groupId=${groupId}`, {
        method: "POST",
      });

      if (response.ok) {
        setShowModal(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error revealing leaderboard:", error);
    } finally {
      setIsRevealing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-primary hover:text-primary-light text-body-small font-medium flex items-center gap-1"
      >
        {t("showLeaderboard")}
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-surface-1 rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-h3 text-text-primary mb-3">
              {t("confirmRevealTitle")}
            </h2>
            <p className="text-body text-text-secondary mb-6">
              {t("confirmRevealMessage")}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={isRevealing}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleReveal}
                disabled={isRevealing}
              >
                {isRevealing ? tCommon("loading") : t("revealButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
