import { Page, Locator } from "@playwright/test";
import { getAuthLabelMatcher } from "./i18n-labels";

/**
 * Page Object Model for Login Page
 *
 * Encapsulates login page logic and selectors using data-test-id attributes
 */
export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="login-form"]');
    this.emailInput = page.locator('[data-test-id="login-email-input"]');
    this.passwordInput = page.locator('[data-test-id="login-password-input"]');
    this.submitButton = page.locator('[data-test-id="login-submit-button"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill email input
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with email and password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Wait for form to be visible
   */
  async waitForForm() {
    await this.form.waitFor({ state: "visible" });
  }

  /**
   * Check if submit button is loading
   */
  async isSubmitting(): Promise<boolean> {
    const text = await this.submitButton.textContent();
    if (!text) return false;
    return getAuthLabelMatcher("loginSubmitting").test(text.trim());
  }
}
