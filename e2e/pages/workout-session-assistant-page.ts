import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Workout Session Assistant Page
 *
 * Encapsulates /workout-sessions/[id]/active - training assistant with exercise navigation
 */
export class WorkoutSessionAssistantPage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;
  readonly timerOkButton: Locator;
  readonly timerSkipBreakButton: Locator;
  readonly skipExerciseCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigation = page.locator(
      '[data-test-id="workout-assistant-navigation"]',
    );
    this.previousButton = this.navigation.locator("button").nth(0);
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
    this.skipExerciseCheckbox = page.locator("#is_skipped");
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

  async clickPrevious() {
    await this.previousButton.waitFor({ state: "visible", timeout: 10000 });
    await this.previousButton.click();
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

  async waitForExerciseTitle(title: string, timeout = 10000) {
    await this.page
      .getByRole("heading", { level: 2, name: title })
      .waitFor({ state: "visible", timeout });
  }

  async setRepsForSet(setNumber: number, reps: number) {
    const repsInput = this.page.locator(`#reps-${setNumber}`);
    await repsInput.waitFor({ state: "visible", timeout: 10000 });
    await repsInput.fill(String(reps));
  }

  async getRepsForSet(setNumber: number): Promise<string> {
    const repsInput = this.page.locator(`#reps-${setNumber}`);
    await repsInput.waitFor({ state: "visible", timeout: 10000 });
    return await repsInput.inputValue();
  }

  async setDurationForSet(setNumber: number, durationSeconds: number) {
    const durationInput = this.page.locator(`#duration-${setNumber}`);
    await durationInput.waitFor({ state: "visible", timeout: 10000 });
    await durationInput.fill(String(durationSeconds));
  }

  async setExerciseSkipped(skipped: boolean) {
    await this.skipExerciseCheckbox.waitFor({ state: "visible", timeout: 10000 });
    const currentState =
      (await this.skipExerciseCheckbox.getAttribute("data-state")) ===
      "checked";
    if (currentState !== skipped) {
      await this.skipExerciseCheckbox.click();
    }
  }
}
