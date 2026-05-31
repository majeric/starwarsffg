import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class GearSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "gear"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-gear-sheet.html";
  }
}
