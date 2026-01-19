import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/db/supabase.server";
import { FeaturesOverview } from "@/components/home/features-overview";

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const params = await searchParams;
  const code = params.code;

  // Obsługa parametru `code` z Supabase Auth (reset hasła, potwierdzenie emaila)
  // Supabase może przekierowywać z parametrem `code` zamiast hash fragmentu
  if (code && typeof code === "string") {
    const supabase = await createClient();

    try {
      // Wymiana kodu na sesję
      const {
        data: { session },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !session) {
        // Błąd wymiany kodu - przekierowanie do resetu hasła z komunikatem błędu
        redirect("/reset-password?error=invalid_token");
      }

      // Sprawdzenie typu sesji - jeśli to recovery (reset hasła), przekieruj do /reset-password/confirm
      // W Supabase, sesja recovery jest ustawiana automatycznie po wymianie kodu dla resetu hasła
      // Możemy sprawdzić przez próbę zmiany hasła lub przez sprawdzenie typu sesji
      // Dla uproszczenia, jeśli sesja istnieje i użytkownik nie jest w pełni zalogowany,
      // zakładamy, że to sesja recovery
      
      // Po wymianie kodu na sesję, przekierowujemy do /reset-password/confirm
      // Hook w Client Component zweryfikuje typ sesji (recovery vs normal)
      // i obsłuży odpowiednio (reset hasła vs potwierdzenie emaila)
      redirect("/reset-password/confirm");
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      redirect("/reset-password?error=invalid_token");
    }
  }

  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      {/* Hero Section */}
      <header className="bg-primary pt-0 md:pt-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-10 text-center sm:px-10">
          <Image
            src="/logo.png"
            alt="Go Girl Workout App"
            width={450}
            height={180}
            priority
            className="h-auto w-[280px] sm:w-[360px] md:w-[450px]"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-destructive sm:text-4xl md:text-5xl">
              designed to help you stay on track with your goals
            </h1>
            <p className="text-xl font-semibold text-destructive sm:text-2xl">
              stay tuned
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-10 sm:px-10 md:pb-10">
        <FeaturesOverview />
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center sm:px-10">
          <p className="text-lg font-bold">
            &quot;Strong today, unstoppable tomorrow.&quot;
          </p>

          <div className="mt-3 flex justify-center gap-5 text-sm font-semibold">
            <a
              href="https://github.com/anitabaron"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-destructive"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/anita-baron"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-destructive"
            >
              LinkedIn
            </a>
          </div>

          <p className="mt-3 text-xs text-white">
            &copy; {new Date().getFullYear()} Go Girl Workout App. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
