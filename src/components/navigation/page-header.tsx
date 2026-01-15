"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PageHeaderProps {
  readonly showBack?: boolean;
  readonly backHref?: string;
}

/**
 * Komponent nagłówka strony z przyciskiem powrotu i linkiem do strony głównej.
 * Używany na podstronach aplikacji.
 */
export function PageHeader({
  showBack = true,
  backHref,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-10">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
            aria-label="Powrót do poprzedniego widoku"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Wstecz</span>
          </Button>
        )}
      </div>

      <Link
        href="/"
        className="font-bold text-lg hover:text-primary transition-colors"
        aria-label="Strona główna"
      >
        Go Girl
      </Link>
    </div>
  );
}
