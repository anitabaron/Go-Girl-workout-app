import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Dumbbell,
  Calendar,
  History,
  Trophy,
  ClipboardClock,
  FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/db/supabase.server";
import { HeroReveal, ScrollReveal, Surface } from "./_components";

const FEATURES = [
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
  {
    id: "assistant",
    title: "Asystent treningowy",
    description:
      "Asystent treningowy pomaga Ci w organizacji i wykonywaniu treningów. Generuje plany treningowe, dostosowane do Twoich potrzeb i umiejscowienia.",
    icon: ClipboardClock,
    href: "/workout-sessions/start",
  },
  {
    id: "import-workout-plan",
    title: "Import planu treningowego",
    description:
      "Importuj plan treningowy z pliku JSON. Aplikacja przeanalizuje plik i wygeneruje plan treningowy dostosowany do Twoich potrzeb.",
    icon: FileJson,
    href: "/import-instruction",
  },
] as const;

export default async function M3Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;
  const code = params.code;

  // Obsługa parametru `code` z Supabase Auth (reset hasła, potwierdzenie emaila)
  if (code && typeof code === "string") {
    const supabase = await createClient();

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        redirect("/reset-password?error=invalid_token");
      }

      redirect("/reset-password/confirm");
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      redirect("/reset-password?error=invalid_token");
    }
  }

  return (
    <div className="space-y-10 md:space-y-16 w-full min-w-0">
      {/* Hero section – logo + headline */}
      <Surface variant="hero" className="overflow-hidden p-3 sm:p-4 md:p-5">
        <HeroReveal
          stagger={[".hero-headline", ".hero-desc", ".hero-cta", ".hero-illus"]}
          staggerDelay={0.1}
        >
          <div className="flex flex-col items-center text-center px-2 py-4 md:py-5">
            <Image
              src="/logo-pin.png"
              alt="Go Girl Workout App"
              width={450}
              height={180}
              priority
              className="hero-illus h-auto w-[110px] sm:w-[90px] md:w-[80px]"
            />
            <h1 className="hero-headline m3-headline mt-3 text-foreground md:m3-hero-sm md:mt-4">
              designed to help you stay on track with your goals
            </h1>
            <div className="hero-cta mt-3 flex items-center gap-3 md:mt-4">
              <Button asChild className="m3-cta">
                <Link href="/exercises" prefetch={false}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </HeroReveal>
      </Surface>

      {/* Features overview – wszystkie 6 funkcji */}
      <section className="space-y-6 w-full min-w-0">
        <h2 className="m3-headline">Odkryj wszystkie możliwości aplikacji</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal
                key={feature.id}
                start={index < 2 ? "top 90%" : "top 85%"}
              >
                <Surface variant="high" className="h-full">
                  <Link
                    href={feature.href}
                    prefetch={false}
                    className="block h-full group"
                    aria-label={`Przejdź do ${feature.title}`}
                  >
                    <div className="mb-3">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <h3 className="m3-title group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm m3-prose text-muted-foreground">
                      {feature.description}
                    </p>
                    <span className="mt-4 inline-block text-sm font-medium text-primary group-hover:underline">
                      Przejdź do {feature.title} →
                    </span>
                  </Link>
                </Surface>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--m3-outline-variant)] pt-8 pb-4">
        <div className="flex flex-col items-center text-center gap-3">
          <p className="m3-title">
            &quot;Strong today, unstoppable tomorrow.&quot;
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-sm font-semibold">
            <Link
              href="/privacy-policy"
              className="text-primary hover:underline underline-offset-4"
            >
              Privacy Policy
            </Link>
            <a
              href="https://github.com/anitabaron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/anita-baron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              LinkedIn
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Go Girl Workout App. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
