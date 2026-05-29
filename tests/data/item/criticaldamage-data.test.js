import { describe, it, expect } from "vitest";
import { CriticalDamageData } from "../../../modules/data/item/criticaldamage-data.js";

describe("CriticalDamageData schema", () => {
  const schema = CriticalDamageData.defineSchema();

  it("composes core item fields plus the critical damage fields", () => {
    expect(Object.keys(schema).sort()).toEqual(["attributes", "description", "max", "metadata", "min", "severity"]);
  });

  it("defaults the roll range to zero and severity to one", () => {
    expect(schema.min.getInitial()).toBe(0);
    expect(schema.max.getInitial()).toBe(0);
    expect(schema.severity.getInitial()).toBe(1);
  });

  it("starts the core item fields empty", () => {
    expect(schema.description.getInitial()).toBe("");
    expect(schema.attributes.getInitial()).toEqual({});
    expect(schema.metadata.getInitial()).toEqual({ tags: [], sources: [] });
  });
});
