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
  readonly timerOkButton: Locator;
  readonly timerSkipBreakButton: Locator;

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
    this.timerOkButton = page.locator('[data-test-id="timer-ok-button"]');
    this.timerSkipBreakButton = page.locator(
      '[data-test-id="timer-skip-break-button"]',
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

  /** Click OK button on timer (RepsDisplay or SetCountdownTimer) */
  async clickTimerOk() {
    await this.timerOkButton.waitFor({ state: "visible", timeout: 10000 });
    await this.timerOkButton.click();
  }

  /** Click Pomiń przerwę button on rest timer */
  async clickTimerSkipBreak() {
    await this.timerSkipBreakButton.waitFor({
      state: "visible",
      timeout: 10000,
    });
    await this.timerSkipBreakButton.click();
  }

  /**
   * Click whichever timer button is visible (OK or Skip break).
   * Use when the first screen may be either RepsDisplay/SetCountdown or rest timer.
   */
  async clickVisibleTimerButton() {
    const okOrSkip = this.timerOkButton.or(this.timerSkipBreakButton);
    await okOrSkip.waitFor({ state: "visible", timeout: 10000 });
    await okOrSkip.click();
  }
}
