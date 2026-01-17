"use client";

import Link from "next/link";
import { Calendar, Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Client Component wyświetlający pusty stan, gdy użytkowniczka nie ma jeszcze żadnych planów treningowych.
 * Zawiera komunikat zachęcający i przycisk CTA do utworzenia pierwszego planu.
 */
export function EmptyState() {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="break-words">Brak planów treningowych</CardTitle>
        <CardDescription className="break-words">
          Utwórz swój pierwszy plan treningowy, aby rozpocząć treningi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="default" size="lg" aria-label="Utwórz plan treningowy">
          <Link href="/workout-plans/new">
            <Plus className="mr-2 h-4 w-4" />
            Utwórz plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
