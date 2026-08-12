import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Run tests one by one while debugging
  fullyParallel: false,
  workers: 1,

  // HTML report
  reporter: 'html',

  // Test timeout
  timeout: 60000,

  // Assertion timeout
  expect: {
    timeout: 15000,
  },

  use: {
    baseURL: 'http://192.168.10.63:4030',

    // Show browser
    headless: false,

    // Slow down browser actions
    launchOptions: {
      slowMo: 500,
    },

    // Capture useful evidence
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    actionTimeout: 17000,
    navigationTimeout: 150000,
  },

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