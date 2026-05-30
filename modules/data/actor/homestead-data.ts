import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";

/**
 * DataModel for the `homestead` actor type. Mirrors the template.json homestead
 * shape: the shared biography/attributes/metadata fragments plus `cost` and
 * `consumables`.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so the legacy
 * ActorFFG preparation runs unchanged. `cost.adjusted` stays in the persisted
 * schema until Phase 6 moves derived values to a separate namespace.
 */
export class HomesteadData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { SchemaField, NumberField, StringField } = foundry.data.fields;
    return {
      ...biography(),
      ...metaOnly(),
      cost: new SchemaField({
        value: new NumberField({ initial: 0 }),
        // TODO Phase 6: move to derived namespace
        adjusted: new NumberField({ initial: 0 }),
      }),
      consumables: new SchemaField({
        value: new NumberField({ initial: 1 }),
        duration: new StringField({ initial: "months" }),
      }),
    };
  }
}
