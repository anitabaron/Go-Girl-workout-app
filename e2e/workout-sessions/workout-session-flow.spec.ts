import { test, expect } from "@playwright/test";
import { authenticateUser, createWorkoutPlan } from "../fixtures";
import { WorkoutSessionStartPage } from "../pages/workout-session-start-page";
import { WorkoutSessionAssistantPage } from "../pages/workout-session-assistant-page";
import { WorkoutSessionDetailsPage } from "../pages/workout-session-details-page";

/**
 * E2E tests for full workout session flow
 *
 * Tests verify:
 * 1. Sięgnięcie po trening z planu - wybór planu na stronie startu
 * 2. Start treningu - rozpoczęcie sesji i przekierowanie do asystenta
 * 3. Przejście sesji w asystencie - nawigacja przez ćwiczenia (Skip/Next)
 * 4. Wyświetlenie zakończonej sesji - weryfikacja widoku szczegółów
 *
 * Serial mode: tests share same user; only one in_progress session allowed per user.
 */
test.describe("Workout Session Flow E2E", () => {
  test.describe.configure({ mode: "serial" });
  test("should complete full workout flow: plan → start → session → completed", async ({
    page,
  }) => {
    test.setTimeout(90000);

    await authenticateUser(page);

    const { planName } = await createWorkoutPlan(page, {
      planName: `Session Flow Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 2, reps: 5, restBetween: 30 },
        { part: "Legs", series: 2, reps: 5, restBetween: 30 },
      ],
    });

    const startPage = new WorkoutSessionStartPage(page);
    await startPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await startPage.cancelActiveSessionIfPresent();
    await startPage.waitForPlansList();

    expect(await startPage.hasPlanWithName(planName)).toBe(true);

    await startPage.clickStartPlan(planName);
    await page.waitForURL(/\/workout-sessions\/[^/]+\/active/, {
      timeout: 15000,
    });

    const assistantPage = new WorkoutSessionAssistantPage(page);
    await assistantPage.waitForAssistant();

    await assistantPage.clickNext();
    await page.waitForTimeout(500);
    await assistantPage.clickNext();

    await page.waitForURL(/\/workout-sessions\/[^/]+$/, { timeout: 15000 });
    expect(page.url()).not.toContain("/active");

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();

    expect(await detailsPage.hasCompletedStatus()).toBe(true);
    expect(await detailsPage.getPlanName()).toContain(planName);
    expect(await detailsPage.getExerciseCount()).toBeGreaterThanOrEqual(2);
  });

  test("should complete workout flow using Skip for faster execution", async ({
    page,
  }) => {
    test.setTimeout(60000);

    await authenticateUser(page);

    const { planName } = await createWorkoutPlan(page, {
      planName: `Skip Flow Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 1, reps: 1 },
        { part: "Legs", series: 1, reps: 1 },
      ],
    });

    const startPage = new WorkoutSessionStartPage(page);
    await startPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await startPage.cancelActiveSessionIfPresent();
    await startPage.waitForPlansList();
    await startPage.clickStartPlan(planName);

    await page.waitForURL(/\/workout-sessions\/[^/]+\/active/, {
      timeout: 15000,
    });

    const assistantPage = new WorkoutSessionAssistantPage(page);
    await assistantPage.waitForAssistant();

    await assistantPage.clickSkip();
    await page.waitForTimeout(300);
    await assistantPage.clickSkip();

    await page.waitForURL(/\/workout-sessions\/[^/]+$/, { timeout: 15000 });

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();
    expect(await detailsPage.hasCompletedStatus()).toBe(true);
    expect(await detailsPage.getPlanName()).toContain(planName);
  });

  test("should complete workout flow using timer buttons (OK, Pomiń przerwę)", async ({
    page,
  }) => {
    test.setTimeout(90000);

    await authenticateUser(page);

    const { planName } = await createWorkoutPlan(page, {
      planName: `Timer Buttons Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 2, reps: 1, restBetween: 30 },
        { part: "Legs", series: 1, reps: 1 },
      ],
    });

    const startPage = new WorkoutSessionStartPage(page);
    await startPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await startPage.cancelActiveSessionIfPresent();
    await startPage.waitForPlansList();
    await startPage.clickStartPlan(planName);

    await page.waitForURL(/\/workout-sessions\/[^/]+\/active/, {
      timeout: 15000,
    });

    const assistantPage = new WorkoutSessionAssistantPage(page);
    await assistantPage.waitForAssistant();

    // Exercise 1: 2 series, reps 1, restBetween 30
    // Set 1: RepsDisplay OK → RestBetweenSetsTimer Pomiń przerwę → Set 2: RepsDisplay OK
    await assistantPage.clickTimerOk();
    await page.waitForTimeout(500);
    await assistantPage.clickTimerSkipBreak();
    await page.waitForTimeout(500);
    await assistantPage.clickTimerOk();
    await page.waitForTimeout(500);

    // Exercise 2: 1 series, reps 1 - just OK
    await assistantPage.clickTimerOk();
    await page.waitForTimeout(500);

    // Finish session
    await assistantPage.clickNext();

    await page.waitForURL(/\/workout-sessions\/[^/]+$/, { timeout: 15000 });

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();
    expect(await detailsPage.hasCompletedStatus()).toBe(true);
    expect(await detailsPage.getPlanName()).toContain(planName);
  });
});
