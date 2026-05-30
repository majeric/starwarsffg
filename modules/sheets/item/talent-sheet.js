import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class TalentSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "talent"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-talent-sheet.html";
  }
}
