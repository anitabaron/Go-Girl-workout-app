"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

type ExitSessionButtonProps = {
  onExit: () => void;
};

/**
 * Przycisk wyjścia z sesji w lewym górnym rogu.
 * Wyświetla dialog potwierdzenia przed wyjściem.
 */
export function ExitSessionButton({ onExit }: ExitSessionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = () => {
    setIsDialogOpen(false);
    onExit();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsDialogOpen(true)}
        className="fixed left-4 md:top-20 top-4 z-50 h-10 w-10 rounded-full bg-white/90 shadow-sm hover:bg-white dark:bg-zinc-950/90 dark:hover:bg-zinc-950"
        aria-label="Wyjdź z sesji treningowej"
      >
        <X className="size-5" />
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyjdź z sesji treningowej?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz opuścić sesję treningową? Twoje postępy
              zostaną zapisane, ale sesja pozostanie aktywna i będziesz mógł
              ją wznowić później.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Wyjdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
