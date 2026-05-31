import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ItemmodifierSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "itemmodifier"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-itemmodifier-sheet.html";
  }
}
