import workoutPlanImportExample from "../../../../.ai/workout-plan-import-example.json";

export default function ImportInstructionPage() {
  return (
    <div className="min-h-screen pt-16 bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Instrukcja importu planów treningowych
            </h1>
            <p className="text-muted-foreground">
              Utwórz plik JSON zgodny z poniższym schematem, aby zaimportować
              plan treningowy do aplikacji.
            </p>
          </div>

          {/* Step 1: Plan Information */}
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <h2 className="text-xl font-semibold">
                Informacje ogólne o planie treningowym
              </h2>
            </div>
            <div className="ml-11 space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Pola na poziomie planu:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded">name</code>{" "}
                    (string, max 120 znaków) - nazwa planu treningowego
                  </li>
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded">
                      description
                    </code>{" "}
                    (string | null, opcjonalne) - opis planu
                  </li>
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded">part</code>{" "}
                    (enum: &quot;Legs&quot; | &quot;Core&quot; |
                    &quot;Back&quot; | &quot;Arms&quot; | &quot;Chest&quot; |
                    null) - partia mięśniowa
                  </li>
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded">
                      exercises
                    </code>{" "}
                    (array, min 1 element) - tablica ćwiczeń
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 2: Exercise Structure */}
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <h2 className="text-xl font-semibold">Struktura ćwiczeń</h2>
            </div>
            <div className="ml-11 space-y-4">
              <p className="text-sm text-muted-foreground">
                Plan treningowy składa się z trzech sekcji, które powinny być
                ułożone w następującej kolejności:
              </p>
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-r">
                  <p className="font-medium">1. Warm-up</p>
                  <p className="text-sm text-muted-foreground">
                    Ćwiczenia rozgrzewkowe na początku treningu
                  </p>
                </div>
                <div className="border-l-4 border-pink-500 pl-4 py-2 bg-pink-50 dark:bg-pink-950/20 rounded-r">
                  <p className="font-medium">2. Main Workout</p>
                  <p className="text-sm text-muted-foreground">
                    Główne ćwiczenia treningowe
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 dark:bg-purple-950/20 rounded-r">
                  <p className="font-medium">3. Cool-down </p>
                  <p className="text-sm text-muted-foreground">
                    Ćwiczenia rozciągające na końcu treningu
                  </p>
                </div>
              </div>
              <div className=" rounded-md">
                <p className="text-xs text-muted-foreground">
                  Numeracja{" "}
                  <code className="bg-white dark:bg-zinc-950 px-1.5 py-0.5 rounded">
                    section_order
                  </code>{" "}
                  jest oddzielna dla każdej sekcji. Każda sekcja zaczyna się od
                  1.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3: Exercise Options */}
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <h2 className="text-xl font-semibold">Opcje dodawania ćwiczeń</h2>
            </div>
            <div className="ml-11 space-y-6">
              {/* Option A: Existing Exercise */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base">
                  Opcja A: Istniejące ćwiczenie
                </h3>
                <p className="text-sm text-muted-foreground">
                  Użyj, gdy ćwiczenie już istnieje w bibliotece. Możesz je
                  zidentyfikować przez ID (UUID) lub nazwę. Jeśli nie podasz
                  opcjonalnych pól, zostaną one automatycznie pobrane z bazy
                  danych.
                </p>
                <div className="bg-muted p-3 rounded-md space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-2">Wymagane pola:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          exercise_id
                        </code>{" "}
                        (UUID string) - identyfikator ćwiczenia
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          match_by_name
                        </code>{" "}
                        (string, max 120 znaków) - nazwa ćwiczenia do wyszukania
                      </li>

                      <p className="text-xs text-muted-foreground italic mt-1">
                        Musisz podać przynajmniej jedno z powyższych
                        (exercise_id lub match_by_name).
                      </p>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          section_type
                        </code>{" "}
                        (enum: &quot;Warm-up&quot; | &quot;Main Workout&quot; |
                        &quot;Cool-down&quot;) - typ sekcji
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          section_order
                        </code>{" "}
                        (number &gt; 0, unikalna w ramach sekcji) - kolejność w
                        sekcji
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-medium mb-2">
                      Pola opcjonalne (jeśli nie podane, zostaną pobrane z
                      bazy):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_sets
                        </code>{" "}
                        (number &gt; 0 | null) - liczba serii (domyślnie z bazy:
                        series)
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_reps
                        </code>{" "}
                        (number &gt; 0 | null) - liczba powtórzeń (domyślnie z
                        bazy: reps)
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_duration_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - czas trwania w sekundach
                        (domyślnie z bazy: duration_seconds)
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_rest_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku między seriami
                        w sekundach (domyślnie z bazy: rest_in_between_seconds)
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_rest_after_series_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku po zakończeniu
                        wszystkich serii (domyślnie z bazy:
                        rest_after_series_seconds)
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          estimated_set_time_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - szacowany czas wykonania serii
                        w sekundach (domyślnie z bazy:
                        estimated_set_time_seconds)
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Jeśli nie podasz żadnego z opcjonalnych pól, wszystkie
                      wartości zostaną automatycznie pobrane z bazy danych na
                      podstawie ćwiczenia zidentyfikowanego przez exercise_id
                      lub match_by_name.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option B: New Exercise (Snapshot) */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base">
                  Opcja B: Nowe ćwiczenie (snapshot)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Użyj, gdy chcesz dodać nowe ćwiczenie, które nie istnieje w
                  bibliotece.
                </p>
                <div className="bg-muted p-3 rounded-md space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-2">
                      Wymagane pola specyficzne dla tej opcji:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          exercise_title
                        </code>{" "}
                        (string, max 120 znaków) - nazwa ćwiczenia
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          section_type
                        </code>{" "}
                        (enum: &quot;Warm-up&quot; | &quot;Main Workout&quot; |
                        &quot;Cool-down&quot;) - typ sekcji
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          section_order
                        </code>{" "}
                        (number &gt; 0, unikalna w ramach sekcji) - kolejność w
                        sekcji
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_sets
                        </code>{" "}
                        (number &gt; 0 | null) - liczba serii
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_rest_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku między seriami
                        w sekundach
                      </li>
                    </ul>
                  </div>
                  <div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_reps
                        </code>{" "}
                        (number &gt; 0 | null) - liczba powtórzeń
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_duration_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - czas trwania w sekundach
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground italic mt-1">
                      Musisz podać przynajmniej jedno z powyższych (reps lub
                      duration).
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">
                      Opcjonalne pola specyficzne dla tej opcji:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          exercise_part
                        </code>{" "}
                        (enum: &quot;Legs&quot; | &quot;Core&quot; |
                        &quot;Back&quot; | &quot;Arms&quot; | &quot;Chest&quot;)
                        - partia mięśniowa
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          exercise_type
                        </code>{" "}
                        (enum: &quot;Warm-up&quot; | &quot;Main Workout&quot; |
                        &quot;Cool-down&quot;) - typ ćwiczenia
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          exercise_details
                        </code>{" "}
                        (string, max 1000 znaków) - dodatkowe szczegóły
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-medium mb-2">
                      Dodatkowe pola opcjonalne:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          planned_rest_after_series_seconds
                        </code>{" "}
                        (number &gt;= 0 | null) - czas odpoczynku po zakończeniu
                        wszystkich serii
                      </li>
                      <li>
                        <code className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded">
                          estimated_set_time_seconds
                        </code>{" "}
                        (number &gt; 0 | null) - szacowany czas wykonania serii
                        w sekundach
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Example JSON */}
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                4
              </div>
              <h2 className="text-xl font-semibold">Przykładowy plik JSON</h2>
            </div>
            <div className="ml-11">
              <p className="text-sm text-muted-foreground mb-3">
                Poniżej znajduje się kompletny przykład pliku JSON zawierający
                wszystkie opcje:
              </p>
              <div className="bg-muted rounded-md p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  {JSON.stringify(workoutPlanImportExample, null, 2)}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
