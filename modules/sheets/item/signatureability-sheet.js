import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class SignatureabilitySheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "signatureability"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-signatureability-sheet.html";
  }
}
