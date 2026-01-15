"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function WorkoutSessionDetailsError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Wyświetl toast notification o błędzie
    toast.error("Nie udało się załadować szczegółów sesji treningowej");
  }, []);

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <Card role="alert" aria-labelledby="error-title">
          <CardHeader>
            <CardTitle id="error-title">Wystąpił błąd</CardTitle>
            <CardDescription>
              Nie udało się załadować szczegółów sesji treningowej. Spróbuj
              ponownie lub wróć do listy sesji.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={reset}
              variant="default"
              aria-label="Spróbuj ponownie załadować szczegóły sesji"
            >
              Spróbuj ponownie
            </Button>
            <Button
              onClick={() => router.push("/workout-sessions")}
              variant="outline"
              aria-label="Wróć do listy sesji"
            >
              Wróć do listy
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
