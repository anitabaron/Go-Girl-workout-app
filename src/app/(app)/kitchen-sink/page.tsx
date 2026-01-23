"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/db/supabase.client";
import { WorkoutTimer } from "@/components/workout-sessions/assistant/workout-timer";
import { SetCountdownTimer } from "@/components/workout-sessions/assistant/exercise-timer/set-countdown-timer";
import { RestBetweenSetsTimer } from "@/components/workout-sessions/assistant/exercise-timer/rest-between-sets-timer";
import { RestAfterSeriesTimer } from "@/components/workout-sessions/assistant/exercise-timer/rest-after-series-timer";
import { RepsDisplay } from "@/components/workout-sessions/assistant/exercise-timer/reps-display";

// Calculate date values outside component to avoid impure Date.now() calls during render
const TIMER1_START_TIME = new Date(Date.now() - 120000).toISOString();
const TIMER2_START_TIME = new Date(Date.now() - 60000).toISOString();

export default function KitchenSinkPage() {
  const router = useRouter();

  // Weryfikacja autoryzacji - przekierowanie niezalogowanych użytkowników
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      }
    });
  }, [router]);
  return (
    <div className="min-h-screen bg-secondary p-8 dark:bg-black">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Kitchen Sink</h1>
          <p className="text-muted-foreground">
            Prezentacja wszystkich bazowych komponentów UI
          </p>
        </div>

        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Buttons</h2>
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Wszystkie dostępne warianty przycisków
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sizes</CardTitle>
              <CardDescription>Różne rozmiary przycisków</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icon button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
              <Button size="icon-sm" aria-label="Small icon button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
              <Button size="icon-lg" aria-label="Large icon button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>States</CardTitle>
              <CardDescription>Różne stany przycisków</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
              <Button variant="outline" disabled>
                Disabled Outline
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Badges Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Badges</h2>
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>Wszystkie dostępne warianty odznak</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Examples</CardTitle>
              <CardDescription>Przykłady użycia odznak</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge>New</Badge>
              <Badge variant="secondary">In Progress</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Draft</Badge>
              <Badge>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                With Icon
              </Badge>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Cards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>
                  Podstawowa karta z nagłówkiem i opisem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  To jest zawartość karty. Możesz tutaj umieścić dowolne
                  komponenty i treść.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">
                  Action
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Action</CardTitle>
                <CardDescription>
                  Karta z akcją w nagłówku
                </CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon-sm" aria-label="More options">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ta karta ma przycisk akcji w prawym górnym rogu nagłówka.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Card with Border</CardTitle>
                <CardDescription>
                  Karta z obramowaniem w nagłówku
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nagłówek ma dolną krawędź dzięki klasie border-b.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Footer Border</CardTitle>
                <CardDescription>
                  Karta z obramowaniem w stopce
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stopka ma górną krawędź dzięki klasie border-t.
                </p>
              </CardContent>
              <CardFooter className="border-t">
                <Button variant="outline" size="sm">
                  Cancel
                </Button>
                <Button size="sm">Save</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Select Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Select</h2>
          <Card>
            <CardHeader>
              <CardTitle>Basic Select</CardTitle>
              <CardDescription>
                Podstawowy komponent wyboru
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label id="select-basic-label" htmlFor="select-basic" className="text-sm font-medium">
                  Wybierz opcję
                </label>
                <Select defaultValue="option1">
                  <SelectTrigger id="select-basic" aria-labelledby="select-basic-label">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Opcja 1</SelectItem>
                    <SelectItem value="option2">Opcja 2</SelectItem>
                    <SelectItem value="option3">Opcja 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label id="select-groups-label" htmlFor="select-groups" className="text-sm font-medium">
                  Select z grupami
                </label>
                <Select defaultValue="apple">
                  <SelectTrigger id="select-groups" aria-labelledby="select-groups-label">
                    <SelectValue placeholder="Wybierz owoc..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Owoce</SelectLabel>
                      <SelectItem value="apple">Jabłko</SelectItem>
                      <SelectItem value="banana">Banan</SelectItem>
                      <SelectItem value="orange">Pomarańcza</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Warzywa</SelectLabel>
                      <SelectItem value="carrot">Marchew</SelectItem>
                      <SelectItem value="tomato">Pomidor</SelectItem>
                      <SelectItem value="cucumber">Ogórek</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label id="select-small-label" htmlFor="select-small" className="text-sm font-medium">
                  Small Size
                </label>
                <Select defaultValue="small1">
                  <SelectTrigger id="select-small" size="sm" aria-labelledby="select-small-label">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small1">Mała opcja 1</SelectItem>
                    <SelectItem value="small2">Mała opcja 2</SelectItem>
                    <SelectItem value="small3">Mała opcja 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label id="select-disabled-label" htmlFor="select-disabled" className="text-sm font-medium">
                  Disabled
                </label>
                <Select disabled defaultValue="disabled1">
                  <SelectTrigger id="select-disabled" aria-labelledby="select-disabled-label">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled1">Wyłączona opcja 1</SelectItem>
                    <SelectItem value="disabled2">Wyłączona opcja 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Timers Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Timers</h2>
          <Card>
            <CardHeader>
              <CardTitle>Workout Timers</CardTitle>
              <CardDescription>
                Wszystkie dostępne timery treningowe - widok obok siebie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {/* WorkoutTimer - główny timer sesji */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Workout Timer</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <WorkoutTimer
                      activeDurationSeconds={930}
                      lastTimerStartedAt={TIMER1_START_TIME}
                      lastTimerStoppedAt={null}
                      isPaused={false}
                      currentSetNumber={2}
                      currentExerciseIndex={1}
                      totalExercises={5}
                    />
                  </div>
                </div>

                {/* SetCountdownTimer - odliczanie czasu serii */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Set Countdown Timer</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <SetCountdownTimer
                      durationSeconds={30}
                      isPaused={false}
                      onComplete={() => console.log("Set complete")}
                    />
                  </div>
                </div>

                {/* RestBetweenSetsTimer - przerwa między seriami */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Rest Between Sets</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <RestBetweenSetsTimer
                      restSeconds={60}
                      isPaused={false}
                      onComplete={() => console.log("Rest complete")}
                    />
                  </div>
                </div>

                {/* RestAfterSeriesTimer - przerwa po seriach */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Rest After Series</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <RestAfterSeriesTimer
                      restSeconds={90}
                      isPaused={false}
                      onComplete={() => console.log("Rest after series complete")}
                    />
                  </div>
                </div>

                {/* RepsDisplay - wyświetlacz powtórzeń */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Reps Display</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <RepsDisplay
                      reps={12}
                      setNumber={1}
                      onComplete={() => console.log("Reps complete")}
                    />
                  </div>
                </div>

                {/* WorkoutTimer z przerwą (restSeconds) */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-center">Workout Timer (Rest Mode)</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <WorkoutTimer
                      activeDurationSeconds={450}
                      lastTimerStartedAt={TIMER2_START_TIME}
                      lastTimerStoppedAt={null}
                      isPaused={false}
                      currentSetNumber={3}
                      currentExerciseIndex={2}
                      totalExercises={6}
                      restSeconds={45}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Skeleton Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Skeleton</h2>
          <Card>
            <CardHeader>
              <CardTitle>Loading States</CardTitle>
              <CardDescription>
                Komponenty szkieletowe do wyświetlania podczas ładowania
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>

              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Combined Example */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Combined Example</h2>
          <Card>
            <CardHeader>
              <CardTitle>Przykład użycia wielu komponentów</CardTitle>
              <CardDescription>
                Karta prezentująca kombinację różnych komponentów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>New</Badge>
                <Badge variant="secondary">Featured</Badge>
                <Badge variant="outline">Updated</Badge>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button>Primary Action</Button>
                <Button variant="outline">Secondary</Button>
                <Button variant="ghost">Tertiary</Button>
              </div>

              <div className="space-y-2">
                <label id="select-combined-label" htmlFor="select-combined" className="text-sm font-medium">
                  Wybierz opcję
                </label>
                <Select defaultValue="value1">
                  <SelectTrigger id="select-combined" className="w-full" aria-labelledby="select-combined-label">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value1">Wartość 1</SelectItem>
                    <SelectItem value="value2">Wartość 2</SelectItem>
                    <SelectItem value="value3">Wartość 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </div>
  );
}
