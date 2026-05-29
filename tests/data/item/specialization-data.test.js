import { describe, it, expect } from "vitest";
import { SpecializationData } from "../../../modules/data/item/specialization-data.js";

function numberedTalentDefaults() {
  const talents = {};
  for (let index = 0; index < 20; index += 1) {
    talents[`talent${index}`] = {};
  }
  return talents;
}

describe("SpecializationData schema", () => {
  const schema = SpecializationData.defineSchema();

  it("composes core item fields plus specialization fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "attributes",
      "careerSkills",
      "description",
      "metadata",
      "talents",
      "universal",
    ]);
  });

  it("defaults the twenty talent-grid slots to free-form objects", () => {
    expect(schema.talents.getInitial()).toEqual(numberedTalentDefaults());
  });

  it("defaults the five career skill slots to none", () => {
    expect(schema.careerSkills.getInitial()).toEqual({
      careerSkill0: "(none)",
      careerSkill1: "(none)",
      careerSkill2: "(none)",
      careerSkill3: "(none)",
      careerSkill4: "(none)",
    });
  });

  it("defaults universal specializations to false", () => {
    expect(schema.universal.getInitial()).toBe(false);
  });
});
