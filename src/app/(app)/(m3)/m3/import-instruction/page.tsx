import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import workoutPlanImportExample from "@/ai/workout-plan-import-example.json";
import { PageHeader, Surface } from "../_components";

export default function ImportInstructionPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/m3/workout-plans" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Powrót do planów
          </Link>
        </Button>
        <PageHeader
          title="Instrukcja importu planów treningowych"
          description="Utwórz plik JSON zgodny z poniższym schematem, aby zaimportować plan treningowy do aplikacji."
        />
      </header>

      <div className="space-y-6">
        {/* Step 1: Plan Information */}
        <Surface variant="high">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-semibold">
                1
              </div>
              <h2 className="m3-headline">
                Informacje ogólne o planie treningowym
              </h2>
            </div>
            <div className="ml-11 space-y-6">
              <div className="space-y-2">
                <p className="m3-body text-muted-foreground text-sm">
                  Poniżej znajdują się pola wymagane do utworzenia planu
                  treningowego.
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3">
                  <p className="m3-label mb-2">Pola na poziomie planu:</p>
                  <ul className="list-disc list-inside space-y-1 m3-body text-muted-foreground text-xs ml-2">
                    <li>
                      <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5">
                        name
                      </code>{" "}
                      (string, max 120 znaków) - nazwa planu treningowego
                    </li>
                    <li>
                      <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5">
                        description
                      </code>{" "}
                      (string | null, opcjonalne) - opis planu
                    </li>
                    <li>
                      <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5">
                        part
                      </code>{" "}
                      (enum: &quot;Legs&quot; | &quot;Core&quot; |
                      &quot;Back&quot; | &quot;Arms&quot; | &quot;Chest&quot; |
                      null, opcjonalne) - partia mięśniowa
                    </li>
                    <li>
                      <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5">
                        exercises
                      </code>{" "}
                      (array, min 1 element) - tablica ćwiczeń
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        {/* Step 2: Exercise Structure */}
        <Surface variant="high">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-semibold">
                2
              </div>
              <h2 className="m3-headline">Struktura ćwiczeń</h2>
            </div>
            <div className="ml-11 space-y-2">
              <p className="m3-body text-muted-foreground text-sm">
                Plan treningowy składa się z trzech sekcji, które powinny być
                ułożone w następującej kolejności:
              </p>
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4 py-2 rounded-r bg-red-500/10">
                  <p className="m3-label">1. Warm-up</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Ćwiczenia rozgrzewkowe na początku treningu
                  </p>
                </div>
                <div className="border-l-4 border-pink-500 pl-4 py-2 rounded-r bg-pink-500/10">
                  <p className="m3-label">2. Main Workout</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Główne ćwiczenia treningowe
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4 py-2 rounded-r bg-purple-500/10">
                  <p className="m3-label">3. Cool-down</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Ćwiczenia rozciągające na końcu treningu
                  </p>
                </div>
              </div>
              <p className="m3-body text-muted-foreground text-xs mt-2">
                Numeracja{" "}
                <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5">
                  section_order
                </code>{" "}
                jest oddzielna dla każdej sekcji. Każda sekcja zaczyna się od 1.
              </p>
            </div>
          </div>
        </Surface>

        {/* Step 3: Exercise Options */}
        <Surface variant="high">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-semibold">
                3
              </div>
              <h2 className="m3-headline">Opcje dodawania ćwiczeń</h2>
            </div>
            <div className="ml-11 space-y-6">
              <div className="space-y-2">
                <h3 className="m3-title">Opcja A: Istniejące ćwiczenie</h3>
                <p className="m3-body text-muted-foreground text-sm">
                  Użyj, gdy ćwiczenie już istnieje w bibliotece. Możesz je
                  zidentyfikować przez ID (UUID) lub nazwę. Jeśli nie podasz
                  opcjonalnych pól, zostaną one automatycznie pobrane z bazy
                  danych.
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3">
                  <p className="m3-label">
                    Wymagane pola: exercise_id lub match_by_name, section_type,
                    section_order
                  </p>
                  <p className="m3-label">
                    Opcjonalne: planned_sets, planned_reps,
                    planned_duration_seconds, planned_rest_seconds,
                    planned_rest_after_series_seconds,
                    estimated_set_time_seconds
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="m3-title">Opcja B: Nowe ćwiczenie (snapshot)</h3>
                <p className="m3-body text-muted-foreground text-sm">
                  Użyj, gdy chcesz dodać nowe ćwiczenie, które nie istnieje w
                  bibliotece.
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3">
                  <p className="m3-label">
                    Wymagane pola: exercise_title, section_type, section_order,
                    planned_sets, (planned_reps lub planned_duration_seconds)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        {/* Step 4: Example JSON */}
        <Surface variant="high">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-semibold">
                4
              </div>
              <h2 className="m3-headline">Przykładowy plik JSON</h2>
            </div>
            <div className="ml-11">
              <p className="m3-body text-muted-foreground text-sm mb-3">
                Poniżej znajduje się kompletny przykład pliku JSON zawierający
                wszystkie opcje:
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-4 overflow-x-auto">
                <pre className="m3-body text-xs font-mono leading-relaxed">
                  {JSON.stringify(workoutPlanImportExample, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
