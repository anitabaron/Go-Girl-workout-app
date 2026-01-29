import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Workout Session Details Page
 *
 * Encapsulates /workout-sessions/[id] - completed/in-progress session details
 */
export class WorkoutSessionDetailsPage {
  readonly page: Page;
  readonly metadata: Locator;
  readonly completedStatusBadge: Locator;
  readonly exercisesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.metadata = page.locator(
      '[data-test-id="workout-session-details-metadata"]',
    );
    this.completedStatusBadge = page.locator(
      '[data-test-id="workout-session-status-completed"]',
    );
    this.exercisesList = page.locator(
      '[data-test-id="workout-session-details-exercises-list"]',
    );
  }

  async goto(sessionId: string) {
    await this.page.goto(`/workout-sessions/${sessionId}`);
  }

  async waitForDetails(timeout = 30000) {
    await this.metadata.waitFor({ state: "visible", timeout });
  }

  async getPlanName(): Promise<string> {
    await this.metadata.waitFor({ state: "visible", timeout: 10000 });
    const planNameEl = this.page.locator(
      '[data-test-id="workout-session-details-plan-name"]',
    );
    return (await planNameEl.textContent())?.trim() ?? "";
  }

  async hasCompletedStatus(): Promise<boolean> {
    return await this.completedStatusBadge.isVisible();
  }

  async getExerciseCount(): Promise<number> {
    await this.exercisesList.waitFor({ state: "visible", timeout: 10000 });
    const cards = this.exercisesList.locator("div.rounded-lg.border");
    return await cards.count();
  }
}
