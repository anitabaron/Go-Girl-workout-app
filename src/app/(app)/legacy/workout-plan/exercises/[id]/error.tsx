"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ExerciseDetailsError({
  error: _error, // eslint-disable-line @typescript-eslint/no-unused-vars
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Wyświetl toast notification o błędzie tylko raz (nawet w React Strict Mode)
    if (!hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("Nie udało się załadować szczegółów ćwiczenia");
    }
  }, []);

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <Card role="alert" aria-labelledby="error-title">
          <CardHeader>
            <CardTitle id="error-title">Wystąpił błąd</CardTitle>
            <CardDescription>
              Nie udało się załadować szczegółów ćwiczenia. Spróbuj ponownie lub
              wróć do listy ćwiczeń.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={reset}
              variant="default"
              aria-label="Spróbuj ponownie załadować szczegóły ćwiczenia"
            >
              Spróbuj ponownie
            </Button>
            <Button
              onClick={() => router.push("/exercises")}
              variant="outline"
              aria-label="Wróć do listy ćwiczeń"
            >
              Wróć do listy
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
