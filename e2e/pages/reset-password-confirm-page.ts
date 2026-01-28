import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Reset Password Confirm Page (set new password)
 *
 * Encapsulates reset password confirm page logic and selectors.
 * Uses getByLabel for password fields (shared components).
 */
export class ResetPasswordConfirmPage {
  readonly page: Page;
  readonly form: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="reset-password-confirm-form"]');
    this.newPasswordInput = page.getByLabel("Hasło");
    this.confirmPasswordInput = page.getByLabel("Potwierdź hasło");
    this.submitButton = page.locator(
      '[data-test-id="reset-password-confirm-submit-button"]',
    );
  }

  async goto() {
    await this.page.goto("/reset-password/confirm");
  }

  async fillNewPassword(password: string) {
    await this.newPasswordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async setNewPassword(newPassword: string) {
    await this.fillNewPassword(newPassword);
    await this.fillConfirmPassword(newPassword);
    await this.submit();
  }

  /**
   * Wait until form is visible and token is validated (submit button enabled).
   * Longer timeout when token comes from hash (Supabase client needs time to process).
   */
  async waitForFormReady() {
    await this.form.waitFor({ state: "visible" });
    await expect(this.submitButton).toBeEnabled({ timeout: 20000 });
  }
}
