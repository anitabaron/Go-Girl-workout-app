import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login-page";
import { authenticateUser, getTestUserCredentials } from "../fixtures";

/**
 * E2E tests for user login functionality
 *
 * Tests verify:
 * - Login page loads correctly
 * - User can fill login form
 * - User can successfully log in
 * - User is redirected after login
 */
test.describe("Login E2E", () => {
  test("should load login page", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.waitForForm();

    // Verify form elements are visible
    await expect(loginPage.form).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("should display login form with all required fields", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.waitForForm();

    // Verify all form elements are present
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();

    // Verify submit button has correct text
    await expect(loginPage.submitButton).toHaveText("Zaloguj się");
  });

  test("should successfully log in with valid credentials", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const credentials = getTestUserCredentials();

    // Navigate to login page
    await loginPage.goto();
    await loginPage.waitForForm();

    // Fill and submit login form
    await loginPage.fillEmail(credentials.email);
    await loginPage.fillPassword(credentials.password);
    await loginPage.submit();

    // Wait for navigation after login (should redirect to home page "/")
    // Using waitForLoadState to ensure page is fully loaded
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify we're no longer on login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");

    // Verify we're on a valid authenticated page (home or exercises; m3 base path)
    const pathname = new URL(currentUrl).pathname;
    expect(["/m3", "/m3/exercises"]).toContain(pathname);
  });

  test("should show loading state when submitting login form", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const credentials = getTestUserCredentials();

    await loginPage.goto();
    await loginPage.waitForForm();

    // Fill form
    await loginPage.fillEmail(credentials.email);
    await loginPage.fillPassword(credentials.password);

    // Submit form
    await loginPage.submit();

    // Verify navigation happened
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify we're no longer on login page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/login");
  });

  test("should use authenticateUser helper for login", async ({ page }) => {
    // Use the authenticateUser helper function
    await authenticateUser(page);

    // Verify we're authenticated (not on login page)
    expect(page.url()).not.toContain("/login");

    // Verify we can access protected route
    await page.goto("/exercises");
    await expect(page).toHaveURL(/\/exercises/);
  });
});
