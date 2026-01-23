import { Page, Locator } from '@playwright/test';

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
    this.addExerciseButton = page.locator('[data-test-id="add-exercise-button"]');
  }

  /**
   * Navigate to exercises page
   */
  async goto() {
    await this.page.goto('/exercises');
  }

  /**
   * Wait for exercises list to be visible
   */
  async waitForList() {
    await this.exercisesList.waitFor({ state: 'visible' });
  }

  /**
   * Wait for empty state to be visible
   */
  async waitForEmptyState() {
    await this.emptyState.waitFor({ state: 'visible' });
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
   */
  async clickAddExercise() {
    await this.addExerciseButton.click();
  }

  /**
   * Wait for navigation to add exercise page
   */
  async waitForAddExerciseNavigation() {
    await this.page.waitForURL('**/exercises/new');
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
}
