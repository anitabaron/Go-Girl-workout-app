import workoutPlanImportExample from "../../../../.ai/workout-plan-import-example.json";

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
              {JSON.stringify(workoutPlanImportExample, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
