const { mkdir } = require("node:fs/promises");
const { dirname } = require("node:path");

const { chromium, expect } = require("@playwright/test");

const DEFAULT_FOUNDRY_BASE_URL = "http://localhost:30001";
const DEFAULT_STORAGE_STATE = "playwright/.auth/foundry.json";

function normalizeBaseUrl(baseUrl) {
  return (baseUrl ?? DEFAULT_FOUNDRY_BASE_URL).replace(/\/+$/, "");
}

function getStorageStatePath(config) {
  const configuredStorageState = config.projects[0]?.use.storageState;

  if (typeof configuredStorageState === "string") {
    return configuredStorageState;
  }

  return DEFAULT_STORAGE_STATE;
}

async function globalSetup(config) {
  // TODO: this should probably be done before each test instead of globally
  // this will allow us to use specific accounts for each test, and in turn run tests in parallel
  const baseUrl = normalizeBaseUrl(config.projects[0]?.use.baseURL);
  const storageStatePath = getStorageStatePath(config);
  const foundryUser = process.env.FOUNDRY_TEST_USER ?? "Gamemaster";
  const foundryPassword = process.env.FOUNDRY_TEST_PASSWORD;

  await mkdir(dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/join`);
    await page.getByRole("combobox").selectOption(foundryUser);

    if (foundryPassword) {
      const passwordInput = page.locator('input[type="password"]').first();

      if (await passwordInput.isVisible()) {
        await passwordInput.fill(foundryPassword);
      }
    }

    await page.getByRole("button", { name: "Join Game" }).click();
    await expect(page.getByRole("textbox", { name: "Chat" })).toBeVisible();

    await page.context().storageState({ path: storageStatePath });
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;
