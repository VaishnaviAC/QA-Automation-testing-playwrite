import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model class for the AssetIQ Login page.
 *
 * In Cypress, you likely wrote helper functions in commands.js using cy.get().
 * In Playwright, we instead build a "class" for each page — the elements and
 * actions for that page live together in one place. This keeps things
 * organized and reusable across multiple test files.
 */
export class LoginPage {
  // 'readonly page' means this property is set once in the constructor
  // and never reassigned. This is a TypeScript safety feature that
  // Cypress (plain JS) doesn't have.
  readonly page: Page;

  // These are all "Locator" objects — not the actual element yet, but a
  // recipe for how to find it. Playwright re-evaluates the locator every
  // time an action (click/fill) is performed, so even if the page changes
  // (e.g. a React re-render) you won't get a stale element error.
  // This is different from Cypress's cy.get(), which you'd normally
  // re-call every time you needed the element again.
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signOutButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // getByRole is Playwright's most recommended locator strategy.
    // It targets elements by their accessibility role + accessible name
    // (what a screen reader would see), rather than a CSS class or id.
    // This tends to be more stable, since developers can change styling
    // classes without breaking the accessible role/label.
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign in to dashboard' });

    // The "Sign out" button only appears on the dashboard after a
    // successful login, so we use it as proof of a successful login.
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });

    // A brief success toast/message shown right after a successful login
    // (e.g. "Login successful"). This usually disappears after a few
    // seconds, so tests need to check it quickly, before it's gone.
    this.successMessage = page.getByText('Login successful');
  }

  /**
   * Returns the locator for the password visibility toggle button.
   * The accessible name of this button changes depending on state:
   * "Show password" when the password is currently hidden,
   * "Hide password" when the password is currently visible.
   * Because of this, we can't store it as a single fixed locator in the
   * constructor — it needs to be requested by name at the time it's used.
   */
  passwordToggleButton(label: 'Show password' | 'Hide password'): Locator {
    return this.page.getByRole('button', { name: label });
  }

  /**
   * Navigates to the login page.
   * Since baseURL is set in the config, only the relative path is needed.
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Fills in email + password and clicks the login button.
   * This is a reusable method so tests don't repeat the same three lines
   * over and over.
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /**
   * Returns a locator for an error message, given its exact text.
   * AssetIQ shows different messages in different cases
   * (e.g. "Incorrect password" vs "Enter a valid email address"),
   * so this method is generic and takes the text as a parameter.
   *
   * getByText is used here (instead of getByRole) because the underlying
   * HTML element type (div/span/p) for these error messages wasn't clear
   * from the codegen recording, but the exact text is known.
   */
  errorMessage(text: string): Locator {
    return this.page.getByText(text);
  }
}