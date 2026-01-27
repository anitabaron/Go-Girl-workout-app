export default function ImportInstructionPage() {
  return (
    <div className="min-h-screen bg-secondary p-8 pt-24 dark:bg-black">
      <div className="mx-auto max-w-6xl space-y-12">
        <h2 className="text-2xl font-semibold">
          Instrukcja importu planów treningowych
        </h2>
        <p>
          Aby zaimportować plan treningowy, musisz utworzyć plik JSON zgodny z
          schematem.
        </p>
        <div className="flex gap-4">
          <div className="text-sm">
            <br />
            Nadaj nazwę, opis i partię treningową planu.
            <br />
            <br />
            Na początku sekcja &quot;Warm-up&quot; zawiera ćwiczenia
            rozgrzewkowe. Numeracje są oddzielne dla każdej sekcji.
            <br />
            <br />
            Dla istniejących ćwiczeń, użyj id ćwiczenia (exercise_id) lub nazwy
            ćwiczenia (match_by_name) i opisz sekcję treningową.
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            Dla nowych ćwiczeń, użyj exercise_title, exercise_part i
            exercise_type i opisz sekcję treningową.
            <br />
            <br />
            <br />
            <br />
            <br />
            Na końcu sekcja &quot;Cool-down&quot; zawiera ćwiczenia
            rozciągające. Numeracje są oddzielne dla każdej sekcji.
            <br />
            <br />
            <br />
          </div>
          <div>
            <pre className="bg-background p-4 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  name: "Trening Core z rozgrzewką i rozciąganiem",
                  description:
                    "Kompleksowy plan treningowy skupiający się na mięśniach core z wykorzystaniem ćwiczeń z biblioteki oraz nowych ćwiczeń",
                  part: "Core",
                  exercises: [
                    {
                      exercise_id: "357c2535-b5fd-4b2f-a523-4d62ca17dff6",
                      section_type: "Warm-up",
                      section_order: 1,
                      planned_sets: 2,
                      planned_reps: 10,
                      planned_rest_seconds: 30,
                      planned_rest_after_series_seconds: 60,
                      estimated_set_time_seconds: 300,
                    },
                    {
                      match_by_name: "Deska boczna",
                      section_type: "Main Workout",
                      section_order: 1,
                      planned_sets: 3,
                      planned_duration_seconds: 45,
                      planned_rest_seconds: 20,
                      planned_rest_after_series_seconds: 60,
                      estimated_set_time_seconds: 300,
                    },
                    {
                      exercise_title: "Deska klasyczna",
                      exercise_part: "Core",
                      section_type: "Main Workout",
                      section_order: 2,
                      planned_sets: 3,
                      planned_duration_seconds: 60,
                      planned_rest_seconds: 30,
                      planned_rest_after_series_seconds: 60,
                      estimated_set_time_seconds: 300,
                    },
                    {
                      exercise_title: "Brzuszki",
                      exercise_part: "Core",
                      section_type: "Main Workout",
                      section_order: 3,
                      planned_sets: 4,
                      planned_reps: 15,
                      planned_rest_seconds: 45,
                      planned_rest_after_series_seconds: 60,
                      estimated_set_time_seconds: 300,
                    },
                    {
                      exercise_title: "Rozciąganie core",
                      exercise_type: "Cool-down",
                      exercise_part: "Core",
                      section_type: "Cool-down",
                      section_order: 1,
                      planned_sets: 2,
                      planned_duration_seconds: 30,
                      planned_rest_seconds: 15,
                      planned_rest_after_series_seconds: 60,
                      estimated_set_time_seconds: 300,
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
