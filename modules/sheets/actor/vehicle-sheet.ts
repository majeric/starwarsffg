import { ActorSheetFFG } from "../../actors/actor-sheet-ffg.js";

/**
 * Sheet for the vehicle actor type. Unique stats (hull trauma, system strain,
 * shields, crew management) with no skills or characteristics.
 */
export class VehicleSheet extends ActorSheetFFG {
  /** @override */
  // FIXME(types): fvtt-types tuple width mismatch on classes array
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "v2", "vehicle"] as any,
      width: 710,
      height: 650,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" },
      ],
    });
  }

  /** @override */
  get template() {
    return "systems/starwarsffg/templates/actors/ffg-vehicle-sheet.html";
  }
}
