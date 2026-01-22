import { Page, Locator } from '@playwright/test';

/**
 * Example Page Object Model class
 * 
 * Guidelines:
 * - Encapsulate page-specific logic and selectors
 * - Use locators for element selection
 * - Provide methods for common interactions
 */
export class ExamplePage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto('/');
  }

  async getHeadingText() {
    return await this.heading.textContent();
  }
}
