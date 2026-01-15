import { Dumbbell, Calendar, History, Trophy } from "lucide-react";
import { FeatureCard, type Feature } from "./feature-card";

/**
 * Dane funkcji aplikacji
 */
const features: Feature[] = [
  {
    id: "exercises",
    title: "Biblioteka ćwiczeń",
    description:
      "Przeglądaj i zarządzaj swoją biblioteką ćwiczeń. Dodawaj własne ćwiczenia, filtruj po części ciała i typie, śledź swoje ulubione.",
    icon: Dumbbell,
    href: "/exercises",
  },
  {
    id: "workout-plans",
    title: "Plany treningowe",
    description:
      "Twórz i zarządzaj planami treningowymi dostosowanymi do Twoich celów. Organizuj ćwiczenia w sekcje, ustaw parametry treningowe.",
    icon: Calendar,
    href: "/workout-plans",
  },
  {
    id: "workout-sessions",
    title: "Historia sesji",
    description:
      "Śledź historię swoich treningów. Przeglądaj zakończone sesje, analizuj postępy i wznawiaj przerwane treningi.",
    icon: History,
    href: "/workout-sessions",
  },
  {
    id: "personal-records",
    title: "Rekordy osobiste",
    description:
      "Śledź swoje rekordy osobiste w różnych metrykach. Osiągaj nowe PR i obserwuj swoje postępy w czasie.",
    icon: Trophy,
    href: "/personal-records",
  },
];

/**
 * Server Component renderujący sekcję z przeglądem funkcji aplikacji.
 * Zastępuje istniejącą sekcję "Planned features" rzeczywistymi funkcjami aplikacji.
 */
export function FeaturesOverview() {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
      <h2 className="text-xl font-bold tracking-tight">Funkcje aplikacji</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Odkryj wszystkie możliwości aplikacji Go Girl.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}
