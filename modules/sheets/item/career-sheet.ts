import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class CareerSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "career"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-career-sheet.html";
  }
}
