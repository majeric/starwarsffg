import { describe, it, expect } from "vitest";
import { AbilityData } from "../../../modules/data/item/ability-data.js";

describe("AbilityData schema", () => {
  const schema = AbilityData.defineSchema();

  it("is a core-only item schema", () => {
    expect(Object.keys(schema).sort()).toEqual(["description", "metadata"]);
  });

  it("starts the core item fields empty", () => {
    expect(schema.description.getInitial()).toBe("");
    expect(schema.metadata.getInitial()).toEqual({ tags: [], sources: [] });
  });
});
