import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // Auth setup — runs first, saves session state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main browser tests using stored auth (exclude login tests)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: /login\.spec/,
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: /login\.spec/,
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: /login\.spec/,
    },
    // Login tests run LAST — they revoke the stored session via session hardening
    {
      name: 'login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /login\.spec/,
      dependencies: ['chromium', 'firefox', 'webkit'],
    },
  ],
  webServer: {
    command: 'PORT=4100 npm run dev',
    url: 'http://127.0.0.1:4100/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
