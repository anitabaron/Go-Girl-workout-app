import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Exercise Form Page (Create/Edit)
 * 
 * Encapsulates exercise form page logic and selectors using data-test-id attributes
 */
export class ExerciseFormPage {
  readonly page: Page;
  readonly form: Locator;
  readonly titleInput: Locator;
  readonly typeSelect: Locator;
  readonly partSelect: Locator;
  readonly levelSelect: Locator;
  readonly detailsTextarea: Locator;
  readonly repsInput: Locator;
  readonly durationInput: Locator;
  readonly seriesInput: Locator;
  readonly restBetweenInput: Locator;
  readonly restAfterInput: Locator;
  readonly estimatedSetTimeInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="exercise-form"]');
    this.titleInput = page.locator('[data-test-id="exercise-form-title"]');
    this.typeSelect = page.locator('[data-test-id="exercise-form-type"]');
    this.partSelect = page.locator('[data-test-id="exercise-form-part"]');
    this.levelSelect = page.locator('[data-test-id="exercise-form-level"]');
    this.detailsTextarea = page.locator('[data-test-id="exercise-form-details"]');
    this.repsInput = page.locator('[data-test-id="exercise-form-reps"]');
    this.durationInput = page.locator('[data-test-id="exercise-form-duration"]');
    this.seriesInput = page.locator('[data-test-id="exercise-form-series"]');
    this.restBetweenInput = page.locator('[data-test-id="exercise-form-rest-between"]');
    this.restAfterInput = page.locator('[data-test-id="exercise-form-rest-after"]');
    this.estimatedSetTimeInput = page.locator('[data-test-id="exercise-form-estimated-set-time"]');
    this.saveButton = page.locator('[data-test-id="exercise-form-save-button"]');
    this.cancelButton = page.locator('[data-test-id="exercise-form-cancel-button"]');
  }

  /**
   * Navigate to create exercise page
   */
  async gotoCreate() {
    await this.page.goto('/exercises/new');
  }

  /**
   * Navigate to edit exercise page
   */
  async gotoEdit(exerciseId: string) {
    await this.page.goto(`/exercises/${exerciseId}/edit`);
  }

  /**
   * Wait for form to be visible
   */
  async waitForForm() {
    await this.form.waitFor({ state: 'visible' });
  }

  /**
   * Fill title field
   */
  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  /**
   * Select type from dropdown
   */
  async selectType(type: string) {
    await this.typeSelect.click();
    // Wait for dropdown to open and use getByRole for better reliability
    await this.page.getByRole('option', { name: type, exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await this.page.getByRole('option', { name: type, exact: true }).click();
  }

  /**
   * Select part from dropdown
   */
  async selectPart(part: string) {
    await this.partSelect.click();
    // Wait for dropdown to open and use getByRole for better reliability
    await this.page.getByRole('option', { name: part, exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await this.page.getByRole('option', { name: part, exact: true }).click();
  }

  /**
   * Select level from dropdown (optional)
   */
  async selectLevel(level: string) {
    await this.levelSelect.click();
    if (level === 'none' || level === '') {
      await this.page.locator('text=Brak').click();
    } else {
      await this.page.locator(`text=${level}`).click();
    }
  }

  /**
   * Fill details textarea
   */
  async fillDetails(details: string) {
    await this.detailsTextarea.fill(details);
  }

  /**
   * Fill reps field
   */
  async fillReps(reps: string | number) {
    await this.repsInput.fill(String(reps));
  }

  /**
   * Fill duration field (in seconds)
   */
  async fillDuration(seconds: string | number) {
    await this.durationInput.fill(String(seconds));
  }

  /**
   * Fill series field (required)
   */
  async fillSeries(series: string | number) {
    await this.seriesInput.fill(String(series));
  }

  /**
   * Fill rest between series field
   */
  async fillRestBetween(seconds: string | number) {
    await this.restBetweenInput.fill(String(seconds));
  }

  /**
   * Fill rest after series field
   */
  async fillRestAfter(seconds: string | number) {
    await this.restAfterInput.fill(String(seconds));
  }

  /**
   * Fill estimated set time field
   */
  async fillEstimatedSetTime(seconds: string | number) {
    await this.estimatedSetTimeInput.fill(String(seconds));
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
    return text?.includes('Zapisywanie...') ?? false;
  }

  /**
   * Wait for navigation after save (should redirect to /exercises)
   */
  async waitForSaveNavigation() {
    await this.page.waitForURL('**/exercises');
  }

  /**
   * Wait for navigation after cancel (should redirect to /exercises)
   */
  async waitForCancelNavigation() {
    await this.page.waitForURL('**/exercises');
  }

  /**
   * Fill complete form with required fields
   */
  async fillRequiredFields(data: {
    title: string;
    type: string;
    part: string;
    series: string | number;
    reps?: string | number;
    duration?: string | number;
    restBetween?: string | number;
    restAfter?: string | number;
  }) {
    await this.fillTitle(data.title);
    await this.selectType(data.type);
    await this.selectPart(data.part);
    await this.fillSeries(data.series);
    
    if (data.reps) {
      await this.fillReps(data.reps);
    }
    
    if (data.duration) {
      await this.fillDuration(data.duration);
    }
    
    if (data.restBetween) {
      await this.fillRestBetween(data.restBetween);
    }
    
    if (data.restAfter) {
      await this.fillRestAfter(data.restAfter);
    }
  }

  /**
   * Submit form (click save)
   */
  async submit() {
    await this.clickSave();
  }
}
