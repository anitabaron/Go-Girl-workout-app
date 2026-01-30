import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroReveal, ScrollReveal, Surface } from "./_components";

export default function M3Page() {
  return (
    <div className="space-y-10 md:space-y-16 w-full min-w-0">
      {/* Hero section - tonal primaryContainer, large radius */}
      <Surface variant="hero" className="overflow-hidden">
        <HeroReveal
          stagger={[".hero-headline", ".hero-desc", ".hero-cta", ".hero-illus"]}
          staggerDelay={0.1}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            {/* Left: headline + description + CTA */}
            <div className="space-y-6">
              <h1 className="hero-headline m3-hero text-foreground">Go Girl</h1>
              <p className="hero-desc m3-body-large m3-prose text-muted-foreground">
                Your personal workout companion. Track exercises, build plans,
                and stay consistent with Material 3–inspired design.
              </p>
              <div className="hero-cta flex items-center gap-3">
                <Button asChild className="m3-cta">
                  <Link href="/m3/exercises">Get started</Link>
                </Button>
                <span className="m3-chip">Material 3</span>
              </div>
            </div>

            {/* Right: illustration/media placeholder */}
            <div
              className="hero-illus min-h-[200px] md:min-h-[280px] rounded-[var(--m3-radius-hero)] bg-[var(--m3-surface-container)]/80 flex items-center justify-center border border-[var(--m3-outline-variant)]"
              aria-hidden
            >
              <div className="text-[var(--m3-on-surface-variant)]/60 text-sm font-medium">
                Illustration placeholder
              </div>
            </div>
          </div>
        </HeroReveal>
      </Surface>

      {/* Feature cards - 2-col desktop, 1-col mobile */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ScrollReveal>
          <Surface variant="high" className="h-full">
            <h2 className="m3-headline">Exercises</h2>
            <p className="m3-body mt-3 m3-prose text-muted-foreground">
              Browse and manage your exercise library. Add custom exercises and
              organize by type and muscle group.
            </p>
            <Button asChild className="mt-6 m3-cta">
              <Link href="/m3/exercises">Go to Exercises</Link>
            </Button>
          </Surface>
        </ScrollReveal>

        <ScrollReveal start="top 80%">
          <Surface variant="high" className="h-full">
            <h2 className="m3-headline">Workout plans</h2>
            <p className="m3-body mt-3 m3-prose text-muted-foreground">
              Create and follow workout plans. Build routines that fit your
              goals and schedule.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/m3">Coming soon</Link>
            </Button>
          </Surface>
        </ScrollReveal>
      </div>
      {/* GSAP demo – scroll down to see ScrollReveal animations */}
      <section className="space-y-6 w-full min-w-0">
        <div className="w-full">
          <h2 className="m3-headline text-center">GSAP demo</h2>
          <p className="m3-body text-center text-muted-foreground mt-2 max-w-[65ch] mx-auto">
            Przewiń w dół – każdy blok animuje się (fade + slide) gdy wejdzie w
            viewport.
          </p>
        </div>

        <ScrollReveal>
          <div className="h-[40vh] min-h-[200px] rounded-xl border-2 border-[var(--m3-primary)] p-6 flex flex-col items-center justify-center gap-4 bg-[var(--m3-primary-container)]/30">
            <span className="m3-chip">GSAP ScrollReveal 1</span>
            <p className="m3-body text-center text-muted-foreground">
              Ten blok pojawia się z animacją przy scrollu.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal start="top 85%">
          <div className="h-[40vh] min-h-[200px] rounded-xl border-2 border-[var(--m3-outline)] p-6 flex flex-col items-center justify-center gap-4 bg-[var(--m3-surface-container)]">
            <span className="m3-chip">GSAP ScrollReveal 2</span>
            <p className="m3-body text-center text-muted-foreground">
              Drugi blok – ScrollTrigger działa.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal start="top 85%">
          <div className="h-[40vh] min-h-[200px] rounded-xl border-2 border-[var(--m3-primary)] p-6 flex flex-col items-center justify-center gap-4 bg-[var(--m3-primary-container)]/20">
            <span className="m3-chip">GSAP ScrollReveal 3</span>
            <p className="m3-body text-center text-muted-foreground">
              Trzeci blok – GSAP + ScrollTrigger działają poprawnie.
            </p>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
