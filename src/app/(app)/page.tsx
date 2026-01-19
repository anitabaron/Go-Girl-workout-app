import Image from "next/image";
import { FeaturesOverview } from "@/components/home/features-overview";

export default async function Home() {
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
