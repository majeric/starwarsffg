import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";
import { statsSchema } from "../shared/actor-stats.js";
import { characteristicsSchema } from "../shared/characteristics.js";
import { skillsSchema } from "../shared/skills.js";
import { speciesField } from "../shared/actor-species.js";
import { general } from "../shared/actor-general.js";

/**
 * DataModel for the `rival` actor type. Templates: biography, species,
 * characteristics, skills, attributes, general, meta_only. Unlike minion and
 * nemesis, rival inlines a stats block WITHOUT `strain`, so it passes
 * `statsSchema({ strain: false })`. Schema-only per ADR-010.
 */
export class RivalData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {
      ...biography(),
      ...speciesField(),
      ...statsSchema({ strain: false }),
      ...characteristicsSchema(),
      ...skillsSchema(),
      ...general(),
      ...metaOnly(),
    };
  }
}
