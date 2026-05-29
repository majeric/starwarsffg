import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

/**
 * DataModel for the `species` item type. Species carries free-form embedded
 * talents, abilities, species metadata, and starting XP on top of core fields.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class SpeciesData extends BaseItemData {
  static defineSchema() {
    const { NumberField, ObjectField } = foundry.data.fields;
    return {
      ...core(),
      talents: new ObjectField(),
      abilities: new ObjectField(),
      species: new ObjectField(),
      startingXP: new NumberField({ initial: 0 }),
    };
  }
}
