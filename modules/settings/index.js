import { registerCompendiumSettings } from "./compendiums.js";
import { registerCombatSettings } from "./combat.js";
import { registerCharacterSettings } from "./character.js";
import { registerSimulationSettings } from "./simulation.js";
import { registerSkillListSettings } from "./skill-list.js";
import { registerDebugSettings } from "./debug.js";

/**
 * Central entry point for setting registrations extracted out of
 * swffg-main.js by Phase 2 of the restructure.
 *
 * Pre-existing setting registrations in settings-helpers.js, ui-settings.js,
 * and crew-settings.js are NOT routed through this module yet — that
 * consolidation is a Phase 2 follow-up. See docs/restructure/phases/
 * phase-02-settings.md "Out of scope" for the open issue.
 *
 * @param {Object} [callbacks] hook functions registered settings need but
 *   can't import (e.g., functions defined in swffg-main.js scope that
 *   cannot reasonably move with the setting).
 */
export function registerAllSettings(callbacks = {}) {
  void callbacks;
  registerCompendiumSettings();
  registerCombatSettings();
  registerCharacterSettings();
  registerSimulationSettings();
  registerSkillListSettings();
  registerDebugSettings();
}
