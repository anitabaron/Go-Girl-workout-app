import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Workout Session Start Page
 *
 * Encapsulates /workout-sessions/start page - plan selection and start workout
 */
export class WorkoutSessionStartPage {
  readonly page: Page;
  readonly plansList: Locator;
  readonly emptyState: Locator;
  readonly activeSessionCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.plansList = page.locator(
      '[data-test-id="workout-session-start-plans-list"]',
    );
    this.emptyState = page.locator("text=Brak planów treningowych");
    // Legacy: "Anuluj sesję", M3: "Cancel"
    this.activeSessionCancelButton = page.getByRole("button", {
      name: /Anuluj sesję|Cancel/,
    });
  }

  async goto() {
    await this.page.goto("/workout-sessions/start");
  }

  /**
   * Cancels active session if present (ResumeSessionCard visible).
   * Call before waitForPlansList when tests may run with leftover in_progress session.
   */
  async cancelActiveSessionIfPresent(timeout = 10000): Promise<boolean> {
    const visible = await this.activeSessionCancelButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!visible) return false;

    await this.activeSessionCancelButton.click();
    // Legacy: "Potwierdź", M3: "Confirm"
    const confirmBtn = this.page.getByRole("button", {
      name: /Potwierdź|Confirm/,
    });
    await confirmBtn.waitFor({ state: "visible", timeout });
    await confirmBtn.click();
    await this.page.waitForLoadState("networkidle", { timeout: 15000 });
    return true;
  }

  async waitForPlansList(timeout = 30000) {
    await this.plansList.waitFor({ state: "visible", timeout });
  }

  async hasPlanWithName(name: string): Promise<boolean> {
    const cards = this.page.locator(
      '[data-test-id^="workout-plan-start-card-"]',
    );
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await card.waitFor({ state: "visible", timeout: 5000 }).catch(() => null);
      const cardText = await card.textContent({ timeout: 5000 });
      if (cardText?.includes(name)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clicks Start button for the given plan.
   * Works with both Legacy (Polish) and M3 (English) UI.
   */
  async clickStartPlan(planName: string) {
    const card = this.page
      .locator('[data-test-id^="workout-plan-start-card-"]')
      .filter({ hasText: planName });
    const startButton = card.getByRole("button", {
      name: /Start|Rozpocznij/,
    });
    await startButton.waitFor({ state: "visible", timeout: 10000 });
    await startButton.click();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }
}
