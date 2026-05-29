import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";

/**
 * DataModel for the `background` item type. It composes the shared core and
 * basic item fields plus the background category.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class BackgroundData extends BaseItemData {
  static defineSchema() {
    const { StringField } = foundry.data.fields;
    return {
      ...core(),
      ...basic(),
      type: new StringField({ initial: "culture" }),
    };
  }
}
