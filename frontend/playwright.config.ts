// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

// Read environment variables from file.
// require('dotenv').config();

export default defineConfig({
  testDir: './tests', // Directory where tests reside
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail build on CI if test.only is left in code
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: process.env.CI ? 1 : undefined, // Opt out of parallel tests on CI? Adjust as needed.
  reporter: 'html', // Reporter to use. See https://playwright.dev/docs/test-reporters
  use: {
    baseURL: 'http://localhost:5173', // Base URL for the dev server
    trace: 'on-first-retry', // Collect trace when retrying the failed test
  },
  projects: [ // Configure projects for major browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // (Optional) Add Firefox and WebKit if needed later
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // (Optional) Configure web server if needed, but we run it separately
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
