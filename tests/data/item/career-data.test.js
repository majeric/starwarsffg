import { describe, it, expect } from "vitest";
import { CareerData } from "../../../modules/data/item/career-data.js";

describe("CareerData schema", () => {
  const schema = CareerData.defineSchema();

  it("composes core item fields plus career maps and skill slots", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "careerSkills",
      "description",
      "metadata",
      "signatureabilities",
      "specializations",
    ]);
  });

  it("keeps specializations and signature abilities as free-form maps", () => {
    expect(schema.specializations.getInitial()).toEqual({});
    expect(schema.signatureabilities.getInitial()).toEqual({});
  });

  it("defaults all eight career skill slots to none", () => {
    expect(schema.careerSkills.getInitial()).toEqual({
      careerSkill0: "(none)",
      careerSkill1: "(none)",
      careerSkill2: "(none)",
      careerSkill3: "(none)",
      careerSkill4: "(none)",
      careerSkill5: "(none)",
      careerSkill6: "(none)",
      careerSkill7: "(none)",
    });
  });
});
