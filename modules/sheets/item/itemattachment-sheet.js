import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ItemattachmentSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "itemattachment"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-itemattachment-sheet.html";
  }
}
