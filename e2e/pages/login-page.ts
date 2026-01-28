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
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-test-id="login-form"]');
    this.emailInput = page.locator('[data-test-id="login-email-input"]');
    this.passwordInput = page.locator('[data-test-id="login-password-input"]');
    this.rememberMeCheckbox = page.locator(
      '[data-test-id="login-remember-me-checkbox"]',
    );
    this.submitButton = page.locator('[data-test-id="login-submit-button"]');
    this.forgotPasswordLink = page.locator(
      '[data-test-id="login-forgot-password-link"]',
    );
  }

  /**
   * Click "Nie pamiętasz hasła?" link to go to reset password page.
   * Scrolls into view and uses force to avoid overlay issues; triggers full navigation.
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.scrollIntoViewIfNeeded();
    await this.forgotPasswordLink.click({ force: true });
  }

  /**
   * Navigate to login page.
   * Fails fast with a clear error if the server returns 404 (e.g. dev server not running).
   */
  async goto() {
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });
    const notFound = this.page.getByRole("heading", { name: "404" });
    if (await notFound.isVisible().catch(() => false)) {
      throw new Error(
        "Login page returned 404. Ensure the dev server is running at baseURL (e.g. pnpm dev) and /login route exists.",
      );
    }
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
