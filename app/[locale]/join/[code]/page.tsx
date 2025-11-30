"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function JoinWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const routeParams = useParams();
  const locale = routeParams.locale as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const t = useTranslations("join");
  const tCommon = useTranslations("common");

  useEffect(() => {
    const joinGroup = async () => {
      try {
        const response = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to join group");
        }

        router.push(`/${locale}/groups/${data.groupId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
        setLoading(false);
      }
    };

    joinGroup();
  }, [code, locale, router, t]);

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-glass-border bg-surface-1/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{tCommon("back")}</span>
          </Link>
          <h1 className="text-h3 text-primary">{t("title")}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="xl" className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-h2 text-text-primary mb-2">{tCommon("error")}</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <Link href={`/${locale}`}>
            <Button variant="primary" size="lg">
              {tCommon("back")}
            </Button>
          </Link>
        </Card>
      </main>
    </div>
  );
}
