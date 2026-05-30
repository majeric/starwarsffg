import {
  register_dice_enricher,
  register_oggdude_tag_enricher,
  register_roll_tag_enricher,
} from "../helpers/journal.js";
import { register_system_tours } from "../helpers/tours.js";

/**
 * Register the Foundry "setup" hook. Extracted from swffg-main.js by
 * Phase 3.2. Adds dice-symbol rendering enrichers to the text editor
 * (so journal pages and chat messages can render FFG dice glyphs) and
 * registers the system's interactive tour entries.
 */
export function registerSetupHook(): void {
  Hooks.on("setup", function () {
    register_roll_tag_enricher();
    register_oggdude_tag_enricher();
    register_dice_enricher();
    register_system_tours();
  });
}
