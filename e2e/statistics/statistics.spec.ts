import { test, expect, type Page } from "@playwright/test";
import { authenticateUser, createWorkoutPlan } from "../fixtures";

async function createCompletedSessionFromPlan(page: Page, planId: string) {
  const startResponse = await page.request.post("/api/workout-sessions", {
    data: { workout_plan_id: planId },
  });
  expect(startResponse.ok()).toBe(true);
  const started = (await startResponse.json()) as { id?: string };
  expect(started.id).toBeTruthy();

  const completeResponse = await page.request.patch(
    `/api/workout-sessions/${started.id}/status`,
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

    const monthLabel = page.locator("p.min-w-44").first();
    const initialMonth = (await monthLabel.textContent())?.trim() ?? "";
    expect(initialMonth.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Następny miesiąc" }).click();
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

    const { planName, planId } = await createWorkoutPlan(page, {
      planName: `Stats Modal Plan ${Date.now()}`,
      exercises: [
        { part: "Arms", series: 1, reps: 1 },
        { part: "Legs", series: 1, reps: 1 },
      ],
    });
    await createCompletedSessionFromPlan(page, planId);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page
      .getByRole("button", { name: new RegExp(planName, "i") })
      .first()
      .click();

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

    const { planName, planId } = await createWorkoutPlan(page, {
      planName: `Stats Repeat Plan ${Date.now()}`,
      exercises: [
        { part: "Back", series: 1, reps: 1 },
        { part: "Core", series: 1, reps: 1 },
      ],
    });
    await createCompletedSessionFromPlan(page, planId);

    await page.goto("/statistics");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page
      .getByRole("button", { name: new RegExp(planName, "i") })
      .first()
      .click();

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
