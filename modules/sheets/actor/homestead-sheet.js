import { ActorSheetFFG } from "../../actors/actor-sheet-ffg.js";

/**
 * Sheet for the homestead actor type — the simplest actor. No skills,
 * characteristics, or combat stats. Phase 8 starts here because there is
 * almost no type-specific logic to extract.
 *
 * Inherits from the existing monolith ActorSheetFFG during the transition
 * period; a future task extracts shared logic into a proper BaseActorSheet
 * and re-parents all per-type sheets.
 */
export class HomesteadSheet extends ActorSheetFFG {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "homestead"],
      width: 710,
      height: 650,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" },
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/starwarsffg/templates/actors/ffg-homestead-sheet.html";
  }
}
