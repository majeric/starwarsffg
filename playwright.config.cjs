const { defineConfig, devices } = require("@playwright/test");

const foundryBaseUrl = (process.env.FOUNDRY_BASE_URL ?? "http://localhost:30001").replace(/\/+$/, "");
const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE ?? "playwright/.auth/foundry.json";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./e2e",
  globalSetup: require.resolve("./playwright/setup.cjs"),
  /* Run tests in files in parallel */
  fullyParallel: false, // TODO: investigate if we can figure out a way to do this
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: foundryBaseUrl,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    storageState: storageStatePath,
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          width: 1440,
          height: 900,
        },
        launchOptions: {
          // force GPU acceleration
          args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=gl-egl"],
        },
      },
    },
    // TODO: re-enable all browsers
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],
  // custom stuff added here
  expect: {
    timeout: 5_000,
  },
});
