import { describe, it, expect } from "vitest";
import { CriticalInjuryData } from "../../../modules/data/item/criticalinjury-data.js";

describe("CriticalInjuryData schema", () => {
  const schema = CriticalInjuryData.defineSchema();

  it("composes core item fields plus the critical injury fields", () => {
    expect(Object.keys(schema).sort()).toEqual(["description", "max", "metadata", "min", "severity"]);
  });

  it("defaults the roll range to zero and severity to one", () => {
    expect(schema.min.getInitial()).toBe(0);
    expect(schema.max.getInitial()).toBe(0);
    expect(schema.severity.getInitial()).toBe(1);
  });

  it("starts the core item fields empty", () => {
    expect(schema.description.getInitial()).toBe("");
    expect(schema.metadata.getInitial()).toEqual({ tags: [], sources: [] });
  });
});
