import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ObligationSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "obligation"] as any,
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-obligation-sheet.html";
  }
}
