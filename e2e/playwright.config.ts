import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  // Run all specs serially with a single worker. The entire e2e suite shares
  // one long-lived in-memory server (no DB isolation between tests), so
  // parallel workers race on the shared note list and cause flaky ordering /
  // pagination assertions.
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // start:prod (root) builds the SPA then boots Express serving web/dist.
    // RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS are forwarded so the e2e suite
    // can run with a tighter window (e.g. RATE_LIMIT_MAX=5 RATE_LIMIT_WINDOW_MS=3000)
    // without affecting the default production values.
    command: 'npm run start:prod --prefix ..',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Use a tight window for e2e so the rate-limit spec runs quickly and the
      // window resets before other specs are affected.  Override via env var if
      // the production defaults are needed.
      // 15 req / 3 s: low enough that the rate-limit spec only needs 16 sequential
      // API calls to trip the limit — well within the 3-second window even on a
      // slow CI runner (~30 ms/req × 16 = ~480 ms, far below the 3 s budget).
      // High enough that browser-driven UI tests (which are inherently slow — each
      // user action waits for rendering) will not approach 15 API calls within any
      // 3-second slice.  With the original 100 req / 3 s budget, 101 sequential
      // requests could straddle the window boundary on a loaded runner and
      // cause flaky 2xx instead of 429.
      // Override via env vars when needed.
      RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ?? '15',
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ?? '3000',
    },
  },
});
