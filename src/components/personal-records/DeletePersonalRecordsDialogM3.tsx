"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";
import { ConfirmActionDialogM3 } from "@/components/shared/ConfirmActionDialogM3";

type DeletePersonalRecordsDialogM3Props = {
  readonly exerciseId: string;
  readonly exerciseTitle: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDeleted?: () => void;
};

export function DeletePersonalRecordsDialogM3({
  exerciseId,
  exerciseTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeletePersonalRecordsDialogM3Props) {
  const t = useTranslations("deletePersonalRecordsDialog");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/personal-records/${exerciseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t("toast.notFound"));
        } else if (response.status === 401 || response.status === 403) {
          toast.error(t("toast.unauthorized"));
          router.push("/login");
        } else if (response.status >= 500) {
          toast.error(t("toast.server"));
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.message || t("toast.failed"));
        }
        return;
      }

      toast.success(t("toast.success"));
      onDeleted?.();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error(t("toast.offline"));
      } else {
        toast.error(t("toast.generic"));
      }
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
          {t("descriptionStart")} &quot;{exerciseTitle}&quot;?{" "}
          {t("descriptionEnd")}
        </>
      }
      cancelLabel={t("cancel")}
      confirmLabel={t("delete")}
      confirmingLabel={t("deleting")}
      onConfirm={handleDelete}
      isConfirming={isDeleting}
      confirmVariant="destructive"
      confirmAriaLabel={t("confirmDeleteAria").replace(
        "{exerciseTitle}",
        exerciseTitle,
      )}
      descriptionId="delete-dialog-description"
    />
  );
}
