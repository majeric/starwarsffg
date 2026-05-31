import { ActorSheetFFG } from "../../actors/actor-sheet-ffg.js";

/**
 * Sheet for the rival actor type. Full humanoid minus strain.
 * Species, general features, characteristics, skills.
 */
export class RivalSheet extends ActorSheetFFG {
  /** @override */
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "rival"] as any,
      width: 710,
      height: 650,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" },
      ],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  /** @override */
  get template() {
    return "systems/starwarsffg/templates/actors/ffg-rival-sheet.html";
  }
}
