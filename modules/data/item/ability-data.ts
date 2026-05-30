import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

/**
 * DataModel for the `ability` item type. Ability is a core-only descriptive
 * item with no additional persisted fields.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class AbilityData extends BaseItemData {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {
      ...core(),
    };
  }
}
