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

type ExitSessionButtonM3Props = {
  onExit: () => void;
};

export function ExitSessionButtonM3({ onExit }: ExitSessionButtonM3Props) {
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
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-full bg-[var(--m3-surface-container-high)] shadow-sm hover:bg-[var(--m3-surface-container-highest)] md:top-20"
        aria-label="Exit workout session"
      >
        <X className="size-5" />
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit workout session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave the workout session? Your progress
              will be saved, but the session will remain active and you can
              resume it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
