// @ts-nocheck -- FIXME(types): strict null checks for Foundry runtime globals; type during dedicated strict pass
/**
 * Register combat-related world settings. Extracted from swffg-main.js by
 * Phase 2.3.
 *
 * The `setFFGInitiative` helper is exported because the original
 * `initiativeRule` onChange callback (and an initial-formula call at
 * registration time) depend on it; the helper writes to Foundry's
 * `CONFIG.Combat.initiative` and triggers a re-render of the group
 * manager window if it is open.
 *
 * The READS of these settings stay in swffg-main.js (e.g., the
 * `useGenericSlots` check that gates registering the FFG combat tracker
 * classes). Only the registrations move.
 */

const INITIATIVE_FORMULAS: Record<string, string> = {
  v: "Vigilance",
  c: "Cool",
};

export function setFFGInitiative(initMethod: string): void {
  const formula = INITIATIVE_FORMULAS[initMethod];
  CONFIG.Combat.initiative = { formula, decimals: 2 };
  if (canvas?.groupmanager?.window) {
    canvas.groupmanager.window.render(true);
  }
}

export function registerCombatSettings(): void {
  game.settings.register("starwarsffg", "configuredTurnMarker", {
    name: "configuredTurnMarker",
    hint: "configuredTurnMarker",
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
  });

  game.settings.register("starwarsffg", "useGenericSlots", {
    name: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Name"),
    hint: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Hint"),
    scope: "world",
    config: false,
    default: true,
    type: Boolean,
    onChange: () => window.location.reload(),
  });

  game.settings.register("starwarsffg", "removeCombatantAction", {
    name: game.i18n.localize("SWFFG.Settings.RemoveCombatantAction.Name"),
    hint: game.i18n.localize("SWFFG.Settings.RemoveCombatantAction.Hint"),
    scope: "world",
    config: false,
    default: "combatant_only",
    type: String,
    choices: {
      combatant_only: "Combatant Only",
      last_slot: "Last Slot",
      prompt: "Prompt",
    },
  });

  game.settings.register("starwarsffg", "initiativeRule", {
    name: game.i18n.localize("SWFFG.InitiativeMode"),
    hint: game.i18n.localize("SWFFG.InitiativeModeHint"),
    scope: "world",
    config: false,
    default: "v",
    type: String,
    choices: {
      v: game.i18n.localize("SWFFG.SkillsNameVigilance"),
      c: game.i18n.localize("SWFFG.SkillsNameCool"),
    },
    onChange: (rule) => setFFGInitiative(rule),
  });

  setFFGInitiative(game.settings.get("starwarsffg", "initiativeRule") as unknown as string);
}
