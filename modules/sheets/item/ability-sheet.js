import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class AbilitySheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "ability"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-ability-sheet.html";
  }
}
