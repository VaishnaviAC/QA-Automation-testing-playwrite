import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration
 * See https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  // Test files location
  testDir: './tests',

  // Run tests sequentially while debugging
  fullyParallel: false,

  // Fail if test.only() is accidentally left in the code
  /*forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Use only 1 worker while debugging
  workers: 1,*/

  // HTML report
  reporter: 'html',

  // Overall timeout for a single test
  timeout: 60000,

  // Timeout for expect() assertions
  expect: {
    timeout: 15000,
  },

  // Common settings for all browsers
  use: {
    // Application URL
    baseURL: 'http://192.168.10.63:4030',

    // Show browser
    headless: false,

    // Slow down each action by 1 second
    launchOptions: {
      slowMo: 1000,
    },

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Timeout for actions like click(), fill(), etc.
    actionTimeout: 15000,

    // Timeout for page navigation
    navigationTimeout: 120000,
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
  ],
});