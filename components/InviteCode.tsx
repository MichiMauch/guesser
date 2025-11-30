"use client";

import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface InviteCodeProps {
  code: string;
}

export default function InviteCode({ code }: InviteCodeProps) {
  const t = useTranslations("invite");
  const params = useParams();
  const locale = params.locale as string;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${locale}/join/${code}`
    );
    toast.success(t("copied"));
  };

  return (
    <Card variant="surface" padding="lg">
      <h2 className="text-h3 text-text-primary mb-4">{t("title")}</h2>
      <div className="flex items-center gap-4">
        <code className="flex-1 bg-surface-3 px-4 py-3 rounded-xl text-lg font-mono text-primary border border-glass-border">
          {code}
        </code>
        <Button variant="primary" size="md" onClick={handleCopy}>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {t("copyLink")}
        </Button>
      </div>
      <p className="text-body-small text-text-secondary mt-3">
        {t("shareInfo")}
      </p>
    </Card>
  );
}
