import { test, expect } from "@playwright/test";
import { authenticateUser } from "../fixtures";

test.describe("Statistics", () => {
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
});
