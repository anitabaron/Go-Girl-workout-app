"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ProgramNoteDTO, ProgramSessionDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProgramNotesJournalProps = {
  programId: string;
  sessions: ProgramSessionDTO[];
  initialNotes: ProgramNoteDTO[];
};

function formatNoteTimestamp(value: string): string {
  return new Date(value).toLocaleString("pl-PL");
}

function sourceLabel(source: string): string {
  if (source === "ai_action") return "AI (akcja)";
  if (source === "ai_summary") return "AI (podsumowanie)";
  return "Użytkowniczka";
}

export function ProgramNotesJournal({
  programId,
  sessions,
  initialNotes,
}: Readonly<ProgramNotesJournalProps>) {
  const [notes, setNotes] = useState<ProgramNoteDTO[]>(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [fatigueLevel, setFatigueLevel] = useState<string>("");
  const [vitalityLevel, setVitalityLevel] = useState<string>("");

  const sessionOptions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .map((session) => ({
          id: session.id,
          label: `${session.scheduled_date} (sesja ${session.session_index})`,
        })),
    [sessions],
  );

  const handleAddNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/programs/${programId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_text: trimmed,
          program_session_id: selectedSessionId || null,
          fatigue_level: fatigueLevel ? Number(fatigueLevel) : null,
          vitality_level: vitalityLevel ? Number(vitalityLevel) : null,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Nie udało się zapisać uwagi.");
      }

      const created = (await response.json()) as ProgramNoteDTO;
      setNotes((prev) => [created, ...prev]);
      setNoteText("");
      setSelectedSessionId("");
      setFatigueLevel("");
      setVitalityLevel("");
      window.dispatchEvent(new CustomEvent("ai:training-state-refresh"));
      toast.success("Uwaga zapisana w dzienniku.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać uwagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Dziennik programu</h2>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Textarea
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Jak się czujesz, co było trudne, co chcesz zmienić..."
          rows={1}
          disabled={isSaving}
          className="min-h-10 resize-none bg-white"
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block leading-none">Sesja (opcjonalnie)</span>
            <select
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              disabled={isSaving}
              className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Cały program</option>
              {sessionOptions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block leading-none">Zmęczenie (1-10)</span>
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              value={fatigueLevel}
              onChange={(event) => setFatigueLevel(event.target.value)}
              disabled={isSaving}
              className="!bg-white"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block leading-none">Witalność (1-10)</span>
            <Input
              type="number"
              min={1}
              max={10}
              step={1}
              value={vitalityLevel}
              onChange={(event) => setVitalityLevel(event.target.value)}
              disabled={isSaving}
              className="!bg-white"
            />
          </label>
          <Button
            type="button"
            onClick={() => void handleAddNote()}
            disabled={isSaving}
            className="w-full md:w-auto"
          >
            {isSaving ? "Zapisywanie..." : "Dodaj uwagę"}
          </Button>
        </div>
      </div>

      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatNoteTimestamp(note.created_at)}</span>
                <span>{sourceLabel(note.source)}</span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{note.note_text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Zmęczenie: {note.fatigue_level ?? "—"} • Witalność: {note.vitality_level ?? "—"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Brak wpisów. Dodaj pierwszą uwagę, aby AI mogło lepiej dopasować program.
        </p>
      )}
    </section>
  );
}
