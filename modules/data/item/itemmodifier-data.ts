import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";
import { qualities } from "../shared/item-qualities.js";

/**
 * DataModel for the `itemmodifier` item type. Modifier payloads stay free-form
 * until the Phase 7 Active Effect migration.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class ItemModifierData extends BaseItemData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { StringField, NumberField } = foundry.data.fields;
    return {
      ...core(),
      ...qualities(),
      type: new StringField({ initial: "all" }),
      rank: new NumberField({ initial: 0 }),
    };
  }
}
