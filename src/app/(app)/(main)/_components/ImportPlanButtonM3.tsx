"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

export function ImportPlanButtonM3() {
  const t = useTranslations("importPlanButton");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error(t("fileMustBeJson"));
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const response = await fetch("/api/workout-plans/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage =
          result.message ?? result.details ?? t("importError");
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.warnings?.missing_exercises?.length > 0) {
        toast.warning(
          t("planImportedWithMissing").replace(
            "{count}",
            String(result.warnings.missing_exercises.length),
          ),
        );
      } else {
        toast.success(t("planImportedSuccess"));
      }

      router.push(`/workout-plans/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("importGenericError"),
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isImporting}
        aria-label={t("selectJsonAria")}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          aria-label={t("importAria")}
        >
          <Upload className="mr-2 size-4" />
          {isImporting ? t("importing") : t("importJson")}
        </Button>
        <Link
          href="/import-instruction"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Info className="size-4" />
          {t("instructions")}
        </Link>
      </div>
    </>
  );
}
