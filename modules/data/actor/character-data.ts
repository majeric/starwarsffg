import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";
import { statsSchema } from "../shared/actor-stats.js";
import { characteristicsSchema } from "../shared/characteristics.js";
import { skillsSchema } from "../shared/skills.js";
import { speciesField } from "../shared/actor-species.js";
import { general } from "../shared/actor-general.js";
import { careerField } from "../shared/actor-career.js";
import { specialisationField } from "../shared/actor-specialisation.js";

/**
 * DataModel for the `character` actor type — the most-coupled humanoid. Adds the
 * player-character meta fields (obligation/duty/morality/conflict point pools,
 * experience) and a TOP-LEVEL `encumbrance` that is DISTINCT from
 * `stats.encumbrance`; both exist in template.json, so both are declared and
 * must not be merged. Schema-only per ADR-010.
 */
export class CharacterData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { SchemaField, NumberField } = foundry.data.fields;
    const pointPool = () => new SchemaField({ value: new NumberField({ initial: 0 }) });
    return {
      ...biography(),
      ...speciesField(),
      ...careerField(),
      ...specialisationField(),
      ...statsSchema({ strain: true }),
      ...characteristicsSchema(),
      ...skillsSchema(),
      ...general(),
      ...metaOnly(),
      encumbrance: new SchemaField({
        value: new NumberField({ initial: 0 }),
        adjusted: new NumberField({ initial: 0 }), // TODO Phase 6
      }),
      obligation: pointPool(),
      duty: pointPool(),
      morality: pointPool(),
      conflict: pointPool(),
      experience: new SchemaField({
        total: new NumberField({ initial: 0 }),
        available: new NumberField({ initial: 0 }),
      }),
    };
  }
}
