import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class CriticaldamageSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "criticaldamage"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-criticaldamage-sheet.html";
  }
}
