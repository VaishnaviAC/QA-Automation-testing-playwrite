import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * In Cypress, you likely wrote cy.visit() inside beforeEach.
 * In Playwright, test.beforeEach does the same job — it runs before every
 * test in this file, so each test starts fresh and independently.
 */
test.describe('AssetIQ - Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC_LOGIN_001: Login page loads with all key elements visible', async () => {
    // toBeVisible() is similar to Cypress's should('be.visible'), but
    // Playwright automatically waits a few seconds for the element to
    // appear (auto-waiting) — no need for a separate cy.wait().
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('TC_LOGIN_002: Valid credentials log in successfully', async ({ page }) => {
    await loginPage.login('admin@accurateic.in', '1234');

    // A URL assertion can be added here later once the exact post-login
    // URL is confirmed, e.g.:
    // await expect(page).toHaveURL(/\/dashboard/);
    //
    // For now, the "Sign out" button is the most reliable proof that
    // login succeeded and the dashboard loaded.
    await expect(loginPage.signOutButton).toBeVisible();
  });

  test('TC_LOGIN_003: Invalid password shows error and stays on login page', async ({ page }) => {
    await loginPage.login('admin@accurateic.in', 'wrong@123');

    await expect(loginPage.errorMessage('Incorrect password')).toBeVisible();

    // Confirming the user is still on the login page —
    // the dashboard's "Sign out" button should NOT be visible
    await expect(loginPage.signOutButton).not.toBeVisible();
  });

  test('TC_LOGIN_004: Invalid email format shows validation error', async () => {
    await loginPage.login('abcde', '12345');

    await expect(loginPage.errorMessage('Enter a valid email address')).toBeVisible();
  });

  test('TC_LOGIN_005: Empty submit does not log the user in', async ({ page }) => {
    // Submitting directly with both fields left empty
    await loginPage.signInButton.click();

    // The codegen recording didn't capture any new visible error text on
    // empty submit, so this is the safest, universally-true assertion:
    // the user is still on the login page (did not reach the dashboard).
    // This will pass whether it's native HTML5 validation, a custom error,
    // or the button simply being inactive.
    await expect(loginPage.signOutButton).not.toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();

    // Note: if you find out the exact error message shown here
    // (e.g. "Email is required"), let me know and this test can be
    // made more specific.
  });

  test('TC_LOGIN_006: Password field visibility can be toggled', async () => {
    await loginPage.passwordInput.fill('12345');

    // By default, a password field's "type" attribute is "password",
    // which is what makes the browser mask the characters with dots.
    // toHaveAttribute() checks the actual HTML attribute value —
    // a more reliable check than just looking at the button's label.
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Click "Show password" — this should reveal the plain text
    await loginPage.passwordToggleButton('Show password').click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    // Click "Hide password" — this should mask it again
    await loginPage.passwordToggleButton('Hide password').click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});