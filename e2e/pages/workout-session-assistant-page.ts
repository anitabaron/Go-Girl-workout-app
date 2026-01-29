import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Workout Session Assistant Page
 *
 * Encapsulates /workout-sessions/[id]/active - training assistant with exercise navigation
 */
export class WorkoutSessionAssistantPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.locator(
      '[data-test-id="workout-assistant-navigation"]',
    );
    this.nextButton = page.locator(
      '[data-test-id="workout-assistant-next-button"]',
    );
    this.skipButton = page.locator(
      '[data-test-id="workout-assistant-skip-button"]',
    );
  }

  async waitForAssistant(timeout = 30000) {
    await this.navigation.waitFor({ state: "visible", timeout });
  }

  async clickNext() {
    await this.nextButton.waitFor({ state: "visible", timeout: 10000 });
    await this.nextButton.click();
  }

  async clickSkip() {
    await this.skipButton.waitFor({ state: "visible", timeout: 10000 });
    await this.skipButton.click();
  }
}
