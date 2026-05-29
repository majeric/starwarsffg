import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

function careerSkillsInitial() {
  const skills = {};
  for (let index = 0; index < 8; index += 1) {
    skills[`careerSkill${index}`] = "(none)";
  }
  return skills;
}

/**
 * DataModel for the `career` item type. Career stores free-form specialization
 * and signature ability maps plus eight positional career skill slots.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class CareerData extends BaseItemData {
  static defineSchema() {
    const { ObjectField } = foundry.data.fields;
    return {
      ...core(),
      specializations: new ObjectField(),
      signatureabilities: new ObjectField(),
      careerSkills: new ObjectField({ initial: careerSkillsInitial() }),
    };
  }
}
