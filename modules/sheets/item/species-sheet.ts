import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class SpeciesSheet extends ItemSheetFFG {
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions(): any {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "species"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-species-sheet.html";
  }
}
