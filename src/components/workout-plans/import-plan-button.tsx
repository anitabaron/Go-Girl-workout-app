"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Info, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export function ImportPlanButton() {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Plik musi być w formacie JSON");
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
        // API zwraca { message, code, details? } dla błędów
        const errorMessage =
          result.message ?? result.details ?? "Błąd podczas importu";
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Pokaż ostrzeżenia jeśli są
      if (result.warnings?.missing_exercises?.length > 0) {
        toast.warning(
          `Plan zaimportowany. ${result.warnings.missing_exercises.length} ćwiczeń nie zostało znalezionych w bazie.`,
        );
      } else {
        toast.success("Plan został zaimportowany pomyślnie");
      }

      // Przekieruj do szczegółów planu
      router.push(`/workout-plans/${result.id}`);
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas importu",
      );
    } finally {
      setIsImporting(false);
      // Reset input
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
        aria-label="Wybierz plik JSON do importu"
      />
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          variant="outline"
          aria-label="Importuj plan treningowy z pliku JSON"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isImporting ? "Importowanie..." : "Importuj plan json"}
        </Button>
        <Link
          href="/import-instruction"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2"
        >
          <Info className=" h-4 w-4" />
          Instrukcja importu
        </Link>
      </div>
    </>
  );
}
