import { Page, Locator } from "@playwright/test";
import { getExercisePartLabelMatcher } from "./i18n-labels";

/**
 * Page Object Model for Workout Plan Form Page (Create/Edit)
 *
 * Encapsulates workout plan form page logic and selectors using data-test-id attributes
 */
export class WorkoutPlanFormPage {
  readonly page: Page;
  readonly form: Locator;
  readonly nameInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly partSelect: Locator;
  readonly addExerciseButton: Locator;
  readonly exercisesList: Locator;
  readonly exercisesEmpty: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="workout-plan-form"]');
    this.nameInput = page.locator('[data-test-id="workout-plan-form-name"]');
    this.descriptionTextarea = page.locator(
      '[data-test-id="workout-plan-form-description"]',
    );
    this.partSelect = page.locator('[data-test-id="workout-plan-form-part"]');
    this.addExerciseButton = page.locator(
      '[data-test-id="workout-plan-form-add-exercise-button"]',
    );
    this.exercisesList = page.locator(
      '[data-test-id="workout-plan-form-exercises-list"]',
    );
    this.exercisesEmpty = page.locator(
      '[data-test-id="workout-plan-form-exercises-empty"]',
    );
    this.saveButton = page.locator(
      '[data-test-id="workout-plan-form-save-button"]',
    );
    this.cancelButton = page.locator(
      '[data-test-id="workout-plan-form-cancel-button"]',
    );
  }

  /**
   * Navigate to create workout plan page
   */
  async gotoCreate() {
    await this.page.goto("/workout-plans/new");
  }

  /**
   * Navigate to edit workout plan page
   */
  async gotoEdit(planId: string) {
    await this.page.goto(`/workout-plans/${planId}/edit`);
  }

  /**
   * Wait for form to be visible
   * Ensures navigation completed and client component hydrated
   */
  async waitForForm(timeout = 15000) {
    // Ensure we're on the create/edit plan page
    await this.page.waitForURL(/\/workout-plans\/(new|[^/]+\/edit)/, {
      timeout,
    });
    await this.page.waitForLoadState("domcontentloaded");
    // Form or name input (both indicate form is ready)
    await Promise.race([
      this.form.waitFor({ state: "visible", timeout }),
      this.nameInput.waitFor({ state: "visible", timeout }),
    ]);
  }

  /**
   * Fill name field
   */
  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  /**
   * Fill description field
   */
  async fillDescription(description: string) {
    await this.descriptionTextarea.fill(description);
  }

  /**
   * Select part from dropdown
   */
  async selectPart(part: string) {
    await this.partSelect.click();
    // Wait for dropdown to open and use getByRole for better reliability
    if (part === "none" || part === "") {
      await this.page
        .getByRole("option", { name: getExercisePartLabelMatcher(part) })
        .waitFor({ state: "visible", timeout: 5000 });
      await this.page
        .getByRole("option", { name: getExercisePartLabelMatcher(part) })
        .click();
    } else {
      await this.page
        .getByRole("option", { name: getExercisePartLabelMatcher(part) })
        .waitFor({ state: "visible", timeout: 5000 });
      await this.page
        .getByRole("option", { name: getExercisePartLabelMatcher(part) })
        .click();
    }
  }

  /**
   * Click add exercise button
   */
  async clickAddExercise() {
    await this.addExerciseButton.waitFor({ state: "visible", timeout: 10000 });
    await this.addExerciseButton.click();
    // Wait for dialog to open
    await this.page
      .locator('[data-test-id="workout-plan-form-add-exercise-dialog"]')
      .waitFor({ state: "visible", timeout: 5000 });
  }

  /**
   * Wait for add exercise dialog to be visible
   */
  async waitForAddExerciseDialog() {
    await this.page
      .locator('[data-test-id="workout-plan-form-add-exercise-dialog"]')
      .waitFor({ state: "visible" });
  }

  /**
   * Select exercise in the dialog by title
   */
  async selectExerciseInDialog(exerciseTitle: string) {
    // Wait for exercise selector to load
    await this.page.waitForLoadState("networkidle");

    // Wait for loader to disappear (exercises are loading)
    const loader = this.page.locator('svg[class*="animate-spin"]').first();
    try {
      await loader.waitFor({ state: "hidden", timeout: 5000 });
    } catch {
      // Loader might not be visible if exercises loaded quickly
    }

    // Wait for at least one exercise card to appear (indicates exercises are loaded)
    // Cards are rendered as Card components with data-test-id
    const exerciseCard = this.page
      .locator('[data-test-id="exercise-selector-card"]')
      .first();
    await exerciseCard.waitFor({ state: "visible", timeout: 30000 }); // Increased for CI pipeline

    // Additional wait for exercises to fully render
    await this.page.waitForTimeout(300);

    // Find the exercise by title text
    // The exercise selector shows cards with checkboxes - clicking the card toggles selection
    const titleLocator = this.page
      .getByText(exerciseTitle, { exact: false })
      .first();

    // Wait for the title to be visible
    await titleLocator.waitFor({ state: "visible", timeout: 30000 }); // Increased for CI pipeline

    // Try to find the checkbox first (more reliable)
    // The checkbox should be near the title in the same card
    const allCheckboxes = this.page.locator('input[type="checkbox"]');
    const checkboxCount = await allCheckboxes.count();

    // Find checkbox that's in the same card as the title
    let selectedCheckbox: Locator | null = null;
    for (let i = 0; i < checkboxCount; i++) {
      const checkbox = allCheckboxes.nth(i);
      // Get the card containing this checkbox
      const card = checkbox.locator("..").locator("..");
      const cardText = await card.textContent();
      if (cardText?.includes(exerciseTitle)) {
        selectedCheckbox = checkbox;
        break;
      }
    }

    if (selectedCheckbox) {
      // Check if already selected
      const isChecked = await selectedCheckbox.isChecked().catch(() => false);
      if (!isChecked) {
        await selectedCheckbox.click();
      }
    } else {
      // Fallback: click on the title text - the card has onClick handler
      await titleLocator.click();
    }

    // Wait a bit for the selection to register
    await this.page.waitForTimeout(300);
  }

  /**
   * Confirm adding exercises in the dialog
   */
  async confirmAddExercises() {
    const confirmButton = this.page.locator(
      '[data-test-id="workout-plan-form-add-exercise-dialog-confirm"]',
    );
    await confirmButton.waitFor({ state: "visible", timeout: 5000 });
    await confirmButton.click();
    // Wait for dialog to close
    await this.page
      .locator('[data-test-id="workout-plan-form-add-exercise-dialog"]')
      .waitFor({ state: "hidden", timeout: 5000 });
  }

  /**
   * Add exercise to plan (opens dialog, selects exercise, confirms)
   */
  async addExercise(exerciseTitle: string) {
    await this.clickAddExercise();
    await this.waitForAddExerciseDialog();
    await this.selectExerciseInDialog(exerciseTitle);
    await this.confirmAddExercises();
    // Wait for exercise to appear in the list
    await this.page.waitForTimeout(500); // Small delay for state update
  }

  /**
   * Add multiple exercises to plan
   */
  async addExercises(exerciseTitles: string[]) {
    await this.clickAddExercise();
    await this.waitForAddExerciseDialog();

    for (const title of exerciseTitles) {
      await this.selectExerciseInDialog(title);
    }

    await this.confirmAddExercises();
    // Wait for exercises to appear in the list
    await this.page.waitForTimeout(500); // Small delay for state update
  }

  /**
   * Check if exercises list is visible
   */
  async isExercisesListVisible(): Promise<boolean> {
    return await this.exercisesList.isVisible();
  }

  /**
   * Check if exercises empty state is visible
   */
  async isExercisesEmptyVisible(): Promise<boolean> {
    return await this.exercisesEmpty.isVisible();
  }

  /**
   * Get count of exercises in the plan
   */
  async getExerciseCount(): Promise<number> {
    if (await this.isExercisesEmptyVisible()) {
      return 0;
    }
    // Count exercise items in the list
    const exerciseItems = this.exercisesList.locator(
      '[data-test-id^="workout-plan-exercise-item-"]',
    );
    return await exerciseItems.count();
  }

  /**
   * Click save button
   */
  async clickSave() {
    await this.saveButton.click();
  }

  /**
   * Click cancel button
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Check if save button is in loading state
   */
  async isSaving(): Promise<boolean> {
    const text = await this.saveButton.textContent();
    return text?.includes("Zapisywanie...") ?? false;
  }

  /**
   * Wait for navigation after save (redirects to /workout-plans list)
   * After both create and edit: redirects to /workout-plans (list)
   *
   * Uses increased timeout and waits for networkidle to ensure page is fully loaded
   * Also checks for error states that might prevent navigation
   */
  async waitForSaveNavigation() {
    // First, wait a bit for the save operation to complete
    await this.page.waitForTimeout(1000);

    // Check if we're already on the target URL
    const currentUrl = this.page.url();
    if (currentUrl.match(/\/workout-plans\/?$/)) {
      await this.page.waitForLoadState("networkidle", { timeout: 30000 });
      return;
    }

    // Wait for URL to change to /workout-plans (with or without trailing slash)
    // Use waitUntil: 'load' to ensure the page is fully loaded
    await this.page.waitForURL(/\/workout-plans\/?$/, {
      timeout: 30000,
      waitUntil: "load",
    });

    // Wait for network to be idle to ensure page is fully loaded
    await this.page.waitForLoadState("networkidle", { timeout: 30000 });
  }

  /**
   * Wait for navigation after cancel (should redirect to /workout-plans)
   */
  async waitForCancelNavigation() {
    await this.page.waitForURL("**/workout-plans", { timeout: 10000 });
  }

  /**
   * Fill complete form with required fields
   */
  async fillRequiredFields(data: {
    name: string;
    description?: string;
    part?: string;
  }) {
    await this.fillName(data.name);

    if (data.description) {
      await this.fillDescription(data.description);
    }

    if (data.part) {
      await this.selectPart(data.part);
    }
  }

  /**
   * Submit form (click save)
   */
  async submit() {
    await this.clickSave();
  }

  /**
   * Check if exercise with given title exists in the plan
   */
  async hasExercise(exerciseTitle: string): Promise<boolean> {
    // Get all exercise items
    const exerciseItems = this.exercisesList.locator(
      '[data-test-id^="workout-plan-exercise-item-"]',
    );
    const count = await exerciseItems.count();

    for (let i = 0; i < count; i++) {
      const item = exerciseItems.nth(i);
      const itemText = await item.textContent();
      if (itemText?.includes(exerciseTitle)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get exercise item by title
   */
  async getExerciseItemByTitle(exerciseTitle: string): Promise<Locator | null> {
    const exerciseItems = this.exercisesList.locator(
      '[data-test-id^="workout-plan-exercise-item-"]',
    );
    const count = await exerciseItems.count();

    for (let i = 0; i < count; i++) {
      const item = exerciseItems.nth(i);
      const itemText = await item.textContent();
      if (itemText?.includes(exerciseTitle)) {
        return item;
      }
    }

    return null;
  }

  /**
   * Update planned sets for an exercise by title
   */
  async updateExercisePlannedSets(exerciseTitle: string, sets: number) {
    const exerciseItem = await this.getExerciseItemByTitle(exerciseTitle);
    if (!exerciseItem) {
      throw new Error(
        `Exercise with title "${exerciseTitle}" not found in plan`,
      );
    }

    // Get the test ID of the exercise item
    const testId = await exerciseItem.getAttribute("data-test-id");
    if (!testId) {
      throw new Error(`Exercise item does not have data-test-id attribute`);
    }

    // Find the planned sets input within this exercise item
    const plannedSetsInput = exerciseItem.locator(
      `[data-test-id="${testId}-planned-sets"]`,
    );
    await plannedSetsInput.waitFor({ state: "visible", timeout: 5000 });
    await plannedSetsInput.fill(sets.toString());
  }

  /**
   * Remove exercise from plan by title
   */
  async removeExercise(exerciseTitle: string) {
    const exerciseItem = await this.getExerciseItemByTitle(exerciseTitle);
    if (!exerciseItem) {
      throw new Error(
        `Exercise with title "${exerciseTitle}" not found in plan`,
      );
    }

    // Get the test ID of the exercise item
    const testId = await exerciseItem.getAttribute("data-test-id");
    if (!testId) {
      throw new Error(`Exercise item does not have data-test-id attribute`);
    }

    // Find and click the remove button
    const removeButton = exerciseItem.locator(
      `[data-test-id="${testId}-remove-button"]`,
    );
    await removeButton.waitFor({ state: "visible", timeout: 5000 });
    await removeButton.click();

    // Wait a bit for the exercise to be removed
    await this.page.waitForTimeout(300);
  }
}
