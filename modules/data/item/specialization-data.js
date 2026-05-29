import { BaseItemData } from "./base-item-data.js";
import { core } from "../shared/item-core.js";

function talentsInitial() {
  const talents = {};
  for (let index = 0; index < 20; index += 1) {
    talents[`talent${index}`] = {};
  }
  return talents;
}

function careerSkillsInitial() {
  const skills = {};
  for (let index = 0; index < 5; index += 1) {
    skills[`careerSkill${index}`] = "(none)";
  }
  return skills;
}

/**
 * DataModel for the `specialization` item type. The talent grid is deliberately
 * free-form because each slot can hold varied embedded talent data.
 *
 * Phase 5 is schema-only (ADR-010): no prepare hooks here, so legacy ItemFFG
 * preparation runs unchanged.
 */
export class SpecializationData extends BaseItemData {
  static defineSchema() {
    const { ObjectField, BooleanField } = foundry.data.fields;
    return {
      ...core(),
      talents: new ObjectField({ initial: talentsInitial() }),
      careerSkills: new ObjectField({ initial: careerSkillsInitial() }),
      universal: new BooleanField({ initial: false }),
    };
  }
}
