import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ShipattachmentSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "shipattachment"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-shipattachment-sheet.html";
  }
}
