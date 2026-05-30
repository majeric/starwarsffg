import { describe, it, expect } from "vitest";
import { HomesteadData } from "../../../modules/data/actor/homestead-data.js";

describe("HomesteadData schema", () => {
  const schema = HomesteadData.defineSchema();

  it("composes exactly the homestead fields with no legacy type/label hint keys", () => {
    expect(Object.keys(schema).sort()).toEqual(["biography", "consumables", "cost", "metadata"]);
  });

  it("defaults cost to zero and reserves an adjusted field for Phase 6", () => {
    expect(schema.cost.getInitial()).toEqual({ value: 0, adjusted: 0 });
  });

  it("defaults consumables to one month", () => {
    expect(schema.consumables.getInitial()).toEqual({ value: 1, duration: "months" });
  });

  it("starts metadata with empty tag and source lists", () => {
    expect(schema.metadata.getInitial()).toEqual({ tags: [], sources: [] });
  });

  it("starts biography empty", () => {
    expect(schema.biography.getInitial()).toBe("");
  });
});
