"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { COUNTRIES, DEFAULT_COUNTRY, getCountryName } from "@/lib/countries";

interface StartGameButtonProps {
  groupId: string;
}

export default function StartGameButton({ groupId }: StartGameButtonProps) {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gameName, setGameName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [locationsPerRound, setLocationsPerRound] = useState(5);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);
  const t = useTranslations("game");
  const tNewGroup = useTranslations("newGroup");

  const countryOptions = Object.keys(COUNTRIES);
  const locationOptions = [3, 5, 10];
  const timeLimitOptions = [
    { value: null, label: tNewGroup("noLimit") },
    { value: 15, label: tNewGroup("seconds", { count: 15 }) },
    { value: 30, label: tNewGroup("seconds", { count: 30 }) },
    { value: 45, label: tNewGroup("seconds", { count: 45 }) },
    { value: 60, label: tNewGroup("seconds", { count: 60 }) },
    { value: 120, label: tNewGroup("minutes", { count: 2 }) },
  ];

  const handleStartGame = async () => {
    if (!gameName.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          name: gameName.trim(),
          country: selectedCountry,
          locationsPerRound,
          timeLimitSeconds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errorStarting"));
      }

      // Refresh the page to show the new game
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unknownError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      variant="surface"
      padding="lg"
      className="border-success/30 bg-success/5"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
            <svg
              className="w-7 h-7 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-h3 text-success">{t("newGame")}</h3>
            <p className="text-body-small text-text-secondary">
              {t("enterGameName")}
            </p>
          </div>
        </div>

        {/* Game Name */}
        <input
          type="text"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder={t("gameNamePlaceholder")}
          className="w-full px-4 py-2 rounded-lg bg-surface-2 border border-glass-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-success/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleStartGame();
            }
          }}
        />

        {/* Country Selection */}
        <div className="space-y-2">
          <label className="block text-body-small font-medium text-text-primary">
            {t("selectCountry")}
          </label>
          <div className="flex gap-2">
            {countryOptions.map((countryKey) => (
              <button
                key={countryKey}
                type="button"
                onClick={() => setSelectedCountry(countryKey)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-all text-sm",
                  selectedCountry === countryKey
                    ? "border-success bg-success/10 text-success"
                    : "border-glass-border bg-surface-2 text-text-secondary hover:border-success/50"
                )}
              >
                {getCountryName(countryKey, locale)}
              </button>
            ))}
          </div>
        </div>

        {/* Locations per Round */}
        <div className="space-y-2">
          <label className="block text-body-small font-medium text-text-primary">
            {tNewGroup("locationsPerRound")}
          </label>
          <div className="flex gap-2">
            {locationOptions.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setLocationsPerRound(count)}
                className={cn(
                  "flex-1 py-2 rounded-lg border-2 font-medium transition-all text-sm",
                  locationsPerRound === count
                    ? "border-success bg-success/10 text-success"
                    : "border-glass-border bg-surface-2 text-text-secondary hover:border-success/50"
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit */}
        <div className="space-y-2">
          <label className="block text-body-small font-medium text-text-primary">
            {tNewGroup("timeLimitPerLocation")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {timeLimitOptions.map((option) => (
              <button
                key={option.value ?? "none"}
                type="button"
                onClick={() => setTimeLimitSeconds(option.value)}
                className={cn(
                  "py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                  timeLimitSeconds === option.value
                    ? "border-success bg-success/10 text-success"
                    : "border-glass-border bg-surface-2 text-text-secondary hover:border-success/50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="success"
          size="md"
          fullWidth
          onClick={handleStartGame}
          isLoading={loading}
        >
          {loading ? t("starting") : t("startGame")}
        </Button>

        {error && (
          <p className="text-body-small text-error text-center">{error}</p>
        )}
      </div>
    </Card>
  );
}
