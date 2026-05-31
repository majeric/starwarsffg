import { test, expect } from "@playwright/test";
import { Actors, Items } from "../playwright/fixtures.js";

test.beforeEach(async ({ page }) => {
  await page.goto("/game/");
  await expect(page.getByText("Loading")).toBeVisible();
  await expect(page.getByText("Loading")).not.toBeVisible();
});

test.describe("actor creation smoke", () => {
  test("character sheet renders correctly", async ({ page }) => {
    const actor = new Actors(page, "smoke-character", "character");
    await actor.create();

    await expect(actor.sheetLocator.locator(".profile-img")).toBeVisible();
    await expect(actor.tabGear).toBeVisible();
    await expect(actor.tabCharacteristics).toBeVisible();
    await expect(actor.tabTalents).toBeVisible();
    await expect(actor.tabCrits).toBeVisible();
    await expect(actor.tabInfo).toBeVisible();
    await expect(actor.tabBio).toBeVisible();

    await actor.remove();
  });

  test("vehicle sheet renders correctly", async ({ page }) => {
    const actor = new Actors(page, "smoke-vehicle", "vehicle");
    await actor.create();

    await expect(actor.sheetLocator.locator(".profile-img")).toBeVisible();
    await expect(actor.tabWeapons).toBeVisible();
    await expect(actor.tabCrew).toBeVisible();
    await expect(actor.tabCharacteristics).toBeVisible();

    await actor.remove();
  });
});

test.describe("item creation smoke", () => {
  test("ability sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-ability", "ability");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await expect(item.sheetLocator.locator('input.charname[value="smoke-ability"]')).toBeVisible();
    await item.remove();
  });

  test("armour sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-armour", "armour");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await expect(item.tabModifiers).toBeVisible();
    await item.remove();
  });

  test("career sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-career", "career");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("critical damage sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-critdamage", "criticaldamage");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("critical injury sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-critinjury", "criticalinjury");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("force power sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-forcepower", "forcepower");
    await item.create();
    await expect(item.sheetLocator).toContainText("Basic Power");
    await item.remove();
  });

  test("gear sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-gear", "gear");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("item attachment sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-attachment", "itemattachment");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("item modifier sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-modifier", "itemmodifier");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("talent sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-talent", "talent");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("ship attachment sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-shipattachment", "shipattachment");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("ship weapon sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-shipweapon", "shipweapon");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("homestead upgrade sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-homesteadupgrade", "homesteadupgrade");
    await item.create();
    await expect(item.sheetLocator.locator(".profile-img")).toBeVisible();
    await item.remove();
  });

  test("signature ability sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-sigability", "signatureability");
    await item.create();
    await expect(item.sheetLocator).toContainText("Base Ability");
    await item.remove();
  });

  test("specialization sheet renders", async ({ page }) => {
    const item = new Items(page, "smoke-spec", "specialization");
    await item.create();
    await expect(item.sheetLocator).toBeVisible();
    await item.remove();
  });
});
