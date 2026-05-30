import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class SpecializationSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "specialization"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-specialization-sheet.html";
  }
}
