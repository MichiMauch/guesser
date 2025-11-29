"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "./ConfirmModal";

interface LeaveGroupButtonProps {
  groupId: string;
  isOwner: boolean;
}

export default function LeaveGroupButton({ groupId, isOwner }: LeaveGroupButtonProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("leave");
  const tCommon = useTranslations("common");

  const handleLeave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/groups/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.deleted) {
          toast.success(t("groupDeleted"));
        } else {
          toast.success(t("leftGroup"));
        }
        router.push(`/${locale}`);
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || t("errorLeaving"));
      }
    } catch (error) {
      toast.error(t("errorLeaving"));
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <Button
        variant={isOwner ? "danger" : "secondary"}
        size="md"
        fullWidth
        onClick={() => setShowModal(true)}
        disabled={loading}
        isLoading={loading}
      >
        {isOwner ? t("confirmDeleteTitle") : t("confirmLeaveTitle")}
      </Button>

      <ConfirmModal
        isOpen={showModal}
        title={isOwner ? t("confirmDeleteTitle") : t("confirmLeaveTitle")}
        message={
          isOwner
            ? t("confirmDeleteMessage")
            : t("confirmLeaveMessage")
        }
        onConfirm={handleLeave}
        onCancel={() => setShowModal(false)}
        confirmText={isOwner ? t("deleteButton") : t("leaveButton")}
        cancelText={tCommon("cancel")}
        variant={isOwner ? "danger" : "accent"}
      />
    </>
  );
}
