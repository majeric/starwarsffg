import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class MotivationSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "motivation"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-motivation-sheet.html";
  }
}
