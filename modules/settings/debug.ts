import SettingsHelpers from "./settings-helpers.js";

/**
 * Register the debug-logging world setting. Extracted from swffg-main.js
 * by Phase 2.8.
 *
 * The original used `this.debouncedReload` resolved from the init hook's
 * `this` binding. Replacing with `SettingsHelpers.debouncedReload` keeps
 * the debounce behavior and matches the pattern other settings already
 * use (e.g., the skill-list onChange callbacks).
 */
export function registerDebugSettings(): void {
  game.settings.register("starwarsffg", "enableDebug", {
    name: game.i18n.localize("SWFFG.EnableDebug"),
    hint: game.i18n.localize("SWFFG.EnableDebugHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: SettingsHelpers.debouncedReload,
  });
}
