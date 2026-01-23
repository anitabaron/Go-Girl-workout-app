import { test, expect } from '@playwright/test';

/**
 * Example E2E test using Playwright
 * 
 * Guidelines:
 * - Use Page Object Model for maintainable tests
 * - Use locators for resilient element selection
 * - Leverage auto-waiting features
 * - Use browser contexts for isolating test environments
 */
test.describe('Example E2E Test', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Use specific matchers for assertions
    await expect(page).toHaveTitle(/Go Girl Workout/i);
  });
});
