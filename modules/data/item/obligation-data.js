import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { basic } from "../shared/item-basic.js";

/**
 * DataModel for the `obligation` item type. It composes the shared core and
 * basic item fields plus obligation category, magnitude, and subtype.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class ObligationData extends BaseItemData {
  static defineSchema() {
    const { NumberField, StringField } = foundry.data.fields;
    return {
      ...core(),
      ...basic(),
      type: new StringField({ initial: "duty" }),
      magnitude: new NumberField({ initial: 0 }),
      subtype: new StringField(),
    };
  }
}
