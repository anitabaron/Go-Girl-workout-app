"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResumeSessionButtonProps = {
  readonly sessionId: string;
};

export function ResumeSessionButton({ sessionId }: ResumeSessionButtonProps) {
  return (
    <Link href={`/workout-sessions/${sessionId}/active`}>
      <Button
        size="lg"
        className="w-full sm:w-auto"
        aria-label="Wznów trening"
      >
        <Play className="mr-2 h-4 w-4" />
        Wznów trening
      </Button>
    </Link>
  );
}
