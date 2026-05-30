import { BaseActorData } from "./base-actor-data.js";
import { biography } from "../shared/actor-biography.js";
import { metaOnly } from "../shared/actor-meta.js";
import { statsSchema } from "../shared/actor-stats.js";
import { characteristicsSchema } from "../shared/characteristics.js";
import { skillsSchema } from "../shared/skills.js";
import { speciesField } from "../shared/actor-species.js";
import { general } from "../shared/actor-general.js";

/**
 * DataModel for the `nemesis` actor type — the canonical "full humanoid":
 * biography, species, stats (with strain), characteristics, skills, attributes,
 * general, meta_only, and no per-type fields. Schema-only per ADR-010.
 */
export class NemesisData extends BaseActorData {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {
      ...biography(),
      ...speciesField(),
      ...statsSchema({ strain: true }),
      ...characteristicsSchema(),
      ...skillsSchema(),
      ...general(),
      ...metaOnly(),
    };
  }
}
