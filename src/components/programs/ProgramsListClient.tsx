"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import type { TrainingProgramDTO } from "@/types";

type ProgramsListClientProps = {
  items: TrainingProgramDTO[];
};

export function ProgramsListClient({ items }: Readonly<ProgramsListClientProps>) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDelete = async (programId: string) => {
    setDeletingId(programId);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Nie udało się usunąć programu.");
      }

      toast.success("Program został usunięty.");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się usunąć programu.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendProgramContextToAI = (program: TrainingProgramDTO) => {
    window.dispatchEvent(
      new CustomEvent("ai:add-context", {
        detail: {
          attachment: {
            type: "program",
            value: {
              program_id: program.id,
              program_name: program.name,
            },
            label: program.name,
          },
          suggestedMessage: `Chcę zmodyfikować program „${program.name}”. Zaproponuj konkretne zmiany pod moje aktualne możliwości.`,
        },
      }),
    );
    toast.success("Kontekst programu dodany do Trenera AI.");
  };

  const handleActivate = async (programId: string) => {
    setActivatingId(programId);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Nie udało się aktywować programu.");
      }

      toast.success("Program został aktywowany.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nie udało się aktywować programu.",
      );
    } finally {
      setActivatingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Brak programów. Utwórz pierwszy program z poziomu Trenera AI.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((program) => (
          <div
            key={program.id}
            className="group relative rounded-xl border border-border bg-card p-4"
          >
            <div className="absolute right-1 top-4 z-10 flex items-center gap-1 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                onClick={() => handleSendProgramContextToAI(program)}
                aria-label={`Modyfikuj w Trenerze AI: ${program.name}`}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md border border-transparent text-destructive hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive"
                onClick={() => setPendingDelete({ id: program.id, name: program.name })}
                aria-label={`Usuń program: ${program.name}`}
                disabled={deletingId === program.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start justify-between gap-2 pr-16">
              <div>
                <p className="text-base font-semibold">{program.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {program.goal_text ?? "Brak opisu celu"}
                </p>
              </div>
              <Badge variant="secondary">{program.status}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{program.duration_months} mies.</span>
              <span>•</span>
              <span>{program.sessions_per_week} treningi/tydz.</span>
              <span>•</span>
              <span>{program.sessions.length} sesji</span>
            </div>

            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={`/programs/${program.id}`}>Szczegóły programu</Link>
                </Button>
                {program.status !== "active" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={activatingId === program.id}
                    onClick={() => void handleActivate(program.id)}
                  >
                    {activatingId === program.id ? "Aktywowanie..." : "Aktywuj"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń program treningowy?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Program „${pendingDelete.name}” oraz jego harmonogram zostaną usunięte.`
                : "Program oraz jego harmonogram zostaną usunięte."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pendingDelete || Boolean(deletingId)}
              onClick={() => {
                if (!pendingDelete) return;
                void handleDelete(pendingDelete.id);
              }}
            >
              {deletingId ? "Usuwanie..." : "Usuń program"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
