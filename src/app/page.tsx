import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-secondary font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="bg-primary">
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

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-border dark:bg-zinc-950">
          <h2 className="text-xl font-bold tracking-tight">Planned features</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Here’s what’s coming next.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="rounded-xl bg-secondary/70 p-4 text-sm dark:bg-card">
              <span className="font-semibold">Workout timer</span> with audio
              cues and intervals.
            </li>
            <li className="rounded-xl bg-secondary/70 p-4 text-sm dark:bg-card">
              <span className="font-semibold">Plans & programs</span> tailored
              to goals and fitness level.
            </li>
            <li className="rounded-xl bg-secondary/70 p-4 text-sm dark:bg-card">
              <span className="font-semibold">Progress tracking</span> for
              workouts, streaks, and PRs.
            </li>
            <li className="rounded-xl bg-secondary/70 p-4 text-sm dark:bg-card">
              <span className="font-semibold">Favorites</span> and quick-start
              routines.
            </li>
          </ul>
        </section>
      </main>

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
