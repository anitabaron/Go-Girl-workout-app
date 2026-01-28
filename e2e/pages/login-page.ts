import { Page, Locator } from "@playwright/test";

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
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="login-form"]');
    this.emailInput = page.locator('[data-test-id="login-email-input"]');
    this.passwordInput = page.locator('[data-test-id="login-password-input"]');
    this.rememberMeCheckbox = page.locator(
      '[data-test-id="login-remember-me-checkbox"]',
    );
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
   * Toggle remember me checkbox
   */
  async toggleRememberMe(checked: boolean = true) {
    const isChecked = await this.rememberMeCheckbox.isChecked();
    if (isChecked !== checked) {
      await this.rememberMeCheckbox.click();
    }
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
  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    if (rememberMe) {
      await this.toggleRememberMe(true);
    }
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
    return text?.includes("Logowanie...") ?? false;
  }
}
