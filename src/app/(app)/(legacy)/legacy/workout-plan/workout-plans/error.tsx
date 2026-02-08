"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function WorkoutPlansError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logowanie błędu do konsoli w development
    console.error("WorkoutPlansError:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:pt-24 sm:px-10">
        <Card role="alert" aria-labelledby="error-title">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle
                className="h-8 w-8 text-destructive"
                aria-hidden="true"
              />
            </div>
            <CardTitle
              id="error-title"
              className="text-2xl font-extrabold text-destructive"
            >
              Wystąpił błąd
            </CardTitle>
            <CardDescription className="mt-2">
              Nie udało się załadować planów treningowych. Spróbuj ponownie.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={reset}
              variant="default"
              aria-label="Spróbuj ponownie załadować plany treningowe"
            >
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
