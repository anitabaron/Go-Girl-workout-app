import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import workoutPlanImportExample from "@/lib/json/workout-plan-import-example.json";
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
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3 text-xs">
                  <div>
                    <p className="m3-label text-xs mb-2">Wymagane:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          name
                        </code>{" "}
                        (string, max 120 znaków) – nazwa planu
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercises
                        </code>{" "}
                        (array, min 1 element) – tablica ćwiczeń
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="m3-label text-xs mb-2">Opcjonalne:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          description
                        </code>{" "}
                        (string | null) – opis planu
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          part
                        </code>{" "}
                        (&quot;Legs&quot; | &quot;Core&quot; | &quot;Back&quot;
                        | &quot;Arms&quot; | &quot;Chest&quot; | null) – partia
                        mięśniowa
                      </li>
                    </ul>
                  </div>
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
              <p className="m3-body text-muted-foreground text-xs">
                Plan treningowy składa się z trzech sekcji, które powinny być
                ułożone w następującej kolejności:
              </p>
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4 py-2 rounded-r bg-red-500/10">
                  <p className="m3-label text-xs">1. Warm-up</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Ćwiczenia rozgrzewkowe na początku treningu
                  </p>
                </div>
                <div className="border-l-4 border-pink-500 pl-4 py-2 rounded-r bg-pink-500/10">
                  <p className="m3-label text-xs">2. Main Workout</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Główne ćwiczenia treningowe
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4 py-2 rounded-r bg-purple-500/10">
                  <p className="m3-label text-xs">3. Cool-down</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    Ćwiczenia rozciągające na końcu treningu
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                  section_order
                </code>{" "}
                numeracja jest oddzielna dla każdej sekcji, jeśli nie podano
                zostanie ustalona według kolejności występowania ćwiczeń w pliku
                JSON.
                <br />
                <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                  section_type
                </code>{" "}
                – jeśli nie podano, używana jest sekcja &quot;Main
                Workout&quot;.
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
              {/* Option A: Existing Exercise */}
              <div className="space-y-2">
                <h3 className="m3-title">Opcja A: Istniejące ćwiczenie</h3>
                <p className="m3-body text-muted-foreground text-xs">
                  Gdy ćwiczenie jest w bibliotece, wskaż je przez{" "}
                  <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                    exercise_id
                  </code>{" "}
                  lub{" "}
                  <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                    match_by_name
                  </code>
                  . Niewypełnione pola zostaną uzupełnione z bazy lub
                  wartościami domyślnymi.
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3 text-xs">
                  <div>
                    <p className="m3-label text-xs mb-2">Wymagane:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <strong>Jedno z:</strong>{" "}
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercise_id
                        </code>{" "}
                        (UUID - identyfikator ćwiczenia) <strong>lub</strong>{" "}
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          match_by_name
                        </code>{" "}
                        (string, max 120 znaków)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="m3-label text-xs mb-2">Opcjonalne:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          section_type
                        </code>{" "}
                        (enum: &quot;Warm-up&quot; | &quot;Main Workout&quot; |
                        &quot;Cool-down&quot;) - typ sekcji
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          section_order
                        </code>{" "}
                        (number &gt; 0, unikalna w ramach sekcji) - kolejność w
                        sekcji
                      </li>

                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_sets
                        </code>{" "}
                        (number &gt; 0 | null) - liczba serii (domyślnie z bazy:
                        series)
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_reps
                        </code>{" "}
                        (number &gt; 0 | null) - liczba powtórzeń (domyślnie z
                        bazy: reps)
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_duration_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - czas trwania w sekundach
                        (domyślnie z bazy: duration_seconds)
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_rest_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku między seriami
                        w sekundach (domyślnie z bazy: rest_in_between_seconds)
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_rest_after_series_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku po zakończeniu
                        wszystkich serii (domyślnie z bazy:
                        rest_after_series_seconds)
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          estimated_set_time_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - szacowany czas wykonania serii
                        w sekundach (domyślnie z bazy:
                        estimated_set_time_seconds)
                      </li>
                    </ul>
                    <p className="text-muted-foreground italic mt-2">
                      Jeśli nie podasz żadnego z opcjonalnych pól, wszystkie
                      wartości zostaną automatycznie pobrane z bazy danych lub
                      wartości domyślne na podstawie ćwiczenia zidentyfikowanego
                      przez exercise_id lub match_by_name.
                    </p>{" "}
                  </div>
                </div>
              </div>

              {/* Option B: New Exercise (Snapshot) */}
              <div className="space-y-2">
                <h3 className="m3-title">Opcja B: Nowe ćwiczenie (snapshot)</h3>
                <p className="m3-body text-muted-foreground text-xs">
                  Użyj, gdy chcesz dodać nowe ćwiczenie, które nie istnieje w
                  bibliotece.
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3 text-xs">
                  <div>
                    <p className="m3-label text-xs mb-2">Wymagane:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercise_title
                        </code>{" "}
                        (string, max 120 znaków) - nazwa ćwiczenia
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="m3-label text-xs mb-2">Opcjonalne:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-[inherit]">
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          section_type
                        </code>{" "}
                        – &quot;Main Workout&quot;
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          section_order
                        </code>{" "}
                        – kolejność w pliku JSON
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_sets
                        </code>{" "}
                        – 3
                      </li>
                      <li>
                        {" "}
                        <strong>Jedno z:</strong>{" "}
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_reps
                        </code>{" "}
                        (number &gt; 0 | null) - liczba powtórzeń{" "}
                        <strong>lub</strong>{" "}
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_duration_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - czas trwania w sekundach
                      </li>

                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_rest_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku między seriami
                        w sekundach
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          planned_rest_after_series_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku po zakończeniu
                        wszystkich serii
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          estimated_set_time_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - szacowany czas wykonania serii
                        w sekundach
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercise_part
                        </code>{" "}
                        (enum: &quot;Legs&quot; | &quot;Core&quot; |
                        &quot;Back&quot; | &quot;Arms&quot; | &quot;Chest&quot;)
                        - partia mięśniowa
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercise_type
                        </code>{" "}
                        (enum: &quot;Warm-up&quot; | &quot;Main Workout&quot; |
                        &quot;Cool-down&quot;) - typ ćwiczenia
                      </li>
                      <li>
                        <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
                          exercise_details
                        </code>{" "}
                        (string, max 1000 znaków) - dodatkowe szczegóły
                      </li>
                    </ul>
                  </div>
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
              <p className="m3-body text-muted-foreground text-xs mb-3">
                Poniżej znajduje się kompletny przykład pliku JSON zawierający
                wszystkie opcje:
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
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
