"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImportPlanButtonM3() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("File must be in JSON format");
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
          result.message ?? result.details ?? "Error during import";
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.warnings?.missing_exercises?.length > 0) {
        toast.warning(
          `Plan imported. ${result.warnings.missing_exercises.length} exercises not found in library.`,
        );
      } else {
        toast.success("Plan imported successfully");
      }

      router.push(`/workout-plans/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred during import",
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
        aria-label="Select JSON file"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          aria-label="Import workout plan from JSON file"
        >
          <Upload className="mr-2 size-4" />
          {isImporting ? "Importing..." : "Import JSON"}
        </Button>
        <Link
          href="/import-instruction"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Info className="size-4" />
          Import instructions
        </Link>
      </div>
    </>
  );
}
