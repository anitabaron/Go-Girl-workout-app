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
    // Set 1: OK or Skip break → Skip break or OK → Set 2: OK (order can vary on load)
    await assistantPage.clickVisibleTimerButton();
    await page.waitForTimeout(500);
    await assistantPage.clickVisibleTimerButton();
    await page.waitForTimeout(500);
    await assistantPage.clickVisibleTimerButton();
    await page.waitForTimeout(500);

    // Exercise 2: 1 series, reps 1 - just OK (or Skip break if rest shown first)
    await assistantPage.clickVisibleTimerButton();
    await page.waitForTimeout(500);

    // Finish session
    await assistantPage.clickNext();

    await page.waitForURL(/\/workout-sessions\/[^/]+$/, { timeout: 15000 });

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();
    expect(await detailsPage.hasCompletedStatus()).toBe(true);
    expect(await detailsPage.getPlanName()).toContain(planName);
  });

  test("should preserve manually entered actual values across skip/back/timer-driven flow", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await authenticateUser(page);

    const suffix = Date.now();
    const skippedThenDoneTitle = `Skip Then Done ${suffix}`;
    const manualRepsTitle = `Manual Reps ${suffix}`;
    const manualDurationTitle = `Manual Duration ${suffix}`;

    const { planName } = await createWorkoutPlan(page, {
      planName: `Complex Assistant Flow ${suffix}`,
      exercises: [
        { title: skippedThenDoneTitle, part: "Arms", series: 1, reps: 10 },
        {
          title: manualRepsTitle,
          part: "Legs",
          series: 1,
          reps: 12,
          restAfter: 20,
        },
        {
          title: manualDurationTitle,
          part: "Arms",
          series: 1,
          duration: 40,
          restAfter: 20,
        },
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

    // 1) Skip first exercise.
    await assistantPage.waitForExerciseTitle(skippedThenDoneTitle);
    await assistantPage.clickSkip();

    // 2) Enter manual reps and move forward via timer OK + skip break (not Next).
    await assistantPage.waitForExerciseTitle(manualRepsTitle);
    await assistantPage.setRepsForSet(1, 7);
    expect(await assistantPage.getRepsForSet(1)).toBe("7");
    await assistantPage.clickTimerOk();
    await page.waitForTimeout(300);
    await assistantPage.clickTimerSkipBreak();

    await assistantPage.waitForExerciseTitle(manualDurationTitle);

    // 3) Go back twice: verify manual reps survived, then return to skipped exercise and do it.
    await assistantPage.clickPrevious();
    await assistantPage.waitForExerciseTitle(manualRepsTitle);
    expect(await assistantPage.getRepsForSet(1)).toBe("7");

    await assistantPage.clickPrevious();
    await assistantPage.waitForExerciseTitle(skippedThenDoneTitle);
    await assistantPage.toggleExerciseSkipped();
    await expect(page.locator("#reps-1")).toBeEnabled();
    await assistantPage.setRepsForSet(1, 9);
    await assistantPage.clickNext();

    // 4) Continue forward; manual reps must still be preserved.
    await assistantPage.waitForExerciseTitle(manualRepsTitle);
    expect(await assistantPage.getRepsForSet(1)).toBe("7");
    await assistantPage.clickNext();

    // 5) On duration exercise, write manual duration and finish via timer OK + skip break.
    await assistantPage.waitForExerciseTitle(manualDurationTitle);
    await assistantPage.setDurationForSet(1, 13);
    await assistantPage.clickTimerOk();
    await page.waitForTimeout(300);
    await assistantPage.clickTimerSkipBreak();

    await page.waitForURL(/\/workout-sessions\/[^/]+$/, { timeout: 15000 });

    const detailsPage = new WorkoutSessionDetailsPage(page);
    await detailsPage.waitForDetails();
    expect(await detailsPage.hasCompletedStatus()).toBe(true);

    const skippedThenDoneCard = page
      .locator('[data-test-id="workout-session-exercise-item"]')
      .filter({
        has: page.getByRole("heading", { level: 3, name: skippedThenDoneTitle }),
      });
    await expect(skippedThenDoneCard.locator("tbody tr").first()).toContainText(
      "9",
    );

    const manualRepsCard = page
      .locator('[data-test-id="workout-session-exercise-item"]')
      .filter({
        has: page.getByRole("heading", { level: 3, name: manualRepsTitle }),
      });
    await expect(manualRepsCard.locator("tbody tr").first()).toContainText("7");

    const manualDurationCard = page
      .locator('[data-test-id="workout-session-exercise-item"]')
      .filter({
        has: page.getByRole("heading", { level: 3, name: manualDurationTitle }),
      });
    await expect(manualDurationCard.locator("tbody tr").first().locator("td").nth(1)).toHaveText(
      "13",
    );
  });
});
