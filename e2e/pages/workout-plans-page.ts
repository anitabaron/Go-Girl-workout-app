import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Workout Plans List Page
 *
 * Encapsulates workout plans list page logic and selectors using data-test-id attributes
 */
export class WorkoutPlansPage {
  readonly page: Page;
  readonly plansList: Locator;
  readonly emptyState: Locator;
  readonly createPlanButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.plansList = page.locator('[data-test-id="workout-plans-list"]');
    this.emptyState = page.locator(
      '[data-test-id="workout-plans-empty-state"]',
    );
    // Create plan button can be FAB (mobile) or regular button (desktop)
    // Use .first() to get the visible one (only one is visible at a time)
    this.createPlanButton = page
      .locator('[data-test-id="create-workout-plan-button"]')
      .first();
  }

  /**
   * Navigate to workout plans page
   */
  async goto() {
    await this.page.goto("/workout-plans");
  }

  /**
   * Wait for plans list to be visible
   * If list is not visible, waits for empty state instead
   * This handles the case where the page might show empty state initially
   */
  async waitForList(timeout: number = 30000) {
    // Wait for either list or empty state to be visible
    // Use Promise.race to wait for whichever appears first
    const listPromise = this.plansList
      .waitFor({ state: "visible", timeout })
      .catch(() => null);
    const emptyStatePromise = this.emptyState
      .waitFor({ state: "visible", timeout })
      .catch(() => null);

    const result = await Promise.race([listPromise, emptyStatePromise]);

    // If neither appeared, throw an error
    if (result === null) {
      throw new Error(
        `Neither plans list nor empty state appeared within ${timeout}ms timeout`,
      );
    }
  }

  /**
   * Wait for empty state to be visible
   */
  async waitForEmptyState() {
    await this.emptyState.waitFor({ state: "visible" });
  }

  /**
   * Check if plans list is visible
   */
  async isListVisible(): Promise<boolean> {
    return await this.plansList.isVisible();
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get workout plan card by plan ID
   */
  getPlanCard(planId: string): Locator {
    return this.page.locator(`[data-test-id="workout-plan-card-${planId}"]`);
  }

  /**
   * Get all workout plan cards
   */
  getAllPlanCards(): Locator {
    return this.page.locator('[data-test-id^="workout-plan-card-"]');
  }

  /**
   * Get count of visible plan cards
   */
  async getPlanCount(): Promise<number> {
    return await this.getAllPlanCards().count();
  }

  /**
   * Click create plan button
   * Waits for button to be visible and clickable before clicking
   * Handles both FAB (mobile) and regular button (desktop) variants
   */
  async clickCreatePlan() {
    // Primary: data-test-id (works for both M3 and legacy)
    const createButton = this.page.locator(
      '[data-test-id="create-workout-plan-button"]',
    );
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await this.page.waitForURL("**/workout-plans/new", { timeout: 10000 });
      return;
    }

    // Fallback: href (legacy uses /workout-plans/new, M3 uses /m3/workout-plans/new)
    const allLinks = this.page.locator(
      'a[href="/workout-plans/new"], a[href="/m3/workout-plans/new"]',
    );
    const count = await allLinks.count();
    for (let i = 0; i < count; i++) {
      const link = allLinks.nth(i);
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await this.page.waitForURL("**/workout-plans/new", { timeout: 10000 });
        return;
      }
    }

    // Last resort: role + text (legacy: "Utwórz plan", M3: "Create plan")
    const linkByRole = this.page.getByRole("link", {
      name: /utwórz plan|create plan/i,
    });
    if (await linkByRole.isVisible().catch(() => false)) {
      await linkByRole.first().click();
      await this.page.waitForURL("**/workout-plans/new", { timeout: 10000 });
      return;
    }

    throw new Error('Could not find visible "Create Plan" button');
  }

  /**
   * Wait for navigation to create plan page
   */
  async waitForCreatePlanNavigation() {
    await this.page.waitForURL("**/workout-plans/new");
  }

  /**
   * Check if plan with given name exists in the list
   */
  async hasPlanWithName(name: string): Promise<boolean> {
    const cards = this.getAllPlanCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // Wait for card to be visible before getting text content
      await card
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => null);
      const cardText = await card.textContent({ timeout: 10000 });
      if (cardText?.includes(name)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get plan card by name (returns first match)
   */
  async getPlanCardByName(name: string): Promise<Locator | null> {
    const cards = this.getAllPlanCards();
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      // Wait for card to be visible before getting text content
      await card
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => null);
      const cardText = await card.textContent({ timeout: 10000 });
      if (cardText?.includes(name)) {
        return card;
      }
    }

    return null;
  }

  /**
   * Get plan ID from card by name
   * Extracts the ID from the data-test-id attribute: "workout-plan-card-{id}"
   */
  async getPlanIdByName(name: string): Promise<string | null> {
    const card = await this.getPlanCardByName(name);
    if (!card) {
      return null;
    }

    const testId = await card.getAttribute("data-test-id");
    if (!testId) {
      return null;
    }

    // Extract ID from "workout-plan-card-{id}"
    const match = testId.match(/^workout-plan-card-(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Click edit button for plan by name
   * Works both from list page and details page
   * Finds the plan card by name (on list) or uses the edit button on details page
   */
  async clickEditPlanByName(planName: string) {
    // First check if we're on a details page (URL contains /workout-plans/{id})
    const currentUrl = this.page.url();
    const isDetailsPage = /\/workout-plans\/[^/]+$/.test(currentUrl);
    const escapedName = planName.replaceAll(
      /[.*+?^${}()|[\]\\]/g,
      String.raw`\$&`,
    );
    const editLabelPattern = new RegExp(
      `(?:Edytuj plan|Edit plan): ${escapedName}`,
    );

    if (isDetailsPage) {
      // On details page, use the edit button directly
      // M3 uses "Edit plan:", legacy uses "Edytuj plan:"
      const editButton = this.page.getByRole("button", {
        name: editLabelPattern,
      });
      await editButton.waitFor({ state: "visible", timeout: 5000 });
      await editButton.click();
    } else {
      // On list page, find the card and click edit button
      const card = await this.getPlanCardByName(planName);
      if (!card) {
        throw new Error(`Plan with name "${planName}" not found`);
      }

      // M3 cards hide action buttons until hover - scroll into view, then hover
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await this.page.waitForTimeout(500); // Wait for CSS transition (opacity 0→1)

      // The edit button is inside the card
      const editButton = card.getByRole("button", {
        name: editLabelPattern,
      });

      // Wait for button to be visible and clickable
      await editButton.waitFor({ state: "visible", timeout: 5000 });
      await editButton.click();
    }

    // Wait for navigation to edit page
    await this.page.waitForURL("**/workout-plans/*/edit", { timeout: 10000 });
  }
}
