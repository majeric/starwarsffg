import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";
import { statsSchema } from "../shared/actor-stats.js";
import { characteristicsSchema } from "../shared/characteristics.js";
import { skillsSchema } from "../shared/skills.js";

/**
 * DataModel for the `minion` actor type (template.json: biography, stats,
 * characteristics, skills, attributes, meta_only plus `quantity` and
 * `unit_wounds`).
 *
 * Schema-only per ADR-010: the legacy minion preparation (group wound
 * threshold, surviving-minion count, group-skill ranks) stays on ActorFFG
 * until Phase 6. Minions use the full stats template, so `strain` is included.
 */
export class MinionData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { SchemaField, NumberField } = foundry.data.fields;
    return {
      ...biography(),
      ...statsSchema({ strain: true }),
      ...characteristicsSchema(),
      ...skillsSchema(),
      ...metaOnly(),
      quantity: new SchemaField({
        value: new NumberField({ initial: 1 }),
        max: new NumberField({ initial: 1 }),
      }),
      unit_wounds: new SchemaField({
        value: new NumberField({ initial: 0 }),
      }),
    };
  }
}
