import { test, expect, type Page } from "@playwright/test";
import { authenticateUser, createWorkoutPlan } from "../fixtures";

async function createCompletedSessionFromPlan(page: Page, planId: string) {
  let startedId: string | undefined;
  let startOk = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const startResponse = await page.request.post("/api/workout-sessions", {
      data: { workout_plan_id: planId },
    });
    if (startResponse.ok()) {
      const started = (await startResponse.json()) as { id?: string };
      if (started.id) {
        startedId = started.id;
        startOk = true;
        break;
      }
    }
    await page.waitForTimeout(500 + attempt * 500);
  }
  expect(startOk).toBe(true);
  expect(startedId).toBeTruthy();

  const completeResponse = await page.request.patch(
    `/api/workout-sessions/${startedId}/status`,
    {
      data: { status: "completed" },
    },
  );
  expect(completeResponse.ok()).toBe(true);
}

test.describe("Statistics", () => {
  test.describe.configure({ mode: "serial" });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/statistics");
    await page.waitForURL(/\/login(\?|$)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("should allow authenticated user to use statistics page and language switch", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await authenticateUser(page);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await expect(
      page.getByRole("heading", { name: "Statystyki", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kalendarz treningów", level: 2 }),
    ).toBeVisible();

    const previousMonthButton = page.getByRole("button", {
      name: /Poprzedni miesiąc|Previous month/i,
    });
    const monthLabel = previousMonthButton.locator("xpath=following-sibling::p[1]");
    const initialMonth = (await monthLabel.textContent())?.trim() ?? "";
    expect(initialMonth.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: /Następny miesiąc|Next month/i }).click();
    await expect
      .poll(async () => (await monthLabel.textContent())?.trim() ?? "", {
        timeout: 5000,
      })
      .not.toBe(initialMonth);

    await page.getByRole("button", { name: "Angielski" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await expect(
      page.getByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Workout calendar", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next month" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Polish" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Statystyki", level: 1 }),
    ).toBeVisible();
  });

  test("E2E-STAT-001 should open session details modal from statistics calendar", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await authenticateUser(page);

    const { planId } = await createWorkoutPlan(page, {
      planName: `Stats Modal Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 1, reps: 1 },
        { part: "Legs", series: 1, reps: 1 },
      ],
    });
    await createCompletedSessionFromPlan(page, planId);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    const planButton = page
      .getByRole("button", { name: /^Stats Modal Plan/i })
      .first();
    await expect(planButton).toBeVisible({ timeout: 30000 });
    await planButton.click();

    await expect(
      page.getByText(/Data treningu|Workout date/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Czas trwania|Duration/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Liczba ćwiczeń|Number of exercises/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Szczegóły sesji|Session details/i }),
    ).toBeVisible();
  });

  test("E2E-STAT-002 should repeat plan from statistics modal and navigate to active session", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await authenticateUser(page);

    const { planId } = await createWorkoutPlan(page, {
      planName: `Stats Repeat Plan ${Date.now()}`,
      exercises: [
        { part: "Back", series: 1, reps: 1 },
        { part: "Core", series: 1, reps: 1 },
      ],
    });
    await createCompletedSessionFromPlan(page, planId);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    const planButton = page
      .getByRole("button", { name: /^Stats Repeat Plan/i })
      .first();
    await expect(planButton).toBeVisible({ timeout: 30000 });
    await planButton.click();

    await page
      .getByRole("button", {
        name: /Wykonaj ten plan jeszcze raz|Do this plan again/i,
      })
      .click();

    await page.waitForURL(/\/workout-sessions\/[^/]+\/active/, {
      timeout: 20000,
    });
    await expect(page).toHaveURL(/\/workout-sessions\/[^/]+\/active/);
  });

  test("E2E-STAT-003 should allow adding external workout from statistics page", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await authenticateUser(page);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    await page
      .getByRole("button", {
        name: /Dodaj inny trening|Dodaj trening spoza aplikacji|Add workout from outside app/i,
      })
      .click();

    await page
      .getByLabel(/Czas trwania \(min\)|Duration \(min\)/i)
      .fill("47");
    await page
      .getByLabel(/Typ sportu|Sport type/i)
      .fill("Joga");
    await page
      .getByLabel(/Kalorie|Calories/i)
      .fill("333");
    await page
      .getByLabel(/Średnie tętno|Avg heart rate/i)
      .fill("150");
    await page
      .getByLabel(/Maksymalne tętno|Max heart rate/i)
      .fill("177");
    await page
      .getByLabel(/Intensywność RPE|Intensity RPE/i)
      .fill("8");

    const createExternalWorkoutRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/api/external-workouts") &&
        response.request().method() === "POST",
      { timeout: 15000 },
    );

    await page
      .getByRole("button", { name: /Zapisz trening|Save workout/i })
      .click();

    const createResponse = await createExternalWorkoutRequest;
    expect(createResponse.ok()).toBe(true);

    await expect(
      page.getByRole("dialog", { name: /Dodaj trening|Add external workout/i }),
    ).not.toBeVisible({ timeout: 15000 });

    const response = await page.request.get("/api/external-workouts?limit=30");
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as {
      items: Array<{
        calories?: number | null;
        hr_avg?: number | null;
        hr_max?: number | null;
        intensity_rpe?: number | null;
        source?: string | null;
      }>;
    };

    const created = payload.items.find(
      (item) =>
        item.calories === 333 &&
        item.hr_avg === 150 &&
        item.hr_max === 177 &&
        item.intensity_rpe === 8 &&
        item.source === "manual",
    );

    expect(created).toBeTruthy();
  });

  test("E2E-I18N-001 should persist selected language after reload and page navigation", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await authenticateUser(page);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.getByRole("button", { name: "Angielski" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    await page.goto("/exercises");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Statistics", level: 1 }),
    ).toBeVisible();
  });
});
