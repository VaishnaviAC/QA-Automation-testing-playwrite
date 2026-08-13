import { test as setup, expect } from '@playwright/test';
import { loginCredentials } from '../test-data/assetsData';

/**
 * Path where the authenticated browser session (cookies/localStorage) is
 * saved after a successful login. Every subsequent test project loads this
 * file via `storageState` instead of performing the login UI flow again.
 *
 * IMPORTANT: add `playwright/.auth/` to your .gitignore — this file
 * contains a live session and should never be committed.
 */
const authFile = 'playwright/.auth/user.json';

/**
 * Runs once (as its own Playwright "setup" project — see playwright.config.ts)
 * before any real test project executes. Performs the login UI flow exactly
 * one time for the whole test run, then persists the resulting session.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(loginCredentials.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(loginCredentials.password);
  await page.getByRole('button', { name: 'Sign in to dashboard' }).click();

  // Wait for a reliable signal that login succeeded (Dashboard content
  // visible) instead of a hard-coded wait/timeout.
  await expect(page.getByRole('link', { name: 'Assets' })).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: authFile });
});