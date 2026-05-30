import { describe, it, expect } from "vitest";
import { TalentData } from "../../../modules/data/item/talent-data.js";

describe("TalentData schema", () => {
  const schema = TalentData.defineSchema();

  it("composes core item fields plus talent-specific fields", () => {
    expect(Object.keys(schema).sort()).toEqual([
      "activation",
      "description",
      "isConflictTalent",
      "isForceTalent",
      "longDesc",
      "metadata",
      "ranks",
      "tier",
      "trees",
    ]);
  });

  it("defaults activation, ranks, and tier from template.json", () => {
    expect(schema.activation.getInitial()).toEqual({ value: "Passive" });
    expect(schema.ranks.getInitial()).toEqual({ ranked: false, current: 1, min: 0 });
    expect(schema.tier.getInitial()).toBe(1);
  });

  it("defaults flags, tree list, and long description", () => {
    expect(schema.isForceTalent.getInitial()).toBe(false);
    expect(schema.isConflictTalent.getInitial()).toBe(false);
    expect(schema.trees.getInitial()).toEqual([]);
    expect(schema.longDesc.getInitial()).toBe("");
  });
});
