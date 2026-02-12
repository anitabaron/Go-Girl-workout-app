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
  readonly skipExerciseLabel: Locator;
  readonly currentExerciseTitle: Locator;

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
    this.skipExerciseLabel = page.locator('label[for="is_skipped"]');
    this.currentExerciseTitle = page
      .locator('[data-page="workout-active"] h2')
      .first();
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
    await this.currentExerciseTitle.waitFor({ state: "visible", timeout });
    await this.page.waitForFunction(
      ({ selector, expected }) => {
        const el = document.querySelector(selector);
        return (el?.textContent ?? "").trim() === expected;
      },
      {
        selector: '[data-page="workout-active"] h2',
        expected: title,
      },
      { timeout },
    );
  }

  async setRepsForSet(setNumber: number, reps: number) {
    const repsInput = await this.getEditableInput(`#reps-${setNumber}`);
    await repsInput.fill(String(reps));
  }

  async getRepsForSet(setNumber: number): Promise<string> {
    const repsInput = await this.getEditableInput(`#reps-${setNumber}`);
    return await repsInput.inputValue();
  }

  async setDurationForSet(setNumber: number, durationSeconds: number) {
    const durationInput = await this.getEditableInput(`#duration-${setNumber}`);
    await durationInput.fill(String(durationSeconds));
  }

  async setExerciseSkipped(skipped: boolean) {
    await this.skipExerciseCheckbox.waitFor({ state: "visible", timeout: 10000 });
    const currentState = await this.skipExerciseCheckbox.isChecked();
    if (currentState === skipped) return;

    await this.skipExerciseLabel.click();
    await this.page.waitForFunction(
      ({ expected }) => {
        const el = document.querySelector("#is_skipped") as
          | HTMLInputElement
          | null;
        return Boolean(el && el.checked === expected);
      },
      { expected: skipped },
    );
  }

  async toggleExerciseSkipped() {
    await this.skipExerciseLabel.waitFor({ state: "visible", timeout: 10000 });
    await this.skipExerciseLabel.click();
  }

  private async getEditableInput(selector: string): Promise<Locator> {
    const candidates = this.page.locator(selector);
    await candidates.first().waitFor({ state: "visible", timeout: 10000 });

    const count = await candidates.count();
    for (let i = 0; i < count; i++) {
      const input = candidates.nth(i);
      if ((await input.isVisible()) && (await input.isEnabled())) {
        return input;
      }
    }

    return candidates.first();
  }
}
