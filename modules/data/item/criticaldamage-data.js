import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

/**
 * DataModel for the `criticaldamage` item type. Mirrors template.json's core
 * item fields plus the d100 roll range and severity.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class CriticalDamageData extends BaseItemData {
  static defineSchema() {
    const { NumberField } = foundry.data.fields;
    return {
      ...core(),
      min: new NumberField({ initial: 0 }),
      max: new NumberField({ initial: 0 }),
      severity: new NumberField({ initial: 1 }),
    };
  }
}
