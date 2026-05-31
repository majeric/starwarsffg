import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class BackgroundSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "background"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-background-sheet.html";
  }
}
