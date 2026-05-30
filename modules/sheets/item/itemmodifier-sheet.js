import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ItemmodifierSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "itemmodifier"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-itemmodifier-sheet.html";
  }
}
