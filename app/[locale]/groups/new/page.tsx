"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function NewGroupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("newGroup");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create group");
      }

      const data = await response.json();
      router.push(`/${locale}/groups/${data.id}`);
    } catch {
      setError(t("errorCreating"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-h2 text-text-primary">{t("title")}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t("groupName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groupNamePlaceholder")}
              required
            />

            {error && (
              <p className="text-error text-body-small text-center">{error}</p>
            )}

            <Button
              type="submit"
              variant="success"
              size="lg"
              fullWidth
              disabled={!name}
              isLoading={loading}
            >
              {loading ? t("creating") : t("createGroup")}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
