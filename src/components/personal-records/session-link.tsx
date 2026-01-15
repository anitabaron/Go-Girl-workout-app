"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

type SessionLinkProps = {
  sessionId: string | null;
};

/**
 * Komponent wyświetlający link do sesji treningowej,
 * w której rekord został osiągnięty.
 * Link prowadzi do widoku szczegółów sesji.
 */
export function SessionLink({ sessionId }: SessionLinkProps) {
  // Jeśli sessionId nie jest dostępny, nie renderuj linku
  if (!sessionId) {
    return null;
  }

  const handleClick = () => {
    toast.info("Przechodzisz do sesji treningowej");
  };

  return (
    <Link
      href={`/workout-sessions/${sessionId}`}
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 rounded"
      aria-label="Zobacz szczegóły sesji treningowej, w której osiągnięto ten rekord"
    >
      Zobacz sesję
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
