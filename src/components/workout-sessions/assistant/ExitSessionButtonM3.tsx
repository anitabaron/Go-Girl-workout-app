"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useTranslations } from "@/i18n/client";

type ExitSessionButtonM3Props = {
  onExit: () => void;
};

export function ExitSessionButtonM3({ onExit }: ExitSessionButtonM3Props) {
  const t = useTranslations("assistantExitDialog");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = () => {
    setIsDialogOpen(false);
    onExit();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsDialogOpen(true)}
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-full border border-[var(--m3-outline-variant)] bg-[color-mix(in_srgb,var(--m3-surface-container-high)_50%,transparent)] backdrop-blur-sm shadow-sm hover:bg-[color-mix(in_srgb,var(--m3-surface-container-highest)_62%,transparent)] md:left-[104px] lg:left-[112px]"
        aria-label={t("triggerAria")}
      >
        <X className="size-5" />
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
