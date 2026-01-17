"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="mx-auto min-w-[320px] max-w-md rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-950">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <History className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-extrabold text-destructive break-words">
          Nie masz jeszcze żadnych sesji treningowych
        </CardTitle>
        <CardDescription className="mt-2 text-zinc-600 dark:text-zinc-400 break-words">
          Rozpocznij swój pierwszy trening, aby zobaczyć historię sesji
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          asChild
          size="lg"
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <Link href="/workout-sessions/start">Rozpocznij trening</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
