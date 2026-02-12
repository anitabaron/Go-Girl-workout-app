"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-describedby="delete-dialog-description">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription id="delete-dialog-description">
            {t("descriptionStart")} &quot;{exerciseTitle}&quot;?{" "}
            {t("descriptionEnd")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            aria-label={t("confirmDeleteAria").replace(
              "{exerciseTitle}",
              exerciseTitle,
            )}
            aria-busy={isDeleting}
          >
            {isDeleting ? t("deleting") : t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
