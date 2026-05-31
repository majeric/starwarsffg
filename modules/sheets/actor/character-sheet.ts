import { ActorSheetFFG } from "../../actors/actor-sheet-ffg.js";

/**
 * Sheet for the character (PC) actor type. The most complex actor:
 * XP, obligation/duty/morality, specializations, force powers,
 * career skills, and the full stat block.
 */
export class CharacterSheet extends ActorSheetFFG {
  /** @override */
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "character"] as any,
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
    return "systems/starwarsffg/templates/actors/ffg-character-sheet.html";
  }
}
