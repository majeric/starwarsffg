// @ts-nocheck -- FIXME(types): strict null checks for Foundry runtime globals; type during dedicated strict pass
/**
 * Register simulation and dice-display settings extracted from
 * swffg-main.js by Phase 2.5. These are the settings the dice helpers
 * use when rendering chat output and when running the monte-carlo
 * simulation tool.
 *
 * The `additionalStatuses` setting is still stored as a JSON-encoded
 * string and read via `$.parseJSON` at the call site (legacy upstream
 * behavior). Converting it to a typed Object setting is deferred to a
 * later task alongside the same change for `arraySkillList`.
 */
export function registerSimulationSettings(): void {
  game.settings.register("starwarsffg", "additionalStatuses", {
    name: game.i18n.localize("SWFFG.Settings.AdditionalStatuses.Name"),
    hint: game.i18n.localize("SWFFG.Settings.AdditionalStatuses.Hint"),
    scope: "world",
    config: false,
    default: "[]",
    type: String,
    onChange: () => window.location.reload(),
  });

  game.settings.register("starwarsffg", "useDefense", {
    name: game.i18n.localize("SWFFG.Settings.UseDefense.Name"),
    hint: game.i18n.localize("SWFFG.Settings.UseDefense.Hint"),
    scope: "client",
    config: false,
    default: true,
    type: Boolean,
  });

  game.settings.register("starwarsffg", "displaySimulation", {
    name: game.i18n.localize("SWFFG.Settings.Simulate.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Simulate.Hint"),
    scope: "world",
    config: false,
    default: "GM",
    type: String,
    choices: {
      GM: "GM Only",
      All: "All Players",
      None: "None",
    },
  });

  game.settings.register("starwarsffg", "rollSimulation", {
    name: game.i18n.localize("SWFFG.Settings.SimulateCount.Name"),
    hint: game.i18n.localize("SWFFG.Settings.SimulateCount.Hint"),
    scope: "world",
    config: false,
    default: 10000,
    type: Number,
  });
}
