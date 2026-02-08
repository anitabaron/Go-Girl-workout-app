import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Exercises List Page
 *
 * Encapsulates exercises list page logic and selectors using data-test-id attributes
 */
export class ExercisesPage {
  readonly page: Page;
  readonly exercisesList: Locator;
  readonly emptyState: Locator;
  readonly noResults: Locator;
  readonly addExerciseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exercisesList = page.locator('[data-test-id="exercises-list"]');
    this.emptyState = page.locator('[data-test-id="exercises-empty-state"]');
    this.noResults = page.locator('[data-test-id="exercises-no-results"]');
    // Add exercise button can be FAB (mobile) or regular button (desktop)
    // Use .first() to get the visible one (only one is visible at a time)
    this.addExerciseButton = page
      .locator('[data-test-id="add-exercise-button"]')
      .first();
  }

  /**
   * Navigate to exercises page (main app path).
   */
  async goto() {
    await this.page.goto("/exercises");
  }

  /**
   * Wait for exercises list to be visible
   */
  async waitForList(timeout: number = 30000) {
    await this.exercisesList.waitFor({ state: "visible", timeout });
  }

  /**
   * Wait for empty state to be visible
   */
  async waitForEmptyState() {
    await this.emptyState.waitFor({ state: "visible" });
  }

  /**
   * Check if exercises list is visible
   */
  async isListVisible(): Promise<boolean> {
    return await this.exercisesList.isVisible();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get exercise card by exercise ID
   */
  getExerciseCard(exerciseId: string): Locator {
    return this.page.locator(`[data-test-id="exercise-card-${exerciseId}"]`);
  }

  /**
   * Get all exercise cards
   */
  getAllExerciseCards(): Locator {
    return this.page.locator('[data-test-id^="exercise-card-"]');
  }

  /**
   * Get count of visible exercise cards
   */
  async getExerciseCount(): Promise<number> {
    return await this.getAllExerciseCards().count();
  }

  /**
   * Click add exercise button
   * Waits for button to be visible and clickable before clicking
   * Handles both FAB (mobile) and regular button (desktop) variants
   */
  async clickAddExercise() {
    // Primary: data-test-id (works for both M3 and legacy)
    const addButton = this.page.locator('[data-test-id="add-exercise-button"]');
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await this.page.waitForURL("**/exercises/new", { timeout: 10000 });
      return;
    }

    // Fallback: href (main app uses /exercises/new)
    const allLinks = this.page.locator('a[href="/exercises/new"]');
    const count = await allLinks.count();
    for (let i = 0; i < count; i++) {
      const link = allLinks.nth(i);
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await this.page.waitForURL("**/exercises/new", { timeout: 10000 });
        return;
      }
    }

    // Last resort: role + text (legacy: "Dodaj ćwiczenie", M3: "Add exercise")
    const linkByRole = this.page.getByRole("link", {
      name: /dodaj|add exercise/i,
    });
    if (await linkByRole.isVisible().catch(() => false)) {
      await linkByRole.first().click();
      await this.page.waitForURL("**/exercises/new", { timeout: 10000 });
      return;
    }

    throw new Error('Could not find visible "Add Exercise" button');
  }

  /**
   * Wait for navigation to add exercise page
   */
  async waitForAddExerciseNavigation() {
    await this.page.waitForURL("**/exercises/new");
  }

  /**
   * Check if exercise with given title exists in the list
   */
  async hasExerciseWithTitle(title: string): Promise<boolean> {
    const cards = this.getAllExerciseCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cardText = await card.textContent();
      if (cardText?.includes(title)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get exercise card by title (returns first match)
   */
  async getExerciseCardByTitle(title: string): Promise<Locator | null> {
    const cards = this.getAllExerciseCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cardText = await card.textContent();
      if (cardText?.includes(title)) {
        return card;
      }
    }

    return null;
  }

  /**
   * Get exercise ID from card by title
   * Extracts the ID from the data-test-id attribute: "exercise-card-{id}"
   */
  async getExerciseIdByTitle(title: string): Promise<string | null> {
    const card = await this.getExerciseCardByTitle(title);
    if (!card) {
      return null;
    }

    const testId = await card.getAttribute("data-test-id");
    if (!testId) {
      return null;
    }

    // Extract ID from "exercise-card-{id}"
    const match = testId.match(/^exercise-card-(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Click edit button on exercise card by title
   * Hovers over the card first to make the edit button visible
   */
  async clickEditExerciseByTitle(title: string) {
    const card = await this.getExerciseCardByTitle(title);
    if (!card) {
      throw new Error(`Exercise with title "${title}" not found`);
    }

    // Hover over the card to make action buttons visible
    await card.hover();

    // Wait a bit for the hover state to apply
    await this.page.waitForTimeout(100);

    // Find the edit button by aria-label
    // Legacy: "Edytuj ćwiczenie: {title}", M3: "Edit exercise: {title}"
    const allButtons = this.page.getByRole("button");
    const count = await allButtons.count();

    let editButton: Locator | null = null;
    for (let i = 0; i < count; i++) {
      const button = allButtons.nth(i);
      const ariaLabel = await button.getAttribute("aria-label");
      const isEditButton =
        ariaLabel?.includes(title) &&
        (ariaLabel.includes("Edytuj ćwiczenie:") ||
          ariaLabel.includes("Edit exercise:"));
      if (isEditButton) {
        editButton = button;
        break;
      }
    }

    if (!editButton) {
      throw new Error(`Edit button for exercise "${title}" not found`);
    }

    // Wait for button to be visible (it should be visible after hover)
    await editButton.waitFor({ state: "visible", timeout: 5000 });

    // Click the edit button
    await editButton.click();

    // Wait for navigation to edit page
    await this.page.waitForURL(/\/exercises\/[^/]+\/edit/, { timeout: 10000 });
  }
}
