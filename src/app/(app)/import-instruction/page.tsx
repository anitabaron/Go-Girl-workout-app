import workoutPlanImportExample from "@/lib/json/workout-plan-import-example.json";
import workoutSessionImportExample from "@/lib/json/workout-session-import-example.json";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/layout/Surface";
import { getTranslations } from "@/i18n/server";

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-[var(--m3-surface-container)] px-1 py-0.5 font-mono">
      {children}
    </code>
  );
}

function FieldList({
  title,
  fields,
}: {
  title: string;
  fields: string[];
}) {
  return (
    <div>
      <p className="m3-label text-xs mb-2">{title}</p>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-xs">
        {fields.map((field) => (
          <li key={field}>
            <Code>{field}</Code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ImportInstructionPage() {
  const t = await getTranslations("importInstructionPage");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <PageHeader title={t("title")} description={t("description")} />
      </header>

      <div className="space-y-10">
        {/* Wspólne: jak wskazać ćwiczenie */}
        <Surface variant="high">
          <div className="space-y-4">
            <div>
              <h2 className="m3-headline">{t("commonTitle")}</h2>
              <p className="m3-body text-muted-foreground text-xs mt-1">
                {t("commonDescription")}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="m3-title">{t("commonLibraryTitle")}</h3>
                <p className="m3-body text-muted-foreground text-xs">
                  {t("commonLibraryDescription")}
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 text-xs">
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>
                      <Code>exercise_id</Code> (UUID)
                    </li>
                    <li>
                      <strong>{t("orLabel")}</strong> <Code>match_by_name</Code>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="m3-title">{t("commonNewTitle")}</h3>
                <p className="m3-body text-muted-foreground text-xs">
                  {t("commonNewDescription")}
                </p>
                <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3 text-xs">
                  <FieldList
                    title={t("requiredLabel")}
                    fields={["exercise_title"]}
                  />
                  <FieldList
                    title={t("optionalLabel")}
                    fields={[
                      "exercise_type",
                      "exercise_part",
                      "exercise_details",
                      "exercise_is_unilateral",
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </Surface>

        {/* Ścieżka 1: Plan treningu */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="m3-display text-lg font-semibold">
              {t("planTitle")}
            </h2>
            <p className="m3-body text-muted-foreground text-sm">
              {t("planDescription")}
            </p>
          </div>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("planFieldsTitle")}</h3>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-3 text-xs">
                <FieldList title={t("requiredLabel")} fields={["name", "exercises"]} />
                <FieldList
                  title={t("optionalLabel")}
                  fields={["description", "part"]}
                />
              </div>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("planSectionsTitle")}</h3>
              <p className="m3-body text-muted-foreground text-xs">
                {t("planSectionsDescription")}
              </p>
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4 py-2 rounded-r bg-red-500/10">
                  <p className="m3-label text-xs">Warm-up</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    {t("planWarmupDescription")}
                  </p>
                </div>
                <div className="border-l-4 border-pink-500 pl-4 py-2 rounded-r bg-pink-500/10">
                  <p className="m3-label text-xs">Main Workout</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    {t("planMainDescription")}
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4 py-2 rounded-r bg-purple-500/10">
                  <p className="m3-label text-xs">Cool-down</p>
                  <p className="m3-body text-muted-foreground text-xs">
                    {t("planCooldownDescription")}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("planOrderNote")}
              </p>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("planParamsTitle")}</h3>
              <p className="m3-body text-muted-foreground text-xs">
                {t("planParamsDescription")}
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 text-xs">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  {[
                    "planned_sets",
                    "planned_reps",
                    "planned_duration_seconds",
                    "planned_rest_seconds",
                    "planned_rest_after_series_seconds",
                    "estimated_set_time_seconds",
                  ].map((field) => (
                    <li key={field}>
                      <Code>{field}</Code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("planExampleTitle")}</h3>
              <p className="m3-body text-muted-foreground text-xs">
                {t("endpointLabel")}{" "}
                <Code>POST /api/workout-plans/import</Code>
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  {JSON.stringify(workoutPlanImportExample, null, 2)}
                </pre>
              </div>
            </div>
          </Surface>
        </section>

        {/* Ścieżka 2: Wykonany trening */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="m3-display text-lg font-semibold">
              {t("workoutTitle")}
            </h2>
            <p className="m3-body text-muted-foreground text-sm">
              {t("workoutDescription")}
            </p>
          </div>

          <Surface variant="high">
            <div className="space-y-4">
              <p className="m3-body text-muted-foreground text-xs">
                {t("workoutFieldsNote")}
              </p>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("workoutPerformanceTitle")}</h3>
              <p className="m3-body text-muted-foreground text-xs">
                {t("workoutPerformanceDescription")}
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 text-xs">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  {["planned_sets", "planned_reps", "planned_duration_seconds"].map(
                    (field) => (
                      <li key={field}>
                        <Code>{field}</Code>
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <p className="m3-body text-muted-foreground text-xs">
                {t("workoutRestNote")}
              </p>
              <p className="m3-body text-muted-foreground text-xs">
                {t("workoutOrderNote")}
              </p>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("workoutResultTitle")}</h3>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-3 space-y-2 text-xs">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>{t("workoutResultPoint1")}</li>
                  <li>{t("workoutResultPoint2")}</li>
                  <li>{t("workoutResultPoint3")}</li>
                  <li>{t("workoutResultPoint4")}</li>
                </ul>
              </div>
            </div>
          </Surface>

          <Surface variant="high">
            <div className="space-y-4">
              <h3 className="m3-headline">{t("workoutExampleTitle")}</h3>
              <p className="m3-body text-muted-foreground text-xs">
                {t("endpointLabel")}{" "}
                <Code>POST /api/workout-sessions/import</Code>
              </p>
              <div className="rounded-[var(--m3-radius-md)] bg-[var(--m3-surface-container-highest)] p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  {JSON.stringify(workoutSessionImportExample, null, 2)}
                </pre>
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </div>
  );
}
