import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ItemattachmentSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "itemattachment"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-itemattachment-sheet.html";
  }
}
