"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "accent" | "primary";
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Löschen",
  cancelText = "Abbrechen",
  variant = "danger",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <Card
        variant="elevated"
        padding="lg"
        className="max-w-md mx-4 animate-slide-up"
      >
        <h3 className="text-h3 text-text-primary">{title}</h3>
        <p className="text-text-secondary mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="ghost" size="md" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant} size="md" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
