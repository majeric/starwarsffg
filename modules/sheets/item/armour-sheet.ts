import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ArmourSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "armour"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-armour-sheet.html";
  }
}
