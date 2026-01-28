import { test, expect } from "@playwright/test";
import { LoginPage, ResetPasswordPage } from "../pages";
import { getTestUserCredentials } from "../fixtures";

/**
 * E2E tests for password reset flow (TC-AUTH-003)
 *
 * Kolejność testów:
 * 1. Najprostszy: tylko /login → "Nie pamiętasz hasła?" → /reset-password (bez maila, bez /confirm).
 * 2. Request link: wpisanie emaila, toast "Sprawdź skrzynkę" (wymaga E2E_USERNAME/E2E_PASSWORD).
 *
 * Requirements:
 * - .env.test: E2E_USERNAME, E2E_PASSWORD (for test 2)
 */
test.describe.serial("Reset password E2E", () => {
  // Test 1 – najprostszy, bez maila i bez /reset-password/confirm. Uruchamiany jako pierwszy.
  test('1. login → "Nie pamiętasz hasła?" → /reset-password (bez linka z maila)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.waitForForm();

    // Link może być przechwytywany przez router – weryfikujemy jego obecność, potem nawigujemy
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toHaveAttribute(
      "href",
      "/reset-password",
    );
    await page.goto("/reset-password");
    await expect(page).not.toHaveURL(/\/reset-password\/confirm/);

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.waitForForm();
    await expect(resetPasswordPage.form).toBeVisible();
    await expect(resetPasswordPage.emailInput).toBeVisible();
    await expect(resetPasswordPage.submitButton).toHaveText(
      "Wyślij link resetujący",
    );
  });

  test("2. request reset link and show success message", async ({ page }) => {
    let credentials;
    try {
      credentials = getTestUserCredentials();
    } catch {
      test.skip(true, "E2E_USERNAME and E2E_PASSWORD required in .env.test");
      return;
    }

    // Stub Supabase /recover – unikamy rate limitu i nie wysyłamy maili w E2E.
    // Uwaga: to cross-origin fetch do Supabase, więc musimy zwrócić CORS headers
    // i obsłużyć preflight OPTIONS, inaczej przeglądarka zablokuje response (Failed to fetch).
    await page.route("**/auth/v1/recover**", async (route) => {
      const request = route.request();
      const method = request.method();

      const requestOrigin =
        request.headers()["origin"] ?? "http://localhost:3000";
      const requestHeaders =
        request.headers()["access-control-request-headers"] ??
        "apikey,authorization,content-type";

      const corsHeaders = {
        "access-control-allow-origin": requestOrigin,
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": requestHeaders,
        "content-type": "application/json",
      };

      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
        return;
      }

      if (method === "POST") {
        await route.fulfill({ status: 200, headers: corsHeaders, body: "{}" });
        return;
      }

      await route.continue();
    });

    const loginPage = new LoginPage(page);
    const resetPasswordPage = new ResetPasswordPage(page);

    await loginPage.goto();
    await loginPage.waitForForm();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toHaveAttribute(
      "href",
      "/reset-password",
    );
    await page.goto("/reset-password");
    await resetPasswordPage.waitForForm();

    await resetPasswordPage.requestReset(credentials.email);

    // Po sukcesie formularz jest zastępowany blokiem sukcesu – czekaj na kontener
    const successBlock = page.locator(
      '[data-test-id="reset-password-success"]',
    );
    await expect(successBlock).toBeVisible({ timeout: 15000 });
    await expect(successBlock).toContainText(/sprawdź swoją skrzynkę email/i);
  });
});
