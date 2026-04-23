import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3100)
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  maxFailures: process.env.CI ? 10 : 0,
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
      ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera', 'notifications'],
        },
      },
    },
  ],
  webServer: {
    command: `npx next dev --turbo -p ${PORT}`,
    url: BASE_URL,
    cwd: '..',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
