"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

type DeleteWorkoutPlanDialogM3Props = {
  readonly planId: string;
  readonly planName: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDelete?: (planId: string) => Promise<void>;
};

export function DeleteWorkoutPlanDialogM3({
  planId,
  planName,
  open,
  onOpenChange,
  onDelete,
}: DeleteWorkoutPlanDialogM3Props) {
  const t = useTranslations("deleteWorkoutPlanDialog");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(planId);
      } else {
        const response = await fetch(`/api/workout-plans/${planId}`, {
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
      descriptionId="delete-plan-description"
      showCloseButton
      closeAriaLabel={t("closeAria")}
    />
  );
}
