import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Reset Password (request) Page
 *
 * Encapsulates reset password request page logic and selectors.
 */
export class ResetPasswordPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="reset-password-form"]');
    this.emailInput = page.locator(
      '[data-test-id="reset-password-email-input"]',
    );
    this.submitButton = page.locator(
      '[data-test-id="reset-password-submit-button"]',
    );
  }

  async goto() {
    await this.page.goto('/reset-password');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submit() {
    await this.submitButton.click();
  }

  async requestReset(email: string) {
    await this.fillEmail(email);
    await this.submit();
  }

  async waitForForm() {
    await this.form.waitFor({ state: 'visible' });
  }
}
