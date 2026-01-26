import { Page, type Cookie } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "node:path";
import { LoginPage } from "../pages/login-page";

/**
 * Load environment variables from .env.test file
 */
config({ path: resolve(process.cwd(), ".env.test") });

/**
 * Test user credentials from environment variables
 */
export interface TestUserCredentials {
  email: string;
  password: string;
  userId?: string;
}

/**
 * Get test user credentials from environment variables
 *
 * @returns Test user credentials
 * @throws Error if required environment variables are not set
 */
export function getTestUserCredentials(): TestUserCredentials {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const userId = process.env.E2E_USERNAME_ID;

  if (!email || !password) {
    throw new Error(
      "Missing required environment variables: E2E_USERNAME and E2E_PASSWORD must be set in .env.test",
    );
  }

  return {
    email,
    password,
    userId: userId || undefined,
  };
}

/**
 * Authenticate user in the application
 *
 * This function performs a complete login flow:
 * 1. Navigates to login page
 * 2. Fills email and password
 * 3. Submits the form
 * 4. Waits for navigation to complete
 *
 * @param page - Playwright Page object
 * @param email - User email (optional, uses E2E_USERNAME from env if not provided)
 * @param password - User password (optional, uses E2E_PASSWORD from env if not provided)
 * @param rememberMe - Whether to check "Remember me" checkbox (default: false)
 * @returns Promise that resolves when authentication is complete
 */
export async function authenticateUser(
  page: Page,
  email?: string,
  password?: string,
  rememberMe: boolean = false,
): Promise<void> {
  const credentials = getTestUserCredentials();
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.waitForForm();
  await loginPage.login(
    email || credentials.email,
    password || credentials.password,
    rememberMe,
  );

  // Wait for navigation after login (should redirect to home page "/" or exercises)
  // Using more flexible approach - wait for URL to not be login page
  await page.waitForFunction(
    () => !globalThis.location.pathname.includes("/login"),
    { timeout: 15000 },
  );

  // Additional check - verify we're on a valid page (not login)
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      "Login failed - still on login page after authentication attempt",
    );
  }
}

/**
 * Logout user from the application
 *
 * This function performs logout by:
 * 1. Finding and clicking logout button (if exists in navigation)
 * 2. Waiting for navigation to login page
 *
 * Note: This assumes there's a logout button in the navigation.
 * If the logout mechanism is different, this function should be updated.
 *
 * @param page - Playwright Page object
 * @returns Promise that resolves when logout is complete
 */
export async function logout(page: Page): Promise<void> {
  // Try to find logout button - this may vary based on your navigation structure
  // Common selectors: button with text "Wyloguj", "Logout", or data-test-id
  const logoutButton = page
    .getByRole("button", { name: /wyloguj|logout/i })
    .or(page.locator('[data-test-id="logout-button"]'))
    .first();

  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 5000 });
  } else {
    // If no logout button found, navigate directly to logout endpoint or clear cookies
    // For Supabase, we might need to clear cookies or navigate to a logout route
    await page.context().clearCookies();
    await page.goto("/login");
  }
}

/**
 * Check if user is authenticated
 *
 * @param page - Playwright Page object
 * @returns Promise<boolean> - true if user appears to be authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check if we're on a protected route (not on login/register pages)
  const currentUrl = page.url();
  const isOnAuthPage = /^\/(login|register|reset-password)/.test(
    new URL(currentUrl).pathname,
  );

  if (isOnAuthPage) {
    return false;
  }

  // Try to navigate to a protected route and see if we get redirected
  try {
    const response = await page.goto("/exercises", {
      waitUntil: "networkidle",
    });
    const finalUrl = page.url();
    const wasRedirectedToLogin = finalUrl.includes("/login");

    return !wasRedirectedToLogin && response?.status() !== 401;
  } catch {
    return false;
  }
}

/**
 * Get authentication cookies
 *
 * Useful for reusing authentication state across tests or browser contexts
 *
 * @param page - Playwright Page object
 * @returns Array of cookies
 */
export async function getAuthCookies(page: Page): Promise<Cookie[]> {
  return await page.context().cookies();
}

/**
 * Set authentication cookies
 *
 * Useful for reusing authentication state across tests or browser contexts
 *
 * @param page - Playwright Page object
 * @param cookies - Array of cookies to set
 */
export async function setAuthCookies(
  page: Page,
  cookies: Cookie[],
): Promise<void> {
  await page.context().addCookies(cookies);
}
