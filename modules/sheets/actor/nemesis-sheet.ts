import { ActorSheetFFG } from "../../actors/actor-sheet-ffg.js";

/**
 * Sheet for the nemesis actor type. Full humanoid with strain —
 * the canonical "boss" NPC type.
 */
export class NemesisSheet extends ActorSheetFFG {
  /** @override */
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "nemesis"],
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
    return "systems/starwarsffg/templates/actors/ffg-nemesis-sheet.html";
  }
}
