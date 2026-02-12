"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SessionSummaryDTO } from "@/types";
import { useTranslations } from "@/i18n/client";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

type DeleteWorkoutSessionDialogM3Props = {
  readonly session: SessionSummaryDTO;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

export function DeleteWorkoutSessionDialogM3({
  session,
  open,
  onOpenChange,
}: DeleteWorkoutSessionDialogM3Props) {
  const t = useTranslations("deleteWorkoutSessionDialog");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const planName = session.plan_name_at_time ?? t("planDeleted");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        if (response.status === 404) toast.error(t("toast.notFound"));
        else if (response.status === 401 || response.status === 403) {
          toast.error(t("toast.unauthorized"));
          router.push("/login");
        } else toast.error(t("toast.failed"));
        return;
      }
      toast.success(t("toast.success"));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t("toast.generic"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmActionDialogM3
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={
        <>
          {t("descriptionStart")} &quot;{planName}&quot;? {t("descriptionEnd")}
        </>
      }
      cancelLabel={t("cancel")}
      confirmLabel={t("delete")}
      confirmingLabel={t("deleting")}
      onConfirm={handleDelete}
      isConfirming={isDeleting}
      confirmVariant="destructive"
      descriptionId="delete-session-description"
      showCloseButton
      closeAriaLabel={t("closeAria")}
    />
  );
}
