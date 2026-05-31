import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class SpecializationSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "specialization"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-specialization-sheet.html";
  }
}
