import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class BackgroundSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "background"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-background-sheet.html";
  }
}
