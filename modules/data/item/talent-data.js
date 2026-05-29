import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

/**
 * DataModel for the `talent` item type. Talent aggregation and activation-label
 * derivation remain in the legacy ItemFFG/ActorFFG preparation code for Phase 5.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class TalentData extends BaseItemData {
  static defineSchema() {
    const { SchemaField, StringField, NumberField, BooleanField, HTMLField, ArrayField } = foundry.data.fields;
    return {
      ...core(),
      activation: new SchemaField({
        value: new StringField({ initial: "Passive" }),
      }),
      ranks: new SchemaField({
        ranked: new BooleanField({ initial: false }),
        current: new NumberField({ initial: 1 }),
        min: new NumberField({ initial: 0 }),
      }),
      isForceTalent: new BooleanField({ initial: false }),
      isConflictTalent: new BooleanField({ initial: false }),
      tier: new NumberField({ initial: 1 }),
      trees: new ArrayField(new StringField()),
      longDesc: new HTMLField(),
    };
  }
}
