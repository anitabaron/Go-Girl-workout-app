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
import { PageHeaderSection } from "@/components/layout/page-header-section";

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
      <PageHeaderSection title="Plany treningowe" />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <Card className="mx-auto max-w-md rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle
                className="h-8 w-8 text-destructive"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-2xl font-extrabold text-destructive">
              Wystąpił błąd
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-600 dark:text-zinc-400">
              Nie udało się załadować planów treningowych. Spróbuj ponownie.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={reset}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              aria-label="Spróbuj ponownie załadować plany treningowe"
            >
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
