import { ItemSheetFFG } from "../../items/item-sheet-ffg.js";

export class ShipweaponSheet extends ItemSheetFFG {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2", "shipweapon"],
    });
  }

  get template() {
    return "systems/starwarsffg/templates/items/ffg-shipweapon-sheet.html";
  }
}
