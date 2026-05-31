import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ForcepowerSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "forcepower"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-forcepower-sheet.html";
  }
}
