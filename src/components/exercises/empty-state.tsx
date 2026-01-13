"use client";

import Link from "next/link";
import { Dumbbell } from "lucide-react";
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
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Dumbbell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">
          Nie masz jeszcze żadnych ćwiczeń
        </CardTitle>
        <CardDescription className="mt-2">
          Dodaj pierwsze ćwiczenie, aby rozpocząć budowanie swojej biblioteki
          treningowej
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild size="lg">
          <Link href="/exercises/new">Dodaj pierwsze ćwiczenie</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
